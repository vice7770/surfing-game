from pathlib import Path
import hashlib,json,math
W=Path('/private/tmp/tube-native-trial-balance-native-20261005');R=Path(__file__).resolve().parent/'root-balance'
assert not R.exists();R.mkdir()
def pin(p):
 b=Path(p).read_bytes();return {'file':str(p),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
owner=json.loads((W/'candidate-first-owner.json').read_text());assert owner['complete'] and owner['exitCode']==0 and owner['independentClosureValid'] and owner['protectedPortsPreserved'] and owner['remainingOwnedPids']==[] and owner['sourceBuildHelpersPostUnchanged']
rp=W/'candidate-first/report.json';report=json.loads(rp.read_text());assert report['complete'] and report['stepCount']==1366 and report['firstFailure'] is None
assert not any(r['ride']['phase']=='standing' for r in report['steps'])
fields=json.loads((W/'observer-fields.json').read_text());records={};references=0
for row in report['steps']:
 cd=row['ride']['contactDiagnostics']
 if row['ride']['contactDiagnosticRetention']!='full':continue
 for name,s in [('last',cd.get('last')),('firstLimited',cd.get('firstLimited')),('firstNonContact',cd.get('firstNonContact')),('loss',(cd.get('loss') or {}).get('sample'))]:
  if s is None:continue
  assert all(isinstance(s[k],(float,int)) and math.isfinite(s[k]) for k in fields['allFields']);references+=1
  key=(s['step'],s['substep'],s['phase'])
  if key in records:assert records[key]['raw']==s;records[key]['references'].append({'row':row['step'],'sample':name})
  else:records[key]={'raw':s,'references':[{'row':row['step'],'sample':name}]}
def vec(s,p):return [s[p+a] for a in 'XYZ']
def add(a,b):return [x+y for x,y in zip(a,b)]
def sub(a,b):return [x-y for x,y in zip(a,b)]
def scale(a,k):return [x*k for x in a]
def dot(a,b):return sum(x*y for x,y in zip(a,b))
def cross(a,b):return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
def mv(A,x):return [dot(row,x) for row in A]
def norm(a):return max(abs(x) for x in a)
def solve(A,q):
 n=len(q);v=[list(row)+[rhs] for row,rhs in zip(A,q)];pivots=[]
 for i in range(n):
  k=max(range(i,n),key=lambda k:abs(v[k][i]));p=v[k][i]
  if not math.isfinite(p) or abs(p)<1e-15:raise ValueError('singular/nonfinite pivot')
  v[i],v[k]=v[k],v[i];pivots.append(abs(p))
  for j in range(i+1,n):
   factor=v[j][i]/v[i][i]
   for l in range(i,n+1):v[j][l]-=factor*v[i][l]
 x=[0.0]*n
 for i in range(n-1,-1,-1):x[i]=(v[i][n]-sum(v[i][j]*x[j] for j in range(i+1,n)))/v[i][i]
 return x,min(pivots)
results=[];unavailable=[]
for key,record in sorted(records.items()):
 s=record['raw']
 if s['standingTrialAvailable']!=1 or s['phase']!='landing':unavailable.append({'identity':key,'marker':s['standingTrialAvailable'],'phase':s['phase']});continue
 n=vec(s,'demandUp');sf=vec(s,'specificForce');den=dot(sf,n);assert den>1e-6
 m=s['legLoad']/den;assert abs(m-73)<1e-10
 cancellation=sum(abs(x*y) for x,y in zip(sf,n))/den
 h=s['seconds'];u=s['legRate'];ua=s['legRateAfter'];du=ua-u;e=s['legExtension'];rest=s['legRest'];K=s['legStiffness'];D=s['legDamping'];L=s['legLoad'];F0=s['legForce']
 V=vec(s,'preparedBoardVelocity');omega=vec(s,'preparedBoardSpin');drive=vec(s,'drive');vr=vec(s,'demandVelocity');ext=vec(s,'riderExternal');a=vec(s,'forceArm');b=vec(s,'carriedArm');rel=vec(s,'carriedRelative')
 d=vec(s,'trialBoardDeltaVelocity')+vec(s,'trialBoardDeltaSpin');B=[[s[f'boardPreMatrix{i}{j}']for j in range(6)]for i in range(6)];qb=[s[f'boardPreRhs{i}']for i in range(6)]
 mismatch=sub(add(add(add(V,cross(omega,b)),drive),scale(n,u)),vr)
 alternative=add(scale(rel,-1),scale(n,u));q=sub(scale(ext,h),scale(mismatch,m));A=m+h*D+h*h*K
 C=dot(n,add(d[:3],cross(d[3:],b)));rhs=dot(n,q)+h*(F0-h*K*u)
 J=sub(scale(add(add(mismatch,add(d[:3],cross(d[3:],b))),scale(n,du)),m),scale(ext,h))
 implicit=L-K*(e+h*ua-rest)-D*ua
 gf=lambda j:j+cross(a,j)
 tau=add(sub(mv(B,d),qb),gf(J))
 basis=[[1.0 if i==j else 0.0 for i in range(6)]for j in range(6)]
 gv=[add(v[:3],cross(v[3:],b))for v in basis]
 H=[[B[i][j]+m*gf(gv[j])[i]for j in range(6)]for i in range(6)]
 c=scale(gf(n),m);ell=[m*dot(n,v)for v in gv];rhs6=add(qb,gf(q))
 full=[H[i]+[c[i]]for i in range(6)]+[ell+[A]];fullrhs=rhs6+[rhs]
 solved,minpivot=solve(full,fullrhs);d0,boardpivot=solve(B,qb);hc,_=solve(H,c);hr,_=solve(H,rhs6);schur=A-dot(ell,hc)
 terms={'preparedRate':m*u/A,'preparedLoad':h*L/A,'elasticStretch':-h*K*(e-rest)/A,'riderExternalAxial':h*dot(n,ext)/A,'preparedMismatch':-m*dot(n,mismatch)/A,'boardTranslation':-m*dot(n,d[:3])/A,'carryArmRotation':-m*dot(cross(b,n),d[3:])/A}
 terms['sum']=sum(terms.values())
 value={'identity':list(key),'references':record['references'],'raw':s,'inferredMass':m,'massDotCancellationRatio':cancellation,'preparedMismatch':mismatch,'boardDelta':d,'sameAssemblyBoardOnlyHypothetical':d0,'coupledMinusHypothetical':sub(d,d0),'carrierAxialDelta':C,'boardOnlyCarrierAxialHypothetical':dot(n,add(d0[:3],cross(d0[3:],b))),'uAfterTerms':terms,'uAfter':ua,'implicitAxialForce':implicit,'attemptedDeckForce':s['demandLocalY']/h,'attemptedForeForce':s['demandLocalZ']/h,'reconstructedAttemptedImpulse':J,'extraTorqueClosureResidual':tau[3:],'linearBoardClosureResidual':tau[:3],'fullZeroExtraTorqueSolution':solved,'fullMatrix':full,'fullRhs':fullrhs,'minimumFullPivotMagnitude':minpivot,'minimumBoardPivotMagnitude':boardpivot,'schurDenominator':schur,'schurNumerator':rhs-dot(ell,hr),'matrixAsymmetryMaximum':max(abs(full[i][j]-full[j][i])for i in range(7)for j in range(7)),'residuals':{'unitNormal':abs(dot(n,n)-1),'mismatchAlternative':norm(sub(mismatch,alternative)),'preparedRateFromRelative':abs(u-dot(n,rel)),'preparedForce':abs(F0-(L-K*(e-rest)-D*u)),'axialImpulseRow':abs(m*C+A*du-rhs),'attemptedImpulse':norm(sub(J,vec(s,'demand'))),'implicitAxialForce':abs(dot(n,J)/h-implicit),'uAfterAllocation':abs(ua-terms['sum']),'boardOnlySolve':norm(sub(mv(B,d0),qb)),'fullZeroTorqueSolve':norm(sub(solved,d+[du])),'fullCapturedRow':norm(sub(mv(full,d+[du]),fullrhs)),'completeBoardTorqueBalance':norm(tau)}}
 results.append(value)
maxima={k:max(r['residuals'][k]for r in results)for k in results[0]['residuals']}
byid={(r['identity'][0],r['identity'][1]):r for r in results}
selected=[byid[k]for k in [(1356,32),(1357,1),(1357,32),(1358,32),(1366,7)]]
transition={k:selected[1]['uAfterTerms'][k]-selected[0]['uAfterTerms'][k]for k in selected[0]['uAfterTerms']}
summary={'schema':'trial-balance-root-numerical-decomposition/v1','inputs':[pin(rp),pin(W/'candidate-first-owner.json'),pin(W/'observer-fields.json'),pin(W/'source-readiness.json'),pin(W/'source/src/physics/AttachedRider.ts'),pin(Path(__file__)),pin(Path('/private/tmp/tube-native-trial-balance-decomposition-design-20261005/source-analysis-plan.md'))],'references':references,'uniqueRecords':len(records),'availableLandingRecords':len(results),'unavailable':unavailable,'maximumResiduals':maxima,'selected':[{k:v for k,v in r.items() if k not in ['raw','fullMatrix','fullRhs','references']}for r in selected],'transition1356sub32To1357sub1':transition,'zeroExtraTorqueBasis':'Original reset mount and prone/push frame resetTwist; no standing before fall; neutral rotate and landing hand/bank/swing torque. Measured board torque closure retained independently.','limitations':['Only published/latch samples, not every internal substep.','B/RHS and external are combined assemblies; component hydrodynamic causes are not captured.','Board-only and zero-torque7x7 solutions are offline hypotheses reconstructed from the same captured operands, not new native executions or fallback motion.','Solved-term transition allocations are algebraic identities, not independent causal interventions.','This analysis does not accept a gameplay fix, standing, tube passage, visuals or adoption.']}
(R/'all-samples.json').write_text(json.dumps(results,indent=2)+'\n');summary['allSamples']=pin(R/'all-samples.json');(R/'analysis.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({'analysis':pin(R/'analysis.json'),'references':references,'uniqueRecords':len(records),'availableLanding':len(results),'maximumResiduals':maxima,'selected':summary['selected'],'transition':transition},indent=2))
