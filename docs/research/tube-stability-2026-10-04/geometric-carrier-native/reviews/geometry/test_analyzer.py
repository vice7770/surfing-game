"""In-memory synthetic unit fixtures only; no native snapshot data invented or mutated."""
import base64,copy,json,unittest
import numpy as np
import analyze_loft as a

def fixture(big=False):
 ns=2;nv=ns*a.SAMPLES;p=np.zeros((nv,3),dtype=np.float32)
 for s in range(ns):
  for j in range(a.SAMPLES):p[s*a.SAMPLES+j]=[s,0,j/100]
 ids=[]
 for j in range(a.SAMPLES-1):v=j;w=v+a.SAMPLES;ids.extend([v,w,v+1,v+1,w,w+1])
 arrays={k:np.zeros(mult*nv,dtype=np.float32) for k,mult in a.VERTEX.items()};arrays['positions']=p.ravel();arrays['normals']=np.tile([0,1,0],nv).astype(np.float32);arrays['indices']=np.array(ids,dtype=np.uint32)
 arrays.update({k:np.ones(ns,dtype=np.float32) for k in ['sliceRayZ','sliceWeight','sliceSigma','sliceTau']});arrays['sliceSigma'][0]=0
 arrays.update({k:np.zeros(ns,dtype=np.uint8) for k in ['slicePhase','sliceOverturned']});arrays['sliceJoined']=np.array([1,0],dtype=np.uint8);arrays['sliceRayX']=np.zeros(ns,dtype=np.float32);arrays['sliceFront']=np.array([7,7],dtype=np.int32)
 typed={};total=0
 for k,v in arrays.items():
  name={'f':'Float32Array','u':'Uint32Array' if v.itemsize==4 else 'Uint8Array','i':'Int32Array'}[v.dtype.kind];b=v.astype(v.dtype.newbyteorder('>' if big else '<')).tobytes();total+=len(b);typed[k]={'dtype':name,'littleEndian':not big,'count':len(v),'byteLength':len(b),'encoding':'base64-exact-active-typed-array-words','data':base64.b64encode(b).decode()}
 return {'schema':'bounded-C-complete-drawn-loft-words/v1','available':True,'unusedCapacityIncluded':False,'arrayIdentitiesAndWordsUnchanged':True,'counts':{'slices':ns,'vertices':nv,'indices':len(ids)},'rawBytes':total,'arrays':typed}
class Tests(unittest.TestCase):
 def test_exact_decode_endian(self):
  left=a.decode(fixture());right=a.decode(fixture(True));self.assertTrue(np.array_equal(left['p'],right['p']));self.assertTrue(np.array_equal(left['ids'],right['ids']))
 def test_bounds_active_words(self):
  s=fixture();s['arrays']['positions']['count']+=1
  with self.assertRaisesRegex(ValueError,'count mismatch'):a.decode(s)
  s=fixture();s['rawBytes']+=1
  with self.assertRaisesRegex(ValueError,'size mismatch'):a.decode(s)
  s=fixture();s['counts']['vertices']+=1
  with self.assertRaisesRegex(ValueError,'source134'):a.decode(s)
 def test_source_indices_normals_convention(self):
  g=a.decode(fixture());self.assertTrue(a.source_index_check(g)['exactSourceCIndexSequence']);self.assertEqual(a.normal_check(g)['f32WordDifferencesFromSourceReconstruction'],0);w,face,area,cos=a.winding(g);self.assertTrue(np.all(cos==-1));g['ids'][0]+=1
  with self.assertRaisesRegex(ValueError,'Indices differ'):a.source_index_check(g)
 def test_actual_triangle_diagonal_preserved(self):
  g=a.decode(fixture());j=10;g['p'][j]=[0,0,0];g['p'][j+1]=[0,0,1];g['p'][j+a.SAMPLES]=[1,1,0];g['p'][j+1+a.SAMPLES]=[1,0,1]
  q=a.plane_sections(g,.5,7);parts=[x for x in q['segments'] if x['triangle'] in [20,21]];self.assertEqual(len(parts),2)
  self.assertTrue(any(np.array_equal(p,[.5,.5,.5]) for k in parts for p in k['points']))
 def test_exact_first_hit_band_component_segment(self):
  g=a.decode(fixture());hit=a.first_hit(g,[.3,1,.815],[.3,-1,.815])['firstHit'];self.assertIsNotNone(hit);self.assertEqual(hit['fraction'],.5);self.assertEqual(hit['contourBand'],'lip-return-underside');self.assertEqual(hit['fronts'],[7,7,7]);self.assertEqual(a.first_hit(g,[.3,1,.815],[.3,.1,.815])['firstHit'],None)
 def test_source_half_open_vertical_crossing_and_slope(self):
  g={'p':np.array([[0,1,0],[1,1,0],[0,2,1]],dtype=float),'tri':np.array([[0,1,2]]),'a':{'sliceFront':np.array([7])}}
  c=a.vertical_crossings(g,.2,.3,[0]);self.assertEqual(len(c),1);self.assertAlmostEqual(c[0]['height'],1.3);self.assertEqual(c[0]['dYdZ'],1)
 def test_cavity_span_height_and_collapsed_roof(self):
  p=np.array([q for h in [0,2,3] for q in [[0,h,0],[1,h,0],[0,h,1]]],dtype=float)
  g={'p':p,'tri':np.array([[0,1,2],[3,4,5],[6,7,8]]),'a':{'sliceFront':np.array([7])}}
  sec=a.plane_sections(g,.25,7);sec['properNonadjacentSegmentCrossings']=a.proper_section_crossings(sec);c=a.cavity(g,sec,[.25,1,.25]);reg=c['selectedEyeConnectedRegion'];self.assertTrue(c['recordedEyeStrictlyInAir']);self.assertEqual(reg['horizontalSpan'],.75);self.assertEqual(reg['maximumAirHeight'],2)
  g['p'][6:,1]=2;sec=a.plane_sections(g,.25,7);sec['properNonadjacentSegmentCrossings']=a.proper_section_crossings(sec);c=a.cavity(g,sec,[.25,1,.25]);self.assertFalse(c['recordedEyeStrictlyInAir']);self.assertIsNone(c['selectedEyeConnectedRegion'])
 def test_proper_section_crossing_excludes_shared_endpoints(self):
  sec={'segments':[{'triangle':0,'band':'outer-roof','points':[[0,0,0],[0,1,1]]},{'triangle':1,'band':'inner-face-floor','points':[[0,1,0],[0,0,1]]},{'triangle':2,'band':'outer-roof','points':[[0,1,1],[0,2,2]]}]}
  hits=a.proper_section_crossings(sec);self.assertEqual(len(hits),1);self.assertTrue(np.array_equal(hits[0]['worldZY'],[.5,.5]))
 def test_unique_station_and_limited_geometry(self):
  g=a.decode(fixture());self.assertEqual(a.station_bracket(g,7,.3),{'a':0,'b':1,'t':.3})
  with self.assertRaisesRegex(ValueError,'Unique'):a.station_bracket(g,8,.3)
  with self.assertRaisesRegex(ValueError,'Unique'):a.station_bracket(g,7,1.1)
if __name__=='__main__':unittest.main()
