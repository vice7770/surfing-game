from pathlib import Path
import hashlib,json,math
R=Path(__file__).resolve().parent/'root-balance';p=R/'all-samples.json';rows=json.loads(p.read_text());by={(r['identity'][0],r['identity'][1]):r for r in rows};a=by[(1356,32)];b=by[(1357,1)]
def pin(p):
 v=p.read_bytes();return {'file':str(p),'bytes':len(v),'sha256':hashlib.sha256(v).hexdigest()}
def sub(a,b):return [x-y for x,y in zip(a,b)]
def add(a,b):return [x+y for x,y in zip(a,b)]
def mv(A,x):return [sum(q*v for q,v in zip(row,x))for row in A]
def solve(A,q):
 n=len(q);v=[list(row)+[rhs]for row,rhs in zip(A,q)]
 for i in range(n):
  k=max(range(i,n),key=lambda k:abs(v[k][i]));assert abs(v[k][i])>1e-15;v[i],v[k]=v[k],v[i]
  for j in range(i+1,n):
   f=v[j][i]/v[i][i]
   for l in range(i,n+1):v[j][l]-=f*v[i][l]
 x=[0.0]*n
 for i in range(n-1,-1,-1):x[i]=(v[i][n]-sum(v[i][j]*x[j]for j in range(i+1,n)))/v[i][i]
 return x
def board(r):return [[r['raw'][f'boardPreMatrix{i}{j}']for j in range(6)]for i in range(6)]
def rhs(r):return [r['raw'][f'boardPreRhs{i}']for i in range(6)]
Ba,Bb=board(a),board(b);qa,qb=rhs(a),rhs(b);dB=[sub(x,y)for x,y in zip(Bb,Ba)];dq=sub(qb,qa)
Ka,Kb=a['fullMatrix'],b['fullMatrix'];dK=[sub(x,y)for x,y in zip(Kb,Ka)];dR=sub(b['fullRhs'],a['fullRhs'])
xA=a['boardDelta']+[a['raw']['legRateAfter']-a['raw']['legRate']];xB=b['boardDelta']+[b['raw']['legRateAfter']-b['raw']['legRate']]
boardMatrixDelta=[dB[i]+[0]for i in range(6)]+[[0.0]*7];riderMatrixDelta=[sub(x,y)for x,y in zip(dK,boardMatrixDelta)];boardRhsDelta=dq+[0.0];riderRhsDelta=sub(dR,boardRhsDelta)
contributions={'boardRhs':solve(Kb,boardRhsDelta),'boardMatrix':solve(Kb,[-x for x in mv(boardMatrixDelta,xA)]),'riderRhs':solve(Kb,riderRhsDelta),'riderMatrix':solve(Kb,[-x for x in mv(riderMatrixDelta,xA)])}
total=[sum(v[i]for v in contributions.values())for i in range(7)];actual=sub(xB,xA)
boardOnlyContributions={'rhs':solve(Bb,dq),'matrix':solve(Bb,[-x for x in mv(dB,a['sameAssemblyBoardOnlyHypothetical'])])};boardOnlyActual=sub(b['sameAssemblyBoardOnlyHypothetical'],a['sameAssemblyBoardOnlyHypothetical'])
row={'schema':'trial-balance-root-transition-allocation/v1','inputs':[pin(p),pin(Path(__file__))],'from':[1356,32],'to':[1357,1],'method':'Exact A-to-B reference identity: deltaX = inverse(K_B)*(deltaRhs - deltaK*X_A). Component responses allocate matrix/RHS changes under this chosen inverse; they are not independent native interventions or a unique causal split.','recordedBoardRhsBefore':qa,'recordedBoardRhsAfter':qb,'recordedBoardMatrixBefore':Ba,'recordedBoardMatrixAfter':Bb,'boardRhsDelta':dq,'boardMatrixDelta':dB,'fullDeltaActual':actual,'fullDeltaAllocated':total,'contributions':contributions,'maximumAllocationResidual':max(abs(x-y)for x,y in zip(actual,total)),'boardOnlyHypotheticalDelta':boardOnlyActual,'boardOnlyContributions':boardOnlyContributions,'maximumBoardOnlyAllocationResidual':max(abs(boardOnlyActual[i]-sum(v[i]for v in boardOnlyContributions.values()))for i in range(6)),'scope':'Captured combined board assembly only; no separate wetting/pressure/added-mass/radiation/foil/gyro attribution.'}
out=R/'transition.json';assert not out.exists();out.write_text(json.dumps(row,indent=2)+'\n');print(json.dumps({'result':pin(out),'fullDelta':actual,'contributions':contributions,'maximumAllocationResidual':row['maximumAllocationResidual'],'boardOnlyContributions':boardOnlyContributions,'boardRhsBefore':qa,'boardRhsAfter':qb,'boardMatrixDiagonals':{'before':[Ba[i][i]for i in range(6)],'after':[Bb[i][i]for i in range(6)]}},indent=2))
