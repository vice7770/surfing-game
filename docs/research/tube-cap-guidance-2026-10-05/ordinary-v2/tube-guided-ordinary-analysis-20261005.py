#!/usr/bin/env python3
"""Root-run analysis of one terminal guided trial; reads the bounded trace once."""
from pathlib import Path
from collections import Counter, deque
import argparse
import hashlib
import json
import math

DEFAULT = Path('/private/tmp/tube-guided-ordinary-v2-native-20261005')
DT = 1 / 60


def require(value, message):
    if not value:
        raise RuntimeError(message)


def finite(value):
    return isinstance(value, (float, int)) and not isinstance(value, bool) and math.isfinite(value)


def pin(raw, path):
    return {'file': str(path), 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}


def mark(row):
    return {'step': row['step'], 'seaTime': row['seaTime'], 'physicalSeconds': row['physicalSeconds']}


class Runs:
    """Observed sample spans, not an extra physical step of inferred containment."""
    def __init__(self):
        self.samples = 0
        self.count = 0
        self.first = self.loss = self.active = self.longest = None

    def add(self, row, enabled, key=True):
        if self.active and (not enabled or key != self.active['key']):
            self.loss = self.loss or {**mark(row), 'phase': row['ride']['phase'],
                'currentWitnessClass': row.get('witness', {}).get('classification') if row.get('witness') else None,
                'previousRun': self.record(self.active)}
            self.active = None
        if not enabled:
            return
        self.samples += 1
        self.first = self.first or {**mark(row), 'key': key}
        if self.active is None:
            self.count += 1
            self.active = {'key': key, 'first': mark(row), 'last': mark(row), 'samples': 0}
        self.active['last'] = mark(row)
        self.active['samples'] += 1
        if self.longest is None or self.active['samples'] > self.longest['samples']:
            self.longest = dict(self.active)

    @staticmethod
    def record(run):
        return {**run, 'observedSpanSeconds': run['last']['seaTime'] - run['first']['seaTime']}

    def summary(self):
        return {'samples': self.samples, 'runs': self.count, 'first': self.first, 'firstLossOrKeyChange': self.loss,
                'longest': self.record(self.longest) if self.longest else None}


class Ranges:
    def __init__(self):
        self.values = {}

    def add(self, name, value, row):
        if not finite(value):
            return
        record = self.values.setdefault(name, {'samples': 0, 'min': value, 'max': value, 'minStep': row['step'], 'maxStep': row['step']})
        record['samples'] += 1
        for end, compare in [('min', value < record['min']), ('max', value > record['max'])]:
            if compare:
                record[end], record[end + 'Step'] = value, row['step']


def measured(row):
    ride, board = row['ride'], row['boardPose']
    guide = ride.get('tubeApproach')
    values = {'bankRadians': ride.get('bank'), 'balance': ride.get('balance'), 'speed': ride.get('speed'),
              'boardSpeed': ride.get('boardSpeed'), 'interpolationLagSeconds': row['interpolationLag']}
    words = row.get('riderWords', [])
    values['headingRadians'] = words[3] if len(words) > 3 else None  # Published RIDER_SNAPSHOT.heading24 minus21.
    if guide:
        mouth = guide['mouth']
        dx, dz = board[0] - mouth['x'], board[2] - mouth['z']
        values.update(guideDistanceXZ=math.hypot(dx, dz), guideMinimumRouteClearance=guide.get('minimumClearance'),
                      boardShorewardOfGuide=dx * guide['rayX'] + dz * guide['rayZ'], guideUsableHalfWidth=guide.get('usableHalfWidth'),
                      guideAgeSeconds=row['seaTime'] - guide['seaTime'])
    body = ride.get('tubeBody')
    if body:
        require(body['seaTime'] == row['seaTime'] and len(body['renderPoints']) == len(body['partSpheres']) == 7, 'Stale/incomplete detached body')
        points = body['renderPoints'] + body['partSpheres']
        low, high = min(p['y'] - p['radius'] for p in points), max(p['y'] + p['radius'] for p in points)
        values.update(witnessTopAboveBoard=high - board[1], witnessBottomAboveBoard=low - board[1], witnessVerticalExtent=high - low)
    displayed = row['displayedRiderPoints']
    require(len(displayed) == 21, 'Incomplete seven displayed points')
    values['displayedPointTopAboveDisplayedBoard'] = max(displayed[1::3]) - row['displayedBoard']['position'][1]
    witness = row.get('witness')
    if witness:
        require(len(witness['points']) == 14, 'Incomplete independent witness')
        vertical = [c['vertical'] for p in witness['points'] for c in p['candidates'] if c.get('vertical')]
        for name, key in [('candidateFloorGap', 'floorGap'), ('candidateRoofGap', 'roofGap')]:
            if vertical:
                values[name] = min(v[key] for v in vertical)
        near = [p['clearance']['minimumNearCandidateDistance'] - p['radius'] for p in witness['points']
                if p.get('clearance') and finite(p['clearance'].get('minimumNearCandidateDistance'))]
        ordinary = [p['ordinaryWater']['boundBottomGap'] for p in witness['points']
                    if p.get('ordinaryWater') and p['ordinaryWater'].get('available')]
        if near:
            values['minimumNearIndexedSphereGap'] = min(near)
        if ordinary:
            values['ordinaryFootprintBoundBottomGap'] = min(ordinary)
    rendered = row.get('renderedWitness')
    if rendered:
        require(len(rendered['points']) == 14 and rendered['uniqueAdditionalWitnesses'] == 7 and rendered['duplicatedCurrentPartSpheres'] == 7,
                'Unsupported displayed witness contract')
        vertical = [c['vertical'] for p in rendered['points'][:7] for c in p['candidates'] if c.get('vertical')]
        if vertical:
            values['displayed7CandidateFloorGap'] = min(v['floorGap'] for v in vertical)
            values['displayed7CandidateRoofGap'] = min(v['roofGap'] for v in vertical)
    return values


def compact(row, values):
    ride, witness = row['ride'], row.get('witness')
    guide = ride.get('tubeApproach')
    rendered, union = row.get('renderedWitness'), row.get('unionWitness')
    return {**mark(row), 'inputSeaTime': row['inputView']['seaTime'], 'visualPoseTime': row['visualPoseTime'], 'ridePhase': ride['phase'],
            'displayedRiderPhase': row['displayedRiderPhase'],
            'inputPilotPhase': row['inputPilot']['phase'], 'pilotPhase': row['pilot']['phase'],
            'inputCue': row['inputView']['ride']['cue'], 'outputCue': ride['cue'], 'input': row['input'],
            'inputHeadingRadians': row['inputView']['board']['heading'],
            'boardXYZ': row['boardPose'][:3], 'values': values,
            'guide': {'front': guide['frontId'], 'bodyFitsMouth': guide['bodyFitsMouth'], 'bodyInCavity': guide['bodyInCavity']} if guide else None,
            'independentWitness': {'classification': witness['classification'], 'pointsInCavity': witness['pointCountInUnambiguousCavity'],
                'all14Contained': witness['all14ModelWitnessesContained'], 'allSpheresClear': witness['allActualPartSpheresClear'],
                'allLoftParityClear': witness['allPointsLoftParityClear'], 'allWaterClear': witness['allPointsWaterClear'],
                'blockedSphereNames': [p['name'] for p in witness['points'] if p.get('clearance') and p['clearance']['intersectsOrTouches']],
                'waterNotClearNames': [p['name'] for p in witness['points'] if not p['waterClear']]} if witness else None,
            'additionalDisplayed7': {'pairedClassification': rendered['classification'],
                'containedWithDuplicateCurrentSpheres': rendered['all14ModelWitnessesContained'],
                'waterNotClearNames': [p['name'] for p in rendered['points'][:7] if not p['waterClear']]} if rendered else None,
            'union21': {k: union[k] for k in ('classification', 'all21ModelWitnessesContained', 'displayedStanding', 'sameConnectedRun',
                       'all21ActualPartSpheresClear', 'all21WaterClear')} if union else None,
            'wave': {k: ride['wave'].get(k) for k in ('valid', 'faceFraction', 'aheadOfCrest', 'curlSide', 'crestBreaking')},
            'popUpReport': ride.get('popUp'), 'separation': ride.get('separation'), 'sequenceStop': row['sequence'].get('stop')}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--trial', type=Path, default=DEFAULT)
    parser.add_argument('--timeline', action='store_true', help='Include terminal row and the10 preceding steps.')
    args = parser.parse_args()
    w, out = args.trial.resolve(), args.trial.resolve() / 'candidate-first'
    # Owner is final-only. Do not read report/trace until its terminal closure is accepted.
    owner_raw = (w / 'owner.json').read_bytes()
    owner = json.loads(owner_raw)
    require(owner['schema'] == 'guided-ordinary-owner/v2' and owner['complete'] is True and owner['exitCode'] == 0
            and owner['firstFailure'] is None and owner['postExecutionPinsVerified'] is True and owner['protectedPreserved'] is True
            and owner['protectedBefore'] == owner['protectedAfter'] and not owner['cleanupFailures']
            and not owner['ownedMembersAfterCleanup'] and all(owner['closedPorts'].values()), 'Owner not complete/terminal/closed')
    limits = owner['limits']
    require((out / 'report.json').stat().st_size <= limits['reportBytes'], 'Report byte cap')
    report_raw = (out / 'report.json').read_bytes()
    report = json.loads(report_raw)
    require(report['schema'] == 'guided-ordinary-native/v2' and report['complete'] is True and report['firstFailure'] is None
            and report['ownedBrowserClose'] is True and report['sealSha256'] == owner['sealSha256'] and not report['browserErrors']
            and isinstance(report.get('stop'), dict) and report['stop']['step'] == report['stepCount'], 'Result not complete/terminal')
    trace = out / 'steps.ndjson'
    trace_pin = next(p for p in report['artifacts'] if p['file'] == trace.name)
    require(trace.stat().st_size == trace_pin['bytes'] == report['traceBytes'] <= limits['traceBytes'], 'Trace byte cap/count')
    require(0 <= report['stepCount'] <= limits['steps'] <= 1800, 'Step cap')
    counters, events, transitions, ranges = Counter(), {}, [], Ranges()
    classes = {k: Counter() for k in ('current14', 'displayed7WithDuplicateCurrentSpheres', 'union21')}
    input_flags = ('inputGuide', 'inputBodyFitsMouth', 'inputGuideBodyInCavity')
    output_flags = ('outputGuide', 'outputBodyFitsMouth', 'outputGuideBodyInCavity')
    independent_flags = ('independentAll14', 'independentDisplayed7WithCurrentSpheres', 'independentAll21')
    runs = {k: Runs() for k in ('inputCue', 'outputCue', *input_flags, *output_flags, *independent_flags)}
    tail, digest = deque(maxlen=11), hashlib.sha256()
    previous_phase = report['initialBody']['ride']['phase']
    previous_time, rows = report['initialBody']['seaTime'], 0
    for raw in trace.open('rb'):
        digest.update(raw)
        row = json.loads(raw)
        rows += 1
        require(row['step'] == rows and row['inputView']['seaTime'] == previous_time
                and abs(row['seaTime'] - previous_time - DT) < 1e-7 and abs(row['physicalSeconds'] - rows * DT) < 1e-7, 'Trace clock/order')
        previous_time = row['seaTime']
        require(row['input'] == row['requestedInput'] and row['control']['actualInputEqualsPilotOutput'] is True, 'Applied control changed')
        require(finite(row['interpolationLag']) and -1e-7 <= row['interpolationLag'] <= DT + 1e-7
                and abs(row['seaTime'] - row['visualPoseTime'] - row['interpolationLag']) < 1e-7, 'Normal interpolation clock contract')
        ride, before, witness = row['ride'], row['inputView']['ride'], row.get('witness')
        rendered, union = row.get('renderedWitness'), row.get('unionWitness')
        if witness:
            require(rendered is not None and union is not None and union['uniqueWitnessCount'] == 21 and union['currentWitnessCount'] == 14
                    and union['additionalDisplayedPointCount'] == 7 and union['duplicatedCurrentPartSpheresInImplementation'] == 7,
                    'Incomplete union21 witness contract')
        guide, input_guide = ride.get('tubeApproach'), before.get('tubeApproach')
        counters['ridePhase:' + ride['phase']] += 1
        counters['displayedPhase:' + str(row['displayedRiderPhase'])] += 1
        counters['pilotPhase:' + row['pilot']['phase']] += 1
        counters['pilotState:' + row['pilot']['state']] += 1
        if ride['phase'] != previous_phase:
            transitions.append({**mark(row), 'from': previous_phase, 'to': ride['phase']})
            previous_phase = ride['phase']
        flags = {'inputCue': before['cue'] is True, 'outputCue': ride['cue'] is True,
                 'inputGuide': input_guide is not None, 'outputGuide': guide is not None,
                 'inputBodyFitsMouth': bool(input_guide and input_guide['bodyFitsMouth']),
                 'inputGuideBodyInCavity': bool(input_guide and input_guide['bodyInCavity']),
                 'outputBodyFitsMouth': bool(guide and guide['bodyFitsMouth']), 'outputGuideBodyInCavity': bool(guide and guide['bodyInCavity']),
                 'independentAll14': bool(witness and witness['all14ModelWitnessesContained']),
                 'independentDisplayed7WithCurrentSpheres': bool(rendered and rendered['all14ModelWitnessesContained']),
                 'independentAll21': bool(union and union['all21ModelWitnessesContained'])}
        for name, value in flags.items():
            front = input_guide if name in input_flags else guide
            key = front['frontId'] if front and name in input_flags + output_flags else True
            if name in ('independentAll14', 'independentAll21') and value:
                key = witness['component']['front']
            if name == 'independentDisplayed7WithCurrentSpheres' and value:
                key = rendered['component']['front']
            runs[name].add(row, value, key)
        if row['input']['popUp']:
            counters['popUpInputPulses'] += 1
            events.setdefault('firstPopUpInput', {**mark(row), 'inputSeaTime': row['inputView']['seaTime'], 'inputPhase': before['phase'], 'inputCue': before['cue']})
        if ride['phase'] == 'standing':
            events.setdefault('firstStanding', mark(row))
        if ride['phase'] in ('fallen', 'recover') or ride.get('separation'):
            events.setdefault('firstFallOrSeparation', {**mark(row), 'phase': ride['phase'], 'separation': ride.get('separation')})
        if witness:
            classes['current14'][witness['classification']] += 1
            classes['displayed7WithDuplicateCurrentSpheres'][rendered['classification']] += 1
            classes['union21'][union['classification']] += 1
            counters['independentWitnessRows'] += 1
            for key in ('allActualPartSpheresClear', 'allPointsLoftParityClear', 'allPointsWaterClear', 'outsideWaterUnclassified'):
                counters['witness:' + key] += witness[key] is True
            for key in ('displayedStanding', 'sameConnectedRun', 'all21ActualPartSpheresClear', 'all21WaterClear', 'outsideWaterUnclassified'):
                counters['union21:' + key] += union[key] is True
            if guide:
                counters['guideAndWitnessRows'] += 1
                counters['guideInCavityAndIndependentContained'] += guide['bodyInCavity'] and witness['all14ModelWitnessesContained']
                counters['guideInCavityWithoutIndependentContainment'] += guide['bodyInCavity'] and not witness['all14ModelWitnessesContained']
                counters['independentContainedWithoutGuideInCavity'] += witness['all14ModelWitnessesContained'] and not guide['bodyInCavity']
                counters['guideInCavityWithoutUnion21Containment'] += guide['bodyInCavity'] and not union['all21ModelWitnessesContained']
        values = measured(row)
        for key, value in values.items():
            ranges.add(key, value, row)
        tail.append(compact(row, values))
    require(rows == report['stepCount'] and digest.hexdigest() == trace_pin['sha256'], 'Trace SHA/row count mismatch')
    require(previous_time == report['terminalBody']['seaTime'] and report['terminalBody']['step'] == rows, 'Terminal trace/body mismatch')
    sequence = report['sequence']
    summary = {'schema': 'guided-ordinary-trace-analysis/v2', 'complete': True,
        'inputs': [pin(owner_raw, w / 'owner.json'), pin(report_raw, out / 'report.json'), {**trace_pin, 'file': str(trace)}],
        'steps': rows, 'sampledPhysicalSeconds': rows * DT, 'terminal': report['stop'], 'acceptedModelWitnessRide': report['acceptedModelWitnessRide'],
        'counts': dict(counters), 'ridePhaseTransitions': transitions, 'firstEvents': events,
        'pilotObservations': {k: runs[k].summary() for k in runs if k not in independent_flags},
        'independentWitnesses': {'classificationCounts': {k: dict(v) for k, v in classes.items()},
            'containment': {k: runs[k].summary() for k in independent_flags},
            'sequence': {k: sequence[k] for k in ('observedStandingOutside', 'partialFronts', 'entry', 'travel', 'exitIntent', 'exit', 'standingAfterExitSeconds', 'accepted')}},
        'measuredRanges': ranges.values,
        'scope': ['Pilot cues/fit/in-cavity are controller observations; independent current14, displayed7 and union21 remain separate.',
            'Displayed classifier reuses seven current spheres; it adds seven unique displayed points, not14 unique extra witnesses.',
            'Current physical witnesses and delayed displayed points are measured against current drawn loft; normal interpolation remains intact.',
            'Run duration is first-to-last observed sample span; missing witnesses are not independent containment.',
            'Height envelope covers logged render points and equivalent-volume part spheres, excluding unlogged board corners/complete skin/limbs.',
            'Candidate floor/roof gaps cover logged unambiguous candidates, not proof of a shared component unless classifier accepted.',
            'Near sphere gap uses the logged nearby indexed triangle search; null means no nearby candidate, not infinite global clearance.',
            'No contact force, causal roof/fall, rendered-mask, FPS or ordinary menu-seed reachability inference.']}
    if args.timeline:
        summary['terminalTimeline'] = list(tail)
    print(json.dumps(summary, separators=(',', ':'), allow_nan=False))


if __name__ == '__main__':
    main()
