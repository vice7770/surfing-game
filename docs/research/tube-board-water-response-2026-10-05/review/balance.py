"""Prospective offline algebra reused from root-balance.py/root-transition.py; no import-time work."""
import math, sys

GROUPS = ('gravity', 'buoyancy', 'pressure', 'friction', 'fin', 'rail', 'gyro', 'waterCombined')
def vec(s, p): return [s[p + a] for a in 'XYZ']
def add(a, b): return [x + y for x, y in zip(a, b)]
def sub(a, b): return [x - y for x, y in zip(a, b)]
def scale(a, k): return [x * k for x in a]
def dot(a, b): return sum(x * y for x, y in zip(a, b))
def cross(a, b): return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
def mv(A, x): return [dot(row, x) for row in A]
def norm(a): return max(abs(x) for x in a)
def solve(A, q):
    # Exact existing offline partial-pivot convention, including its singular threshold.
    n = len(q); v = [list(row) + [rhs] for row, rhs in zip(A, q)]; pivots = []
    for i in range(n):
        k = max(range(i, n), key=lambda k: abs(v[k][i])); p = v[k][i]
        if not math.isfinite(p) or abs(p) < 1e-15: raise ValueError('singular/nonfinite pivot')
        v[i], v[k] = v[k], v[i]; pivots.append(abs(p))
        for j in range(i + 1, n):
            factor = v[j][i] / v[i][i]
            for l in range(i, n + 1): v[j][l] -= factor * v[i][l]
    x = [0.0] * n
    for i in range(n - 1, -1, -1): x[i] = (v[i][n] - sum(v[i][j]*x[j] for j in range(i + 1, n))) / v[i][i]
    return x, min(pivots)

def rhs_groups(s):
    h = s['boardPreStepSeconds']; assert h == s['seconds'] and h > 0
    result = {'gravity': [0.0, h*s['boardPreWeight'], 0.0, 0.0, 0.0, 0.0]}
    for group in ('buoyancy', 'pressure', 'friction', 'fin', 'rail'):
        stem = 'boardPre' + group.title()
        result[group] = scale(vec(s, stem + 'Force') + vec(s, stem + 'Torque'), h)
    result['gyro'] = [0.0, 0.0, 0.0] + scale(vec(s, 'boardPreGyro'), -h)
    result['waterCombined'] = vec(s, 'boardPreWaterImpulse') + vec(s, 'boardPreWaterTorqueImpulse')
    ordered = []
    for j, axis in enumerate('XYZ'):
        terms = [float(s['boardPre' + name.title() + 'Force' + axis]) for name in ('buoyancy', 'pressure', 'friction', 'fin', 'rail')]
        if j == 1: terms.insert(0, float(s['boardPreWeight']))
        total = terms[0]
        for value in terms[1:]: total += value
        ordered.append(h*total + float(s['boardPreWaterImpulse' + axis]))
    for axis in 'XYZ':
        terms = [float(s['boardPre' + name.title() + 'Torque' + axis]) for name in ('buoyancy', 'pressure', 'friction', 'fin', 'rail')]
        total = terms[0]
        for value in terms[1:]: total += value
        ordered.append(h*(total - float(s['boardPreGyro' + axis])) + float(s['boardPreWaterTorqueImpulse' + axis]))
    qb = [s[f'boardPreRhs{i}'] for i in range(6)]
    combined = [sum(result[group][i] for group in GROUPS) for i in range(6)]
    bound = [64*sys.float_info.epsilon*max(1.0, abs(qb[i]), sum(abs(result[group][i]) for group in GROUPS)) for i in range(6)]
    residual = sub(combined, qb)
    source_exact = all(x == y and (x != 0 or math.copysign(1, x) == math.copysign(1, y)) for x, y in zip(ordered, qb))
    return {'groups': result, 'capturedPreRhs': qb, 'sourceOrderedPreRhs': ordered,
        'sourceOrderedResidual': sub(ordered, qb), 'groupSum': combined, 'groupSumResidual': residual,
        'floatingRoundoffBounds': bound, 'sourceOrderedExact': source_exact,
        'groupSumClosed': all(abs(residual[i]) <= bound[i] for i in range(6)), 'stepSeconds': h}

def reconstruct(record, expected_mass):
    s = record['raw']; n = vec(s, 'demandUp'); sf = vec(s, 'specificForce'); den = dot(sf, n)
    sum_abs = sum(abs(x*y) for x, y in zip(sf, n))
    assert den > 64*sys.float_info.epsilon*max(1.0, sum_abs), 'Mass inference unavailable/ill-conditioned.'
    m = s['legLoad']/den; assert math.isfinite(m) and m > 0
    assert abs(m - expected_mass) <= 1e-10*max(1.0, expected_mass), 'Root source/config mass cross-check failed.'
    h = s['seconds']; u = s['legRate']; ua = s['legRateAfter']; du = ua-u
    e = s['legExtension']; rest = s['legRest']; K = s['legStiffness']; D = s['legDamping']; L = s['legLoad']; F0 = s['legForce']
    V = vec(s, 'preparedBoardVelocity'); omega = vec(s, 'preparedBoardSpin'); drive = vec(s, 'drive')
    vr = vec(s, 'demandVelocity'); ext = vec(s, 'riderExternal'); a = vec(s, 'forceArm'); b = vec(s, 'carriedArm'); rel = vec(s, 'carriedRelative')
    d = vec(s, 'trialBoardDeltaVelocity') + vec(s, 'trialBoardDeltaSpin')
    B = [[s[f'boardPreMatrix{i}{j}'] for j in range(6)] for i in range(6)]; qb = [s[f'boardPreRhs{i}'] for i in range(6)]
    mismatch = sub(add(add(add(V, cross(omega, b)), drive), scale(n, u)), vr)
    alternative = add(scale(rel, -1), scale(n, u)); q = sub(scale(ext, h), scale(mismatch, m)); A = m+h*D+h*h*K
    C = dot(n, add(d[:3], cross(d[3:], b))); axial_rhs = dot(n, q)+h*(F0-h*K*u)
    J = sub(scale(add(add(mismatch, add(d[:3], cross(d[3:], b))), scale(n, du)), m), scale(ext, h))
    implicit = L-K*(e+h*ua-rest)-D*ua
    gf = lambda j: j + cross(a, j)
    tau = add(sub(mv(B, d), qb), gf(J))
    basis = [[1.0 if i == j else 0.0 for i in range(6)] for j in range(6)]
    gv = [add(v[:3], cross(v[3:], b)) for v in basis]
    H = [[B[i][j]+m*gf(gv[j])[i] for j in range(6)] for i in range(6)]
    c = scale(gf(n), m); ell = [m*dot(n, v) for v in gv]; rhs6 = add(qb, gf(q))
    full = [H[i]+[c[i]] for i in range(6)] + [ell+[A]]; fullrhs = rhs6+[axial_rhs]
    solved, minpivot = solve(full, fullrhs); d0, boardpivot = solve(B, qb)
    hc, _ = solve(H, c); hr, _ = solve(H, rhs6); schur = A-dot(ell, hc)
    terms = {'preparedRate': m*u/A, 'preparedLoad': h*L/A, 'elasticStretch': -h*K*(e-rest)/A,
        'riderExternalAxial': h*dot(n, ext)/A, 'preparedMismatch': -m*dot(n, mismatch)/A,
        'boardTranslation': -m*dot(n, d[:3])/A, 'carryArmRotation': -m*dot(cross(b, n), d[3:])/A}
    terms['sum'] = sum(terms.values())
    x = d+[du]; captured_residual = sub(mv(full, x), fullrhs)
    counterfactual = {}
    for group, rhs in record['rhsClosure']['groups'].items():
        reduced = sub(fullrhs, rhs+[0.0]); answer, pivot = solve(full, reduced)
        counterfactual[group] = {'rhsRemoved': rhs+[0.0], 'sameMatrix': True, 'solution': answer,
            'minimumPivot': pivot, 'solutionResidual': sub(mv(full, answer), reduced), 'differenceFromFullZeroExtraTorqueSolution': sub(answer, solved)}
    return {'identity': record['identity'], 'references': record['references'], 'raw': s, 'rhsClosure': record['rhsClosure'],
        'inferredMass': m, 'massDotCancellationRatio': sum_abs/den, 'rootExpectedSourceConfigMass': expected_mass,
        'preparedMismatch': mismatch, 'riderImpulseRhs': q, 'boardDelta': d, 'axialRateChange': du,
        'sameAssemblyBoardOnlyHypothetical': d0, 'coupledMinusHypothetical': sub(d, d0),
        'carrierAxialDelta': C, 'boardOnlyCarrierAxialHypothetical': dot(n, add(d0[:3], cross(d0[3:], b))),
        'uAfterTerms': terms, 'uAfter': ua, 'implicitAxialForce': implicit,
        'implicitForceTerms': {'load': L, 'spring': -K*(e+h*ua-rest), 'damper': -D*ua},
        'attemptedDeckForce': s['demandLocalY']/h, 'attemptedForeForce': s['demandLocalZ']/h,
        'reconstructedAttemptedImpulse': J, 'extraTorqueClosureResidual': tau[3:], 'linearBoardClosureResidual': tau[:3],
        'fullZeroExtraTorqueSolution': solved, 'fullMatrix': full, 'fullRhs': fullrhs, 'capturedRowResidual': captured_residual,
        'sameAssemblyWithoutOneBoardRhsGroup': counterfactual, 'minimumFullPivotMagnitude': minpivot, 'minimumBoardPivotMagnitude': boardpivot,
        'schurDenominator': schur, 'schurNumerator': axial_rhs-dot(ell, hr),
        'matrixAsymmetryMaximum': max(abs(full[i][j]-full[j][i]) for i in range(7) for j in range(7)),
        'residuals': {'unitNormal': abs(dot(n,n)-1), 'mismatchAlternative': norm(sub(mismatch, alternative)),
            'preparedRateFromRelative': abs(u-dot(n,rel)), 'preparedForce': abs(F0-(L-K*(e-rest)-D*u)),
            'axialImpulseRow': abs(m*C+A*du-axial_rhs), 'attemptedImpulse': norm(sub(J, vec(s,'demand'))),
            'implicitAxialForce': abs(dot(n,J)/h-implicit), 'uAfterAllocation': abs(ua-terms['sum']),
            'boardOnlySolve': norm(sub(mv(B,d0),qb)), 'fullZeroTorqueSolve': norm(sub(solved,x)),
            'fullCapturedRow': norm(captured_residual), 'completeBoardTorqueBalance': norm(tau)}}

def transition(a, b):
    Ba = [[a['raw'][f'boardPreMatrix{i}{j}'] for j in range(6)] for i in range(6)]
    Bb = [[b['raw'][f'boardPreMatrix{i}{j}'] for j in range(6)] for i in range(6)]
    qa, qb = a['rhsClosure']['capturedPreRhs'], b['rhsClosure']['capturedPreRhs']
    dB = [sub(x,y) for x,y in zip(Bb,Ba)]; dq = sub(qb,qa)
    Ka,Kb = a['fullMatrix'],b['fullMatrix']; dK = [sub(x,y) for x,y in zip(Kb,Ka)]; dR = sub(b['fullRhs'],a['fullRhs'])
    xA = a['boardDelta']+[a['axialRateChange']]; xB = b['boardDelta']+[b['axialRateChange']]
    board_matrix = [dB[i]+[0.0] for i in range(6)]+[[0.0]*7]
    rider_matrix = [sub(x,y) for x,y in zip(dK,board_matrix)]
    group_deltas = {group: sub(b['rhsClosure']['groups'][group], a['rhsClosure']['groups'][group]) for group in GROUPS}
    group_responses = {group: solve(Kb, delta+[0.0])[0] for group,delta in group_deltas.items()}
    combined = {'boardRhs': solve(Kb,dq+[0.0])[0], 'boardMatrix': solve(Kb,scale(mv(board_matrix,xA),-1))[0],
        'riderRhs': solve(Kb,sub(dR,dq+[0.0]))[0], 'riderMatrix': solve(Kb,scale(mv(rider_matrix,xA),-1))[0]}
    residual_delta = sub(b['capturedRowResidual'],a['capturedRowResidual'])
    residual_response = solve(Kb,residual_delta)[0]
    allocated = [sum(v[i] for v in combined.values()) for i in range(7)]
    actual = sub(xB,xA); with_residual = add(allocated,residual_response)
    board_group_responses = {group: solve(Bb,delta)[0] for group,delta in group_deltas.items()}
    board_matrix_response = solve(Bb,scale(mv(dB,a['sameAssemblyBoardOnlyHypothetical']),-1))[0]
    board_actual = sub(b['sameAssemblyBoardOnlyHypothetical'],a['sameAssemblyBoardOnlyHypothetical'])
    board_allocated = [board_matrix_response[i]+sum(v[i] for v in board_group_responses.values()) for i in range(6)]
    return {'from': a['identity'], 'to': b['identity'], 'method': 'Chosen B inverse: deltaX = inverse(K_B)*(deltaRhs-deltaK*X_A). Retain captured row residual correction separately.',
        'recordedBoardRhsBefore': qa, 'recordedBoardRhsAfter': qb, 'recordedBoardMatrixBefore': Ba, 'recordedBoardMatrixAfter': Bb,
        'boardRhsDelta': dq, 'boardMatrixDelta': dB, 'fullMatrixDelta': dK, 'fullRhsDelta': dR,
        'boardRhsGroupDeltas': group_deltas, 'boardRhsGroupResponses': group_responses, 'combinedContributions': combined,
        'groupResponseSumResidual': sub([sum(v[i] for v in group_responses.values()) for i in range(7)],combined['boardRhs']),
        'fullDeltaActual': actual, 'fullDeltaAllocated': allocated, 'capturedRowResidualDelta': residual_delta,
        'capturedRowResidualResponse': residual_response, 'fullDeltaAllocatedIncludingResidual': with_residual,
        'allocationResidual': sub(allocated,actual), 'allocationResidualIncludingCapturedRowCorrection': sub(with_residual,actual),
        'boardOnlyHypotheticalDelta': board_actual, 'boardOnlyGroupContributions': board_group_responses,
        'boardOnlyMatrixContribution': board_matrix_response, 'boardOnlyAllocationResidual': sub(board_allocated,board_actual),
        'uAfterTermDeltas': {key:b['uAfterTerms'][key]-a['uAfterTerms'][key] for key in a['uAfterTerms']},
        'implicitForceTermDeltas': {key:b['implicitForceTerms'][key]-a['implicitForceTerms'][key] for key in a['implicitForceTerms']},
        'scope': 'Algebraic assembly allocation and same-assembly hypotheses; not independent native interventions or a unique causal split.'}

def analyze_balance(report, representations, fields, expected_mass, save, sample_equal):
    records = {}
    for ref in representations:
        s = ref['sample']; key = (s['step'],s['substep'],s['phase'])
        if key in records:
            assert sample_equal(records[key]['raw'], s), ('Conflicting retained sample identity',key)
            records[key]['references'].append(ref['path'])
        else: records[key] = {'identity':list(key), 'raw':s, 'references':[ref['path']]}
    available = []; unavailable = []
    for key,row in sorted(records.items()):
        if row['raw']['standingTrialAvailable'] == 1 and row['raw']['phase'] == 'landing':
            row['rhsClosure'] = rhs_groups(row['raw']); available.append(row)
        else: unavailable.append(row)
    closure_rows = [{'identity':r['identity'], 'references':r['references'], **r['rhsClosure']} for r in available]
    closure_pin = save('board-rhs-group-closure.json', {'groups':list(GROUPS), 'records':closure_rows,
        'availableLandingSamples':len(available), 'expectedAvailableLandingSamples':46,
        'allSixChannelsSourceOrderedExact':all(r['sourceOrderedExact'] for r in closure_rows),
        'allSixChannelsGroupedSumClosed':all(r['groupSumClosed'] for r in closure_rows),
        'waterIsAlreadyImpulse':True, 'gyroSubtractsPositiveCapturedGyro':True, 'decompositionHasNotRunYet':True})
    unavailable_pin = save('unavailable-observer-records.json', {'records':unavailable, 'marker0WordsNotUsed':True})
    assert len(available) == 46 and all(r['sourceOrderedExact'] and r['groupSumClosed'] for r in closure_rows), 'Board RHS closure gate failed before decomposition.'
    available_ids = {(r['identity'][0], r['identity'][1]): r for r in available}
    assert len(available_ids) == 46 and {(1356,32),(1357,1)} <= set(available_ids), 'Exact requested transition samples missing before decomposition.'
    assert not any(r['ride']['phase'] == 'standing' for r in report['steps']), 'This reduced7x7 witness basis excludes standing.'
    results = [reconstruct(row,expected_mass) for row in available]
    byid = {(r['identity'][0],r['identity'][1]):r for r in results}
    selected = transition(byid[(1356,32)],byid[(1357,1)])
    losses = [r for r in results if any('.loss.sample' in p for p in r['references'])]
    all_pin = save('all-landing-balance-samples.json', results)
    transition_pin = save('transition1356-32-to1357-1.json',selected)
    loss_pin = save('all-available-loss-samples.json',{'records':losses,'firstContactLoss':report.get('firstContactLoss'),
        'unavailableLosses':[r for r in unavailable if any('.loss.sample' in p for p in r['references'])]})
    summary = {'schema':'board-rhs-components-root-numerical-decomposition/v1', 'uniqueObserverRecords':len(records),
        'retainedRepresentations':len(representations), 'availableLandingRecords':len(results), 'allRhsGroupsClosedBeforeDecomposition':True,
        'maximumResiduals':{key:max(r['residuals'][key] for r in results) for key in results[0]['residuals']},
        'zeroExtraTorqueBasis':'Same neutral landing witness before any standing; reduced7x7 retains measured extra-torque/captured-row residuals rather than discarding them.',
        'limitations':['Only published/latch samples; every internal substep is not captured.',
            'Gravity/buoyancy/pressure/friction/fin/rail/gyro/water are captured board RHS aggregates; board matrix/inertia/contact/rider external remain combined assemblies.',
            'Water aggregate combines radiation and entrainment; its algebraic contribution is not proof of either mechanism.',
            'Reduced7x7 zero-extra-torque hypotheses do not capture an independent twist/bank row. Captured row residual correction is shown separately.',
            'Chosen inverse allocations and same-assembly group-removal solves are offline algebra, not native reruns or unique causation.'],
        'artifacts':{'rhsClosure':closure_pin,'unavailable':unavailable_pin,'allSamples':all_pin,'transition':transition_pin,'losses':loss_pin}}
    summary_pin = save('numerical-analysis.json',summary)
    return {'artifacts':dict(summary['artifacts'],summary=summary_pin)}
