"""SOURCE-ONLY proposal. Pure identity validation; no OS access or signals.

Inputs must come from the real finite owner and fresh bounded OS reads. Synthetic
fixtures do not establish any identity of an actual running process.
"""
from __future__ import annotations
from dataclasses import dataclass
import math
from typing import Mapping

PROTECTED_PORTS = (4312, 4313, 4314, 4315, 4316)
OWNED_PORTS = (4301, 9711)
NOTE_LIMIT = 16
# Explicit fail-closed proposal caps; never truncate identity strings or rows.
MAX_MEMBERS = 256
MAX_COMMAND_CHARS = 65536
MAX_STARTED_CHARS = 256


class AnchorRejected(ValueError):
    def __init__(self, reason, evidence):
        self.reason = reason
        self.evidence = evidence
        super().__init__(reason)


@dataclass(frozen=True)
class Identity:
    pid: int
    pgid: int
    started: str
    command: str


@dataclass(frozen=True)
class ProtectedIdentity:
    pid: int
    started: str
    command: str


@dataclass(frozen=True)
class LaunchFacts:
    """Facts from the actual unreaped Popen object and exact launch invocation.

    alive_before_read/after_read mean proc.poll() is None at those checkpoints.
    expected_command is the predeclared FULL ps command string for the exact
    argv, not a substring inferred from whichever row happens to be observed.
    """
    popen_pid: int
    start_new_session: bool
    expected_command: str
    alive_before_read: bool
    alive_after_read: bool
    owned_ports: tuple = OWNED_PORTS


@dataclass(frozen=True)
class ReadWindow:
    started: float
    finished: float
    now: float
    deadline: float
    os_seconds: float = 2.0
    maximum_age_seconds: float = 2.0


@dataclass(frozen=True)
class Change:
    kind: str
    pid: int
    before: Identity | None
    current: Identity | None


@dataclass(frozen=True)
class OwnedState:
    original_leader: Identity
    # ONLY the most recent successful current read. Exited members do not remain
    # eligible to anchor a later group. The original leader is separately kept.
    members: tuple
    protected_reference: tuple
    observation_number: int
    last_read_started: float
    last_read_finished: float
    change_count: int = 0
    change_notes: tuple = ()
    group_absent: bool = False


@dataclass(frozen=True)
class Observation:
    state: OwnedState
    anchor_kind: str
    anchor_identity: Identity | None
    current_members: tuple
    read_started: float
    read_finished: float
    checked_at: float
    deadline: float
    maximum_age_seconds: float

    @property
    def group_absent(self):
        return not self.current_members


def identity_evidence(value):
    if value is None:
        return None
    out = {'pid': value.pid, 'started': value.started, 'command': value.command}
    if isinstance(value, Identity):
        out['pgid'] = value.pgid
    return out


def state_evidence(state):
    if state is None:
        return None
    return {
        'originalLeader': identity_evidence(state.original_leader),
        'previousMembers': [identity_evidence(row) for row in state.members],
        'observationNumber': state.observation_number,
        'previousGroupAbsent': state.group_absent,
        'previousReadStarted': state.last_read_started,
        'previousReadFinished': state.last_read_finished,
    }


def _reject(reason, previous, current, **extra):
    # Rows are detached immutable values. Full before/current PID/start/command
    # evidence is retained, including the offending leader if one is present.
    raise AnchorRejected(reason, {
        'previous': state_evidence(previous),
        'currentMembers': [identity_evidence(row) for row in current],
        **extra,
    })


def _identity_valid(row, protected=False):
    wanted = ProtectedIdentity if protected else Identity
    return (isinstance(row, wanted)
        and type(row.pid) is int and row.pid > 0
        and (protected or (type(row.pgid) is int and row.pgid > 0))
        and isinstance(row.started, str) and 0 < len(row.started) <= MAX_STARTED_CHARS
        and isinstance(row.command, str) and 0 < len(row.command) <= MAX_COMMAND_CHARS)


def _protected(snapshot):
    if not isinstance(snapshot, Mapping) or set(snapshot) != set(PROTECTED_PORTS):
        raise AnchorRejected('protected_port_set_differs', {'expectedPorts': list(PROTECTED_PORTS)})
    result = []
    for port in PROTECTED_PORTS:
        rows = tuple(snapshot[port])
        if (not rows or len(rows) > MAX_MEMBERS
            or any(not _identity_valid(row, protected=True) for row in rows)
            or len({row.pid for row in rows}) != len(rows)):
            raise AnchorRejected('protected_full_identity_required', {'port': port})
        result.append((port, tuple(sorted(rows, key=lambda row: row.pid))))
    return tuple(result)


def validate_protected_snapshot(reference, observed):
    """Retain the full port/PID/start/command check; returns detached reference.

    Required at bootstrap against the pinned root authority and again after
    cleanup, as in the existing finite owner. This helper itself performs no read.
    """
    before, now = _protected(reference), _protected(observed)
    if before != now:
        raise AnchorRejected('protected_identity_changed', {
            'before': {port: [identity_evidence(row) for row in rows] for port, rows in before},
            'current': {port: [identity_evidence(row) for row in rows] for port, rows in now},
        })
    return before


def _fresh(read, previous, current):
    values = (read.started, read.finished, read.now, read.deadline,
        read.os_seconds, read.maximum_age_seconds)
    if not all(type(value) in (int, float) and math.isfinite(value) for value in values):
        _reject('finite_read_window_required', previous, current)
    if (read.os_seconds <= 0 or read.os_seconds > 2
        or read.maximum_age_seconds <= 0 or read.maximum_age_seconds > 2
        or not read.started <= read.finished <= read.now < read.deadline
        or read.finished - read.started > read.os_seconds
        or read.now - read.finished > read.maximum_age_seconds):
        _reject('fresh_bounded_read_required', previous, current,
            readWindow={key: getattr(read, key) for key in ReadWindow.__dataclass_fields__})


def observe_owned_group(previous, current, *, launch, read,
        protected_reference, protected_current=None):
    """Validate a fresh group anchor BEFORE accepting updated child snapshots.

    current is the COMPLETE non-zombie group read for actual Popen pid=pgid.
    Bootstrap additionally requires live-before/live-after real Popen facts and
    exact expected full command. Once initialized, the original leader is
    immutable. If present, its mismatch fails even if another member matches.
    If absent, one member from the immediately previous successful observation
    must match exactly BEFORE current replaces those snapshots.

    No process/clock/port reads, launches, sleeps, retries, mutation or signals.
    """
    if not isinstance(current, Mapping) or len(current) > MAX_MEMBERS:
        raise AnchorRejected('complete_bounded_group_required', {'maximumMembers': MAX_MEMBERS})
    unsorted_rows = tuple(current.values())
    if (any(not _identity_valid(row) for row in unsorted_rows)
        or any(type(pid) is not int or pid != row.pid for pid, row in current.items())):
        raise AnchorRejected('full_group_identity_required', {})
    rows = tuple(current[pid] for pid in sorted(current))
    _fresh(read, previous, rows)
    if previous is not None and (read.started < previous.last_read_finished
        or read.finished <= previous.last_read_finished):
        _reject('new_nonoverlapping_read_required', previous, rows,
            readStarted=read.started, readFinished=read.finished)
    if (type(launch.popen_pid) is not int or launch.popen_pid <= 0
        or launch.start_new_session is not True or launch.owned_ports != OWNED_PORTS
        or not isinstance(launch.expected_command, str)
        or not 0 < len(launch.expected_command) <= MAX_COMMAND_CHARS):
        _reject('exact_actual_launch_contract_required', previous, rows)
    if any(row.pgid != launch.popen_pid for row in rows):
        _reject('current_row_outside_owned_group', previous, rows,
            expectedPgid=launch.popen_pid)
    protected = _protected(protected_reference)
    if protected_current is not None:
        protected = validate_protected_snapshot(protected_reference, protected_current)
    protected_pids = {row.pid for _, members in protected for row in members}
    overlap = sorted(protected_pids.intersection(current))
    if overlap:
        _reject('owned_group_intersects_protected_pids', previous, rows,
            protectedPids=overlap)

    if previous is None:
        if protected_current is None:
            _reject('bootstrap_full_protected_check_required', previous, rows)
        leader = current.get(launch.popen_pid)
        if (launch.alive_before_read is not True or launch.alive_after_read is not True
            or leader is None or leader.command != launch.expected_command):
            _reject('bootstrap_exact_live_popen_leader_required', previous, rows,
                expectedLeader={'pid': launch.popen_pid, 'pgid': launch.popen_pid,
                    'command': launch.expected_command},
                actualLeader=identity_evidence(leader),
                liveBeforeRead=launch.alive_before_read, liveAfterRead=launch.alive_after_read)
        state = OwnedState(leader, rows, protected, 1, read.started, read.finished)
        return Observation(state, 'original-leader/bootstrap', leader, rows,
            read.started, read.finished, read.now, read.deadline, read.maximum_age_seconds)

    if (previous.original_leader.pid != launch.popen_pid
        or previous.original_leader.pgid != launch.popen_pid
        or previous.original_leader.command != launch.expected_command
        or previous.protected_reference != protected):
        _reject('owner_launch_or_protected_reference_changed', previous, rows,
            actualLaunch={'pid': launch.popen_pid, 'command': launch.expected_command})
    if previous.group_absent and rows:
        _reject('owned_group_reappeared_after_verified_absence', previous, rows)

    if not rows:
        state = OwnedState(previous.original_leader, (), protected,
            previous.observation_number + 1, read.started, read.finished, previous.change_count,
            previous.change_notes, True)
        return Observation(state, 'absent/non-signallable', None, (),
            read.started, read.finished, read.now, read.deadline, read.maximum_age_seconds)

    leader = current.get(launch.popen_pid)
    if leader is not None:
        if leader != previous.original_leader:
            _reject('original_leader_identity_changed', previous, rows,
                originalLeader=identity_evidence(previous.original_leader),
                currentLeader=identity_evidence(leader))
        anchor, kind = leader, 'original-leader/exact'
    else:
        # Critical order: use ONLY previous snapshots. Never update first.
        matches = [row for row in previous.members if current.get(row.pid) == row]
        if not matches:
            _reject('no_exact_previously_observed_survivor', previous, rows)
        anchor, kind = min(matches, key=lambda row: row.pid), 'previous-survivor/exact'

    before = {row.pid: row for row in previous.members}
    notes = list(previous.change_notes)
    change_count = previous.change_count
    for pid in sorted(set(before).union(current)):
        if pid == previous.original_leader.pid:
            continue
        old, new = before.get(pid), current.get(pid)
        if old != new:
            change_count += 1
            if len(notes) < NOTE_LIMIT:
                notes.append(Change('added' if old is None else 'removed' if new is None else 'changed',
                    pid, old, new))
    state = OwnedState(previous.original_leader, rows, protected,
        previous.observation_number + 1, read.started, read.finished, change_count, tuple(notes), False)
    return Observation(state, kind, anchor, rows,
        read.started, read.finished, read.now, read.deadline, read.maximum_age_seconds)


def authorize_group_signal(observation, *, now, deadline, last_signalled_observation_number):
    """Pure final freshness check immediately before caller's group signal.

    Caller MUST supply a new group read/observation for EACH TERM or KILL. No
    cached periodic observation or prior TERM observation may authorize KILL.
    Caller must persist the returned observation number after each actual signal.
    This function cannot prove the origin of caller-supplied OS/Popen facts.
    """
    if (observation.group_absent or observation.anchor_identity is None
        or observation.anchor_kind == 'absent/non-signallable'):
        raise AnchorRejected('absent_group_cannot_authorize_signal', {})
    if (type(last_signalled_observation_number) is not int
        or last_signalled_observation_number < 0
        or observation.state.observation_number <= last_signalled_observation_number):
        raise AnchorRejected('new_observation_required_for_each_signal', {
            'observationNumber': observation.state.observation_number,
            'lastSignalledObservationNumber': last_signalled_observation_number,
        })
    if (type(now) not in (int, float) or not math.isfinite(now)
        or type(deadline) not in (int, float) or not math.isfinite(deadline)
        or not observation.checked_at <= now < min(deadline, observation.deadline)
        or now - observation.read_finished > observation.maximum_age_seconds):
        raise AnchorRejected('fresh_anchor_required_before_signal', {
            'anchor': identity_evidence(observation.anchor_identity),
            'readFinished': observation.read_finished, 'signalCheckNow': now,
            'observationDeadline': observation.deadline, 'signalDeadline': deadline,
        })
    return {
        'pgid': observation.state.original_leader.pgid,
        'anchorKind': observation.anchor_kind,
        'anchorIdentity': identity_evidence(observation.anchor_identity),
        'observationNumber': observation.state.observation_number,
        'readStarted': observation.read_started,
        'readFinished': observation.read_finished,
        'checkedAt': now,
        'verifiedMembers': [identity_evidence(row) for row in observation.current_members],
    }


def observation_record(observation):
    """Detached JSON-compatible scalar/identity telemetry; maximum16notes."""
    state = observation.state
    return {
        'originalLeader': identity_evidence(state.original_leader),
        'anchorKind': observation.anchor_kind,
        'anchorIdentity': identity_evidence(observation.anchor_identity),
        'currentIdentities': [identity_evidence(row) for row in observation.current_members],
        'groupAbsent': observation.group_absent,
        'observationNumber': state.observation_number,
        'readStarted': observation.read_started,
        'readFinished': observation.read_finished,
        'checkedAt': observation.checked_at,
        'childChangeCount': state.change_count,
        'childChangeNotes': [{'kind': note.kind, 'pid': note.pid,
            'before': identity_evidence(note.before), 'current': identity_evidence(note.current)}
            for note in state.change_notes],
        'childChangeNotesTruncated': state.change_count > len(state.change_notes),
    }
