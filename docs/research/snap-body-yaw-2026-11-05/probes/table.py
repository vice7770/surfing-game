import json,sys
a=json.load(open(sys.argv[1])); b=json.load(open(sys.argv[2]))
on=0;off=0
for x,y in zip(a,b):
    def s(r):
        m1=r['m1'];m2=r['m2']
        f=r['fell']
        return f"m1 {m1['turned']}° kept {m1['kept']} | hi {r['highest']} | m2 {m2['turned']}° kept {m2['kept']} | lo {r['lowest']} | {'FELL '+str(f)+' '+r['cause'] if f is not None else 'ON'}"
    off+= x['fell'] is None; on+= y['fell'] is None
    print(f"{x['case']:38s} OFF {s(x)}\n{'':38s} ON  {s(y)}")
print('stayed on: off',off,'on',on,'of',len(a))
