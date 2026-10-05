"""Meaningful SOURCE-ONLY synthetic fixtures. NOT EXECUTED or syntax checked.

No actual OS observations, processes, ports, time, sleeps or signals are used.
"""
from dataclasses import replace
import unittest

from owned_group_anchor import (AnchorRejected, Identity, LaunchFacts,
    MAX_MEMBERS, NOTE_LIMIT, OwnedState, ProtectedIdentity, ReadWindow,
    authorize_group_signal, observation_record, observe_owned_group, validate_protected_snapshot)

GROUP = 34930
COMMAND = '/opt/homebrew/bin/node /private/tmp/new-owner/native.mjs --run=true --url=http://127.0.0.1:4301/?diagnostics --out=/private/tmp/new-owner/candidate-first'
LEADER = Identity(GROUP, GROUP, 'Mon Oct 5 12:00:00 2026', COMMAND)
CHILD_A = Identity(34931, GROUP, 'Mon Oct 5 12:00:01 2026', '/Applications/Chrome.app/Contents/MacOS/Chrome --type=renderer --startup')
CHILD_B = Identity(34932, GROUP, 'Mon Oct 5 12:00:01 2026', '/Applications/Chrome.app/Contents/MacOS/Chrome --type=gpu-process')
LAUNCH = LaunchFacts(GROUP, True, COMMAND, True, True)
PROTECTED = {
    4312: (ProtectedIdentity(92445, 'Sun Oct 4 10:00:00 2026', '/opt/homebrew/bin/node /protected/a/vite'),),
    4313: (ProtectedIdentity(58298, 'Sun Oct 4 11:00:00 2026', '/opt/homebrew/bin/node /protected/b/vite'),),
    4314: (ProtectedIdentity(51358, 'Sun Oct 4 12:00:00 2026', '/opt/homebrew/bin/node /protected/c/vite'),),
    4315: (ProtectedIdentity(87796, 'Sun Oct 4 13:00:00 2026', '/opt/homebrew/bin/node /protected/d/vite'),),
    4316: (ProtectedIdentity(38617, 'Mon Oct 5 17:35:46 2026', '/fixture/python -m http.server 4316 --bind 127.0.0.1 --directory /protected/latest/dist'),),
}


def rows(*values):
    return {row.pid: row for row in values}


def window(t=10):
    return ReadWindow(t, t + .1, t + .2, 653)


def observe(previous, current, *, launch=LAUNCH, read=None, protected=PROTECTED):
    return observe_owned_group(previous, current, launch=launch,
        read=window(10 if previous is None else previous.last_read_finished + .1) if read is None else read,
        protected_reference=protected,
        protected_current=protected if previous is None else None)


class OwnedGroupAnchorFixtures(unittest.TestCase):
    def bootstrap(self, *children):
        return observe(None, rows(LEADER, *children)).state

    def rejected(self, reason, call):
        with self.assertRaises(AnchorRejected) as caught:
            call()
        self.assertEqual(caught.exception.reason, reason)
        return caught.exception.evidence

    def test_bootstrap_binds_actual_live_popen_and_exact_full_command(self):
        observation = observe(None, rows(LEADER, CHILD_A))
        self.assertEqual(observation.state.original_leader, LEADER)
        self.assertEqual(observation.anchor_kind, 'original-leader/bootstrap')
        self.assertEqual(observation.state.change_notes, ())
        for launch in (replace(LAUNCH, alive_before_read=False),
                replace(LAUNCH, alive_after_read=False), replace(LAUNCH, start_new_session=False)):
            reason = 'exact_actual_launch_contract_required' if not launch.start_new_session else 'bootstrap_exact_live_popen_leader_required'
            self.rejected(reason, lambda launch=launch: observe(None, rows(LEADER), launch=launch))

    def test_bootstrap_rejects_missing_leader_and_substring_command_match(self):
        self.rejected('bootstrap_exact_live_popen_leader_required', lambda: observe(None, rows(CHILD_A)))
        alien = replace(LEADER, command=COMMAND + ' --different-launch')
        evidence = self.rejected('bootstrap_exact_live_popen_leader_required', lambda: observe(None, rows(alien)))
        self.assertEqual(evidence['actualLeader']['command'], alien.command)
        self.assertEqual(evidence['expectedLeader']['command'], COMMAND)

    def test_leader_anchor_allows_child_argv_update_with_old_current_evidence(self):
        state = self.bootstrap(CHILD_A, CHILD_B)
        changed = replace(CHILD_A, command='/Applications/Chrome.app/Contents/MacOS/Chrome --type=renderer --running')
        current = rows(LEADER, changed, CHILD_B)
        observation = observe(state, current)
        self.assertEqual(observation.anchor_kind, 'original-leader/exact')
        self.assertEqual(observation.state.original_leader, state.original_leader)
        self.assertEqual(observation.state.change_notes[0].before, CHILD_A)
        self.assertEqual(observation.state.change_notes[0].current, changed)
        self.assertEqual({row.pid: row for row in observation.state.members}, current)
        self.assertEqual({row.pid: row for row in state.members}[CHILD_A.pid], CHILD_A)

    def test_changed_original_leader_fails_even_with_an_exact_survivor(self):
        state = self.bootstrap(CHILD_A)
        for changed in (replace(LEADER, command=COMMAND + ' --changed'),
                replace(LEADER, started='Mon Oct 5 12:01:00 2026')):
            evidence = self.rejected('original_leader_identity_changed',
                lambda changed=changed: observe(state, rows(changed, CHILD_A)))
            self.assertEqual(evidence['originalLeader'], {'pid': GROUP, 'pgid': GROUP, 'started': LEADER.started, 'command': COMMAND})
            self.assertEqual(evidence['currentLeader']['command'], changed.command)
            self.assertEqual(evidence['currentLeader']['started'], changed.started)

    def test_absent_leader_requires_previous_survivor_before_child_updates(self):
        state = self.bootstrap(CHILD_A, CHILD_B)
        changed = replace(CHILD_B, command=CHILD_B.command + ' --new-state')
        added = Identity(34933, GROUP, 'Mon Oct 5 12:00:02 2026', '/Chrome --type=utility')
        observation = observe(state, rows(CHILD_A, changed, added))
        self.assertEqual(observation.anchor_kind, 'previous-survivor/exact')
        self.assertEqual(observation.anchor_identity, CHILD_A)
        next_observation = observe(observation.state, rows(changed, added))
        self.assertEqual(next_observation.anchor_identity, changed)

    def test_no_refresh_then_anchor_when_all_survivors_change(self):
        state = self.bootstrap(CHILD_A, CHILD_B)
        changed_a = replace(CHILD_A, command=CHILD_A.command + ' --changed')
        changed_b = replace(CHILD_B, command=CHILD_B.command + ' --changed')
        evidence = self.rejected('no_exact_previously_observed_survivor',
            lambda: observe(state, rows(changed_a, changed_b)))
        self.assertEqual(evidence['previous']['previousMembers'][1]['command'], CHILD_A.command)
        self.assertEqual(evidence['currentMembers'][0]['command'], changed_a.command)
        self.assertEqual(state.change_count, 0)
        self.assertEqual(state.change_notes, ())

    def test_pid_reuse_and_new_group_members_do_not_anchor_absent_leader(self):
        state = self.bootstrap(CHILD_A)
        reused = replace(CHILD_A, started='Mon Oct 5 12:02:00 2026')
        self.rejected('no_exact_previously_observed_survivor', lambda: observe(state, rows(reused)))
        new = Identity(35001, GROUP, 'Mon Oct 5 12:02:00 2026', CHILD_A.command)
        self.rejected('no_exact_previously_observed_survivor', lambda: observe(state, rows(new)))

    def test_removed_members_are_not_retained_as_future_anchors(self):
        state = self.bootstrap(CHILD_A, CHILD_B)
        only_b = observe(state, rows(LEADER, CHILD_B)).state
        self.assertNotIn(CHILD_A, only_b.members)
        self.rejected('no_exact_previously_observed_survivor', lambda: observe(only_b, rows(CHILD_A)))

    def test_empty_group_is_non_signallable_absence_and_reappearance_fails(self):
        state = self.bootstrap(CHILD_A)
        absent = observe(state, {})
        self.assertTrue(absent.group_absent)
        self.assertTrue(absent.state.group_absent)
        self.assertEqual(absent.state.members, ())
        self.assertEqual(absent.state.original_leader, LEADER)
        self.rejected('absent_group_cannot_authorize_signal',
            lambda: authorize_group_signal(absent, now=10.3, deadline=653,
                last_signalled_observation_number=0))
        self.rejected('owned_group_reappeared_after_verified_absence',
            lambda: observe(absent.state, rows(CHILD_A)))

    def test_child_telemetry_is_bounded16_and_current_snapshot_stays_latest(self):
        state = self.bootstrap(CHILD_A)
        for i in range(20):
            current_child = replace(CHILD_A, command=CHILD_A.command + ' --generation=' + str(i))
            state = observe(state, rows(LEADER, current_child), read=window(11 + i)).state
        self.assertEqual(state.change_count, 20)
        self.assertEqual(len(state.change_notes), NOTE_LIMIT)
        self.assertEqual(state.members[-1], current_child)
        self.assertEqual(state.change_notes[-1].current.command, CHILD_A.command + ' --generation=15')

    def test_input_mapping_mutation_cannot_mutate_accepted_snapshot(self):
        mapping = rows(LEADER, CHILD_A)
        observation = observe(None, mapping)
        mapping.clear()
        self.assertEqual(observation.current_members, (LEADER, CHILD_A))
        self.assertEqual(observation.state.members, (LEADER, CHILD_A))

    def test_group_scope_protected_overlap_and_exact_protected_cmd_checks(self):
        state = self.bootstrap(CHILD_A)
        outsider = replace(CHILD_A, pgid=GROUP + 1)
        self.rejected('current_row_outside_owned_group', lambda: observe(state, rows(LEADER, outsider)))
        protected_child = Identity(92445, GROUP, 'Sun Oct 4 10:00:00 2026', '/protected/a/vite')
        self.rejected('owned_group_intersects_protected_pids', lambda: observe(state, rows(LEADER, protected_child)))
        for changed_row in (
                replace(PROTECTED[4312][0], command=PROTECTED[4312][0].command + ' --changed'),
                replace(PROTECTED[4312][0], started='Sun Oct 4 10:01:00 2026'),
                replace(PROTECTED[4312][0], pid=99900)):
            changed = dict(PROTECTED)
            changed[4312] = (changed_row,)
            evidence = self.rejected('protected_identity_changed',
                lambda: validate_protected_snapshot(PROTECTED, changed))
            self.assertEqual(evidence['before'][4312][0]['pid'], 92445)
            self.assertNotEqual(evidence['before'][4312][0], evidence['current'][4312][0])
        self.rejected('exact_actual_launch_contract_required',
            lambda: observe(state, rows(LEADER), launch=replace(LAUNCH, owned_ports=(4301, 9712))))
        latest_preview = Identity(38617, GROUP, PROTECTED[4316][0].started, PROTECTED[4316][0].command)
        self.rejected('owned_group_intersects_protected_pids',
            lambda: observe(state, rows(LEADER, latest_preview)))
        missing_latest = {port: identity for port, identity in PROTECTED.items() if port != 4316}
        self.rejected('protected_port_set_differs',
            lambda: validate_protected_snapshot(PROTECTED, missing_latest))

    def test_read_deadline_age_and_os_budget_must_be_finite(self):
        state = self.bootstrap(CHILD_A)
        for read in (ReadWindow(10, 10.1, 653, 653),
                ReadWindow(10, 10.1, 12.2, 653), ReadWindow(10, 12.1, 12.2, 653),
                ReadWindow(10.2, 10.1, 10.3, 653)):
            self.rejected('fresh_bounded_read_required', lambda read=read: observe(state, rows(LEADER), read=read))
        self.rejected('finite_read_window_required',
            lambda: observe(state, rows(LEADER), read=ReadWindow(10, 10.1, float('nan'), 653)))

    def test_signal_requires_fresh_anchored_read_inside_deadline(self):
        state = self.bootstrap(CHILD_A)
        observation = observe(state, rows(LEADER, CHILD_A))
        permission = authorize_group_signal(observation, now=10.5, deadline=653,
            last_signalled_observation_number=0)
        self.assertEqual(permission['pgid'], GROUP)
        self.assertEqual(permission['anchorIdentity']['command'], COMMAND)
        self.rejected('fresh_anchor_required_before_signal',
            lambda: authorize_group_signal(observation, now=12.4, deadline=653,
                last_signalled_observation_number=0))
        self.rejected('fresh_anchor_required_before_signal',
            lambda: authorize_group_signal(observation, now=10.5, deadline=10.5,
                last_signalled_observation_number=0))
        self.rejected('new_observation_required_for_each_signal',
            lambda: authorize_group_signal(observation, now=10.6, deadline=653,
                last_signalled_observation_number=permission['observationNumber']))
        fresh_observation = observe(observation.state, rows(LEADER, CHILD_A), read=window(10.7))
        next_permission = authorize_group_signal(fresh_observation, now=11.0, deadline=653,
            last_signalled_observation_number=permission['observationNumber'])
        self.assertGreater(next_permission['observationNumber'], permission['observationNumber'])

    def test_survivor_only_signal_requires_real_prior_exact_match(self):
        state = self.bootstrap(CHILD_A)
        observation = observe(state, rows(CHILD_A))
        permission = authorize_group_signal(observation, now=10.5, deadline=653,
            last_signalled_observation_number=0)
        self.assertEqual(permission['anchorKind'], 'previous-survivor/exact')
        self.assertEqual(permission['anchorIdentity']['pid'], CHILD_A.pid)

    def test_complete_group_cap_rejects_without_truncation(self):
        many = rows(LEADER, *(Identity(40000 + i, GROUP, CHILD_A.started, CHILD_A.command)
            for i in range(MAX_MEMBERS)))
        self.rejected('complete_bounded_group_required', lambda: observe(None, many))

    def test_bad_mapping_keys_fail_with_structured_reason_before_sorting(self):
        malformed = {GROUP: LEADER, str(CHILD_A.pid): CHILD_A}
        self.rejected('full_group_identity_required', lambda: observe(None, malformed))

    def test_replayed_read_cannot_manufacture_new_observation_number(self):
        state = self.bootstrap(CHILD_A)
        self.rejected('new_nonoverlapping_read_required',
            lambda: observe(state, rows(LEADER, CHILD_A), read=window(10)))

    def test_signal_time_must_follow_completed_anchor_check(self):
        state = self.bootstrap(CHILD_A)
        observation = observe(state, rows(LEADER, CHILD_A))
        self.rejected('fresh_anchor_required_before_signal',
            lambda: authorize_group_signal(observation, now=observation.read_finished,
                deadline=653, last_signalled_observation_number=0))

    def test_record_is_detached_json_compatible_identity_evidence(self):
        state = self.bootstrap(CHILD_A)
        changed = replace(CHILD_A, command=CHILD_A.command + ' --running')
        observation = observe(state, rows(LEADER, changed))
        record = observation_record(observation)
        self.assertEqual(record['childChangeNotes'][0]['before']['command'], CHILD_A.command)
        self.assertEqual(record['childChangeNotes'][0]['current']['command'], changed.command)
        record['currentIdentities'][0]['command'] = 'edited-output-only'
        record['childChangeNotes'].clear()
        self.assertEqual(observation.state.original_leader.command, COMMAND)
        self.assertEqual(len(observation.state.change_notes), 1)


if __name__ == '__main__':
    unittest.main()
