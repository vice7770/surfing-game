from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import hashlib,json,os,signal,socket,subprocess,threading,time

W=Path('/private/tmp/tube-local-sheet-capture-v2-20261005')
def verify(spec):
 b=Path(spec['file']).read_bytes();assert len(b)==spec['bytes'] and hashlib.sha256(b).hexdigest()==spec['sha256'];return b
def free(port):
 s=socket.socket();s.settimeout(.3)
 try:s.connect(('127.0.0.1',port));return False
 except ConnectionRefusedError:return True
 finally:s.close()
def identities():
 result={}
 for port in (4312,4313,4314):
  raw=subprocess.check_output(['/usr/sbin/lsof','-nP','-a','-iTCP:'+str(port),'-sTCP:LISTEN','-Fp'],text=True)
  pids=[int(x[1:])for x in raw.splitlines()if x.startswith('p')];assert pids
  result[str(port)]=[subprocess.check_output(['/bin/ps','-p',str(pid),'-o','pid=,lstart=,comm='],text=True).strip()for pid in pids]
 return result
sealbytes=(W/'seal.json').read_bytes();seal=json.loads(sealbytes)
build=json.loads(verify(seal['approvedApplicationBuild']))
def check():
 for q in build['assets']+build['sources']+seal['helpers']+seal['borrowedHelpers']+[seal['diagnosticModule']]:verify(q)
check();assert not (W/'owner.json').exists() and all(free(p)for p in(4301,9711))
before=identities();started=time.monotonic();server=None;proc=None
record={'complete':False,'firstFailure':None,'protectedBefore':before,'build':seal['approvedApplicationBuild'],'sealSha256':hashlib.sha256(sealbytes).hexdigest()}
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(W/'dist'),**kw)
 def log_message(self,*a):pass
 def do_GET(self):
  if self.path.split('?')[0]=='/diagnostic-autopilot.mjs':
   b=verify(seal['diagnosticModule']);self.send_response(200);self.send_header('Content-Type','text/javascript');self.send_header('Content-Length',str(len(b)));self.end_headers();self.wfile.write(b)
  else:super().do_GET()
try:
 server=ThreadingHTTPServer(('127.0.0.1',4301),Handler);server.daemon_threads=True
 threading.Thread(target=server.serve_forever,daemon=True).start()
 env={**os.environ,'MATURE_REGION_OWNER_SEAL_SHA':record['sealSha256'],'FULL_WRITER_FPS_LAUNCHER_REPORT':str(W/'launcher.json')}
 with (W/'native.log').open('wb')as log:
  proc=subprocess.Popen(['/opt/homebrew/bin/node',str(W/'native.mjs'),'--run=true','--arm=candidate','--url=http://127.0.0.1:4301/?diagnostics','--out='+str(W/'candidate-first')],stdout=log,stderr=subprocess.STDOUT,start_new_session=True,env=env)
  record['pid']=proc.pid
  (W/'live.json').write_text(json.dumps(record))
  while proc.poll()is None:
   if time.monotonic()-started>648:raise TimeoutError('Native deadline reached')
   time.sleep(.2)
  record['exitCode']=proc.returncode;assert proc.returncode==0
 result=json.loads((W/'candidate-first/report.json').read_text())
 assert result['complete'] and result['firstFailure']is None and result['ownedBrowserClose']
 assert result['stepCount']==0 and result['canonicalMatureReferenceMatch']['activeFull37AndRawFrontWordsExact']
 assert not result['browserErrors'] and result['inspection']['nonmutation']['unchanged']
 check();record['complete']=True
except BaseException as error:record['firstFailure']=str(error);record['complete']=False
finally:
 if proc:
  # Signal only this fresh, explicitly owned process group; preserved previews have different groups.
  owned=[int(line.split()[0])for line in subprocess.check_output(['/bin/ps','-axo','pid=,pgid=,stat='],text=True).splitlines()if len(line.split())==3 and int(line.split()[1])==proc.pid and not line.split()[2].startswith('Z')]
  protected={int(row.split()[0])for group in before.values()for row in group};assert not protected.intersection(owned)
  if owned:
   os.killpg(proc.pid,signal.SIGTERM)
   try:proc.wait(timeout=3)
   except subprocess.TimeoutExpired:os.killpg(proc.pid,signal.SIGKILL);proc.wait(timeout=2)
 if server:server.shutdown();server.server_close()
 record['protectedAfter']=identities();record['closedPorts']={str(p):free(p)for p in(4301,9711)}
 record['protectedPreserved']=before==record['protectedAfter'];record['elapsedSeconds']=time.monotonic()-started
 record['complete']=record['complete']and record['protectedPreserved']and all(record['closedPorts'].values())
 (W/'owner.json').write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps(record));raise SystemExit(0 if record['complete']else 1)
