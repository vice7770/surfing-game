import assert from 'node:assert/strict';
import { serialize } from 'node:v8';
import { isDeepStrictEqual } from 'node:util';
import { mkdirSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { Quaternion, Vector3 } from 'three';
import { it } from 'vitest';
import { AttachedRider } from '../source/src/physics/AttachedRider';
import { BoardBody } from '../source/src/physics/BoardBody';
import { PlaneWater } from '../source/src/physics/PlaneWater';
import { AttachedRider as OracleRider } from '/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/AttachedRider';
import { BoardBody as OracleBoard } from '/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/BoardBody';
import { PlaneWater as OracleWater } from '/private/tmp/tube-board-rhs-components-native-20261005/source/src/physics/PlaneWater';
import oracleFields from '/private/tmp/tube-board-rhs-components-native-20261005/observer-fields.json';
import fields from '../observer-fields.json';

function equalWords(actual: unknown, expected: unknown, label: string) {
 const equal = isDeepStrictEqual(actual, expected);
 if (!equal) {
  const differences: unknown[] = [];
  function diff(a: unknown, b: unknown, path: string): void {
   if (differences.length >= 40 || Object.is(a,b)) return;
   if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) { differences.push({path,actual:a,expected:b}); return; }
   const ak=Reflect.ownKeys(a),bk=Reflect.ownKeys(b);
   if (!isDeepStrictEqual(ak,bk)) differences.push({path:path+'.keys',actual:ak,expected:bk});
   for (const k of ak) diff((a as Record<string,unknown>)[String(k)],(b as Record<string,unknown>)[String(k)],path+'.'+String(k));
  }
  diff(actual,expected,'$');
  const id=label.replace(/[^a-zA-Z0-9]+/g,'-');
  // Root may supply a fresh absolute output directory; success has no filesystem side effect.
  const failureRoot=process.env.BOARD_WATER_PATCH_FAILURE_DIR;
  if (failureRoot) {
   assert(isAbsolute(failureRoot),'failure artifact directory must be absolute');
   mkdirSync(failureRoot,{recursive:true});
   writeFileSync(join(failureRoot,id+'-actual.bin'),serialize(actual));
   writeFileSync(join(failureRoot,id+'-expected.bin'),serialize(expected));
   writeFileSync(join(failureRoot,id+'-differences.json'),JSON.stringify({label,differences},null,2)+'\n');
  }
 }
 assert(equal,label);
}
const DT = 1 / 60, YAW = 0.23362283028731087;
const marker = 'standingTrialAvailable';
const added = new Set(fields.newFields);
const componentFields = oracleFields.newFields;
assert.deepEqual(fields.oldFields, oracleFields.allFields, 'exact 143-field oracle schema');
assert.equal(fields.oldFields.length,143); assert.equal(added.size,1922);
assert(fields.oldFields.includes(marker)); assert(!added.has(marker));
assert.equal(fields.availabilityMarker,marker);
assert.equal(fields.patchCount,48); assert.equal(fields.patchOperandArguments.length,40);
assert.deepEqual(fields.scopeFields,['waterPatchCount','waterPatchScopeAvailable']);
assert(fields.newFields.every(key=>!fields.oldFields.includes(key)));
assert.deepEqual(fields.allFields,[...fields.oldFields,...fields.newFields]);
assert.equal(fields.allFields.length,2065);
assert.deepEqual(fields.patchFields.map(patch=>patch.index),Array.from({length:48},(_,i)=>i));
assert(fields.patchFields.every(patch=>patch.fields.length===40));
assert.deepEqual(fields.newFields,[...fields.scopeFields,...fields.patchFields.flatMap(patch=>patch.fields)]);
assert.equal(componentFields.length,41,'existing aggregate helper remains part of exact143 oracle');
const calls = new WeakMap<object, unknown[]>();

// Capture the actual query/reaction order in external test storage. No own physics/water state is excluded for instrumentation.
class ObservedWater extends PlaneWater {
  override sampleAt(...args: Parameters<PlaneWater['sampleAt']>) {
    calls.get(this)!.push(['sampleAt-entry', args[0], args[1], args[2]]);
    const out = super.sampleAt(...args);
    calls.get(this)!.push(['sampleAt-return', ownWords(out)]);
    return out;
  }
  override surfaceAt(...args: Parameters<PlaneWater['surfaceAt']>) {
    calls.get(this)!.push(['surfaceAt', ...args]);
    return super.surfaceAt(...args);
  }
  override addReaction(...args: Parameters<PlaneWater['addReaction']>) {
    calls.get(this)!.push(['addReaction', ...args]);
    return super.addReaction(...args);
  }
}
class RecordedOracleWater extends OracleWater {
  override sampleAt(...args: Parameters<OracleWater['sampleAt']>) {
    calls.get(this)!.push(['sampleAt-entry', args[0], args[1], args[2]]);
    const out = super.sampleAt(...args);
    calls.get(this)!.push(['sampleAt-return', ownWords(out)]);
    return out;
  }
  override surfaceAt(...args: Parameters<OracleWater['surfaceAt']>) {
    calls.get(this)!.push(['surfaceAt', ...args]);
    return super.surfaceAt(...args);
  }
  override addReaction(...args: Parameters<OracleWater['addReaction']>) {
    calls.get(this)!.push(['addReaction', ...args]);
    return super.addReaction(...args);
  }
}

function pair(oracle: boolean, angle: number, speed: number) {
  const board = oracle ? new OracleBoard() : new BoardBody();
  const yaw = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), YAW);
  const q = yaw.multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), angle));
  board.place(new Vector3(0, board.shape.centerOfMass.y * Math.cos(angle), 0), q);
  const rider = oracle ? new OracleRider(board.shape, { phase: 'prone' }) : new AttachedRider(board.shape, { phase: 'prone' });
  if (board instanceof OracleBoard && rider instanceof OracleRider) board.attach(rider);
  else if (board instanceof BoardBody && rider instanceof AttachedRider) board.attach(rider);
  else throw new Error('fixture nominal class mismatch');
  const options = { slopeX: -Math.tan(angle) * Math.sin(YAW), slopeZ: -Math.tan(angle) * Math.cos(YAW) };
  const water = oracle ? new RecordedOracleWater(options) : new ObservedWater(options);
  calls.set(water, []);
  const direction = new Vector3(0, -Math.sin(angle), Math.cos(angle))
    .applyQuaternion(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), YAW));
  const tow = () => {
    if (angle === 0) {
      // Retained flat study: horizontal tow leaves the vertical velocity free.
      board.velocity.x = direction.x * speed; board.velocity.z = direction.z * speed;
      rider.velocity.x = direction.x * speed; rider.velocity.z = direction.z * speed;
    } else { board.velocity.copy(direction).multiplyScalar(speed); rider.velocity.copy(board.velocity); }
  };
  return { board, rider, water, tow };
}
type Pair = ReturnType<typeof pair>;

/** All own data, including private scratches, descriptors, typed bytes, sets/maps, cycles and alias identity. */
function ownWords(root: unknown, filterAdditions = false): unknown {
  const seen = new Map<object, number>();
  const symbols = new Map<symbol, number>();
  const symbol = (s: symbol) => {
    if (!symbols.has(s)) symbols.set(s, symbols.size);
    return { symbol: symbols.get(s), global: Symbol.keyFor(s), description: s.description };
  };
  const walk = (value: unknown): unknown => {
    if (typeof value === 'symbol') return symbol(value);
    if ((typeof value !== 'object' || value === null) && typeof value !== 'function') return value;
    const object = value as object;
    if (seen.has(object)) return { ref: seen.get(object) };
    const id = seen.size; seen.set(object, id);
    // Only full old143 observer records may omit the exact1922 additions.
    // landingDemand, its marker, all old143 and every unrelated own field remain present.
    const observer = filterAdditions && fields.oldFields.every(key => Object.prototype.hasOwnProperty.call(object, key));
    const properties = Reflect.ownKeys(object)
      .filter(key => !(observer && typeof key === 'string' && added.has(key)))
      .filter(key => !(ArrayBuffer.isView(object) && typeof key === 'string' && /^(0|[1-9]\d*)$/.test(key)))
      .map(key => {
        const d = Object.getOwnPropertyDescriptor(object, key)!;
        return 'value' in d
          ? [typeof key === 'symbol' ? symbol(key) : key, d.enumerable, d.configurable, d.writable, walk(d.value)]
          : [typeof key === 'symbol' ? symbol(key) : key, d.enumerable, d.configurable, d.get?.toString(), d.set?.toString()];
      });
    if (ArrayBuffer.isView(object)) {
      return { id, kind: object.constructor.name, offset: object.byteOffset, length: object.byteLength,
        bytes: Array.from(new Uint8Array(object.buffer, object.byteOffset, object.byteLength)), buffer: walk(object.buffer), properties };
    }
    if (object instanceof ArrayBuffer) return { id, kind: 'ArrayBuffer', bytes: Array.from(new Uint8Array(object)), properties };
    if (object instanceof Set) return { id, kind: 'Set', entries: Array.from(object, walk), properties };
    if (object instanceof Map) return { id, kind: 'Map', entries: Array.from(object, ([k, v]) => [walk(k), walk(v)]), properties };
    if (typeof value === 'function') return { id, kind: 'function', source: Function.prototype.toString.call(value), properties };
    return { id, kind: Array.isArray(value) ? 'Array' : 'Object', properties };
  };
  return walk(root);
}
function state(p: Pair, filterAdditions = true) {
  // Keep board.rider too: the graph serializer handles the real shared reference rather than dropping it.
  return ownWords({ board: p.board, rider: p.rider, water: p.water, diagnostics: p.rider.readContactDiagnostics() }, filterAdditions);
}

type VectorWords = { x: number; y: number; z: number };
type LiveOperands = {
  boardVelocity: VectorWords; boardSpin: VectorWords; external: VectorWords; arm: VectorWords; carried: VectorWords;
  landingDemand: Record<string, number>;
};
type Hook = {
  pair: Pair; candidate: boolean; events: unknown[]; componentCalls: number;
  pendingComponents: Record<string,number> | null;
  trialComponents: Record<string,number> | null;
  oldMassBefore: number[] | null; leafPatchCalls: number; patchCalls: number; leafBeginCalls: number;
  pendingPatches: Array<{ fields: Record<string,number>; args: number[] }>;
};
const hooks = new WeakMap<object, Hook>();
type LiveBoard = {
  count: number; previousAddedMass: Float64Array;
  addedMass: Float64Array; entrained: Float64Array; radiation: Float64Array;
  surfaceSpeed: Float64Array; surfaceNormal: Float64Array;
  arm: Float64Array; normal: Float64Array; point: Float64Array;
  relative: VectorWords; samples: Array<{ flowX:number;flowY:number;flowZ:number;surfaceY:number;slopeX:number;slopeZ:number;normalX:number;normalY:number;normalZ:number;waterDepth:number }>;
  force: { wettedArea:number;deckWettedArea:number };
  addedMassPerArea: Float64Array; radiationPerArea: Float64Array;
};
type HookablePrototype = {
  prepare(h: number, board: unknown, water: unknown): void;
  coupleStanding(system: Float64Array, rhs: Float64Array, h: number): void;
  settleStanding(x: Float64Array, h: number, board: unknown): boolean;
  finish(h: number, board: unknown): void;
  observeBoardRhsComponents: (...args: number[]) => void;
  beginBoardWaterPatchObservation?: (count:number) => void;
  observeBoardWaterPatch?: (...args: number[]) => void;
};
function checkCopies(rider: object, expected: Record<string, number>, expectedMarker: number) {
  const actual = (rider as LiveOperands).landingDemand;
  for (const [name, value] of Object.entries(expected)) assert.equal(actual[name], value, name);
  assert.equal(actual[marker], expectedMarker);
}
function checkPatchCopies(rider: object, hook: Hook) {
  const actual=(rider as LiveOperands).landingDemand;
  assert.equal(actual.waterPatchCount,48); assert.equal(actual.waterPatchScopeAvailable,1);
  assert.equal(hook.leafPatchCalls,48,'all48 copies precede prepare/coupling');
  for (const patch of hook.pendingPatches) for (const [name,value] of Object.entries(patch.fields)) assert.equal(actual[name],value,name);
}
function capturePre(rider: object, system: Float64Array, rhs: Float64Array) {
  const out: Record<string, number> = {};
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) out[`boardPreMatrix${i}${j}`] = system[i * 8 + j];
  for (let i = 0; i < 6; i++) out[`boardPreRhs${i}`] = rhs[i];
  const r = rider as LiveOperands;
  for (const [prefix, v] of [
    ['preparedBoardVelocity', r.boardVelocity], ['preparedBoardSpin', r.boardSpin], ['riderExternal', r.external],
    ['forceArm', r.arm], ['carriedArm', r.carried],
  ] as const) for (const axis of ['x', 'y', 'z'] as const) out[prefix + axis.toUpperCase()] = v[axis];
  return out;
}
function captureTrial(x: Float64Array) {
  const out: Record<string, number> = {};
  for (const [prefix, offset] of [['trialBoardDeltaVelocity', 0], ['trialBoardDeltaSpin', 3]] as const) {
    for (let i = 0; i < 3; i++) out[prefix + 'XYZ'[i]] = x[offset + i];
  }
  return out;
}
function installBoardHook(prototype: object) {
  const p=prototype as {substep(h:number,water:unknown):void}; const original=p.substep;
  p.substep=function(h,water) {
    const pairHook=hooks.get((this as unknown as {rider:object}).rider);
    if (!pairHook) return original.call(this,h,water);
    const board=this as unknown as LiveBoard;
    pairHook.oldMassBefore=Array.from(board.previousAddedMass);
    pairHook.leafPatchCalls=0; pairHook.leafBeginCalls=0; pairHook.pendingPatches=[];
    const attached=(this as unknown as {rider:{attached:boolean}}).rider.attached;
    original.call(this,h,water);
    if (pairHook.candidate) {
      assert.equal(pairHook.leafBeginCalls,1,'one scope reset per hull leaf');
      assert.equal(pairHook.leafPatchCalls,attached?48:0,'one ordered copy per patch in each attached leaf');
      assert.equal((pairHook.pair.rider as unknown as LiveOperands).landingDemand.waterPatchScopeAvailable,attached?1:0);
    }
    pairHook.oldMassBefore=null;
  };
  return ()=>{p.substep=original;};
}
function installHooks(prototype: object) {
  const p = prototype as HookablePrototype;
  const { prepare, coupleStanding, settleStanding, finish, observeBoardRhsComponents, observeBoardWaterPatch, beginBoardWaterPatchObservation } = p;
  // All instrumentation is on prototypes or external WeakMaps, never own physics state.
  if (beginBoardWaterPatchObservation) p.beginBoardWaterPatchObservation=function(count) {
    const hook=hooks.get(this)!; assert(hook.candidate); assert.equal(hook.leafBeginCalls,0);
    const observer=(this as unknown as LiveOperands).landingDemand;
    const oldWords=fields.oldFields.map(name=>observer[name]);
    beginBoardWaterPatchObservation.call(this,count);
    fields.oldFields.forEach((name,i)=>assert.equal(observer[name],oldWords[i],name+': begin preserves old143'));
    assert.equal(observer.waterPatchCount,count); assert.equal(observer.waterPatchScopeAvailable,0);
    hook.leafBeginCalls++;
  };
  if (observeBoardWaterPatch) p.observeBoardWaterPatch=function(...args) {
    const hook=hooks.get(this)!;
    assert(hook.candidate); assert.equal(args.length,42);
    assert(args.every(value=>typeof value==='number' && Number.isFinite(value)),'finite primitive patch inputs');
    const [count,k,...values]=args;
    assert.equal(count,48); assert.equal(k,hook.leafPatchCalls,'ordered once per patch');
    assert(hook.oldMassBefore);
    const board=hook.pair.board as unknown as LiveBoard;
    const bySuffix=Object.fromEntries(fields.patchOperandArguments.map((argument,i)=>[argument.suffix,values[i]]));
    // Independent before-assembly snapshot validates the old value lost at overwrite.
    assert.equal(bySuffix.OldAddedMass,hook.oldMassBefore[k]);
    for (const [suffix,buffer] of [['AddedMass',board.addedMass],['EntrainedMass',board.entrained],['Radiation',board.radiation],['IntoSurface',board.surfaceSpeed],['AddedMassPerArea',board.addedMassPerArea],['RadiationPerArea',board.radiationPerArea]] as const) assert.equal(bySuffix[suffix],buffer[k],suffix);
    assert.equal(bySuffix.WettedArea,board.force.wettedArea);
    assert.equal(bySuffix.DeckWettedArea,board.force.deckWettedArea);
    for (const [prefix,buffer] of [['Nu',board.surfaceNormal],['Arm',board.arm],['Normal',board.normal],['Position',board.point]] as const) for(let axis=0;axis<3;axis++) assert.equal(bySuffix[prefix+'XYZ'[axis]],buffer[k*3+axis]);
    for(const axis of ['x','y','z'] as const) assert.equal(bySuffix['Relative'+axis.toUpperCase()],board.relative[axis]);
    const sample=board.samples[k];
    for(const [suffix,key] of [['FlowX','flowX'],['FlowY','flowY'],['FlowZ','flowZ'],['SurfaceY','surfaceY'],['SlopeX','slopeX'],['SlopeZ','slopeZ'],['SampleNormalX','normalX'],['SampleNormalY','normalY'],['SampleNormalZ','normalZ'],['WaterDepth','waterDepth']] as const) assert.equal(bySuffix[suffix],sample[key]);
    const copied:Record<string,number>={}; fields.patchFields[k].fields.forEach((name,i)=>{copied[name]=values[i];});
    const oldMarker=(this as unknown as LiveOperands).landingDemand[marker];
    assert.equal((this as unknown as LiveOperands).landingDemand.waterPatchScopeAvailable,0,'incomplete48 payload stays unavailable');
    observeBoardWaterPatch.apply(this,args);
    checkCopies(this,copied,oldMarker); // No change to the original trial marker before prepare.
    assert.equal((this as unknown as LiveOperands).landingDemand.waterPatchCount,count);
    assert.equal((this as unknown as LiveOperands).landingDemand.waterPatchScopeAvailable,k===47?1:0);
    hook.pendingPatches.push({fields:copied,args:args.slice()}); hook.leafPatchCalls++; hook.patchCalls++;
  };
  p.prepare = function (h, board, water) {
    const hook = hooks.get(this)!;
    assert.equal(hook.pendingComponents,null); assert.equal(hook.trialComponents,null);
    if(hook.candidate) checkPatchCopies(this,hook);
    prepare.call(this, h, board, water);
    assert.equal((this as unknown as LiveOperands).landingDemand[marker], 0);
  };
  p.observeBoardRhsComponents = function (...args) {
    const hook = hooks.get(this)!;
    assert.equal(hook.pendingComponents,null); assert.equal(args.length,41);
    assert(args.every(value=>typeof value==='number'));
    assert.equal((this as unknown as LiveOperands).landingDemand[marker],0);
    const copied: Record<string,number> = {}; componentFields.forEach((name,i)=>{copied[name]=args[i];});
    hook.events.push(['existing-components-entry',args.slice()]);
    observeBoardRhsComponents.apply(this,args); checkCopies(this,copied,0);
    hook.pendingComponents=copied; hook.componentCalls++;
  };
  p.coupleStanding = function (system, rhs, h) {
    const hook = hooks.get(this)!; const copied = capturePre(this, system, rhs);
    hook.events.push(['coupleStanding-entry', h, copied]);
    assert(hook.pendingComponents); checkCopies(this,hook.pendingComponents,0);
    hook.trialComponents=hook.pendingComponents; hook.pendingComponents=null;
    if(hook.candidate) checkPatchCopies(this,hook);
    coupleStanding.call(this, system, rhs, h); checkCopies(this, copied, 0);
  };
  p.settleStanding = function (x, h, board) {
    const hook = hooks.get(this)!; const copied = captureTrial(x);
    hook.events.push(['settleStanding-entry', h, copied]);
    const feasible = settleStanding.call(this, x, h, board); checkCopies(this, copied, 1);
    assert(hook.trialComponents); checkCopies(this,hook.trialComponents,1); hook.trialComponents=null;
    if(hook.candidate) checkPatchCopies(this,hook);
    hook.events.push(['settleStanding-return', feasible]); return feasible;
  };
  p.finish = function (h, board) {
    finish.call(this, h, board); const hook = hooks.get(this)!;
    hook.events.push(['finish-substep-exit', h, state(hook.pair), calls.get(hook.pair.water)!.length]);
  };
  return () => {
    p.prepare=prepare; p.coupleStanding=coupleStanding; p.settleStanding=settleStanding; p.finish=finish; p.observeBoardRhsComponents=observeBoardRhsComponents;
    if(observeBoardWaterPatch) p.observeBoardWaterPatch=observeBoardWaterPatch;
    if(beginBoardWaterPatchObservation) p.beginBoardWaterPatchObservation=beginBoardWaterPatchObservation;
  };
}

function detachedDiagnostics(p: Pair, label: string) {
  const before = state(p, false);
  const diagnosticBefore = ownWords(p.rider.readContactDiagnostics());
  const d = p.rider.readContactDiagnostics();
  const samples = [d.last, d.firstLimited, d.firstNonContact, d.loss?.sample];
  for (const sample of samples) if (sample) {
    for (const name of fields.newFields) assert(Number.isFinite((sample as unknown as Record<string,number>)[name]),name+': finite new diagnostic word');
    for (const [key, value] of Object.entries(sample)) if (typeof value === 'number') {
      (sample as unknown as Record<string, unknown>)[key] = -123456;
    }
  }
  d.step = -1;
  equalWords(ownWords(p.rider.readContactDiagnostics()), diagnosticBefore, label+': detached diagnostic words');
  equalWords(state(p, false), before, label+': full candidate state after detached mutation');
}

for (const fixture of [
  { name: 'existing flat towed 6 m/s pop-up study', angle: 0, speed: 6, continueTow: true },
  { name: 'fixed 15-degree face released from 9.2 m/s tow at pop-up', angle: Math.PI / 12, speed: 9.2, continueTow: false },
]) it(fixture.name + ': exact 143-field state, query/reaction order and independently copied water-patch stages', () => {
  assert.equal(typeof (OracleRider.prototype as unknown as HookablePrototype).observeBoardRhsComponents,'function');
  assert.equal(typeof (OracleRider.prototype as unknown as HookablePrototype).observeBoardWaterPatch,'undefined');
  assert.equal(typeof (AttachedRider.prototype as unknown as HookablePrototype).observeBoardWaterPatch,'function');
  assert.equal(typeof (AttachedRider.prototype as unknown as HookablePrototype).observeBoardRhsComponents,'function');
  const restoreOracle = installHooks(OracleRider.prototype), restoreCandidate = installHooks(AttachedRider.prototype);
  const restoreOracleBoard=installBoardHook(OracleBoard.prototype), restoreCandidateBoard=installBoardHook(BoardBody.prototype);
  try {
    const old = pair(true, fixture.angle, fixture.speed), candidate = pair(false, fixture.angle, fixture.speed);
    const oldHook: Hook = { pair: old, candidate: false, events: [], componentCalls:0, pendingComponents:null, trialComponents:null, oldMassBefore:null,leafPatchCalls:0,patchCalls:0,leafBeginCalls:0,pendingPatches:[] };
    const candidateHook: Hook = { pair: candidate, candidate: true, events: [], componentCalls:0, pendingComponents:null, trialComponents:null, oldMassBefore:null,leafPatchCalls:0,patchCalls:0,leafBeginCalls:0,pendingPatches:[] };
    hooks.set(old.rider, oldHook); hooks.set(candidate.rider, candidateHook);
    let capturedStandingTrials = 0;
    for (let step = 1; step <= 276; step++) {
      oldHook.events.length = 0; candidateHook.events.length = 0;
      calls.get(old.water)!.length = 0; calls.get(candidate.water)!.length = 0;
      for (const p of [old, candidate]) {
        if (step <= 180 || fixture.continueTow) p.tow();
        if (step === 181) assert.equal(p.rider.popUp(), true);
        p.board.step(DT, p.water);
      }
      equalWords(state(candidate), state(old), `${fixture.name}: all original own words at step ${step}`);
      equalWords(candidateHook.events, oldHook.events, `${fixture.name}: stage scalars and complete finish-substep words at step ${step}`);
      equalWords(calls.get(candidate.water), calls.get(old.water), `${fixture.name}: ordered water query/return/reaction calls at step ${step}`);
      capturedStandingTrials += candidateHook.events.filter(event => (event as unknown[])[0] === 'settleStanding-entry').length;
      assert.equal(candidateHook.componentCalls,capturedStandingTrials,'one existing component copy per captured standing trial');
      assert.equal(oldHook.componentCalls,capturedStandingTrials);
      assert.equal(candidateHook.patchCalls % 48,0,'complete patch sets');
      assert.equal(candidateHook.pendingComponents,null); assert.equal(candidateHook.trialComponents,null);
      // Test detachedness for all old143 and new1922 in every returned sample/latch.
      detachedDiagnostics(candidate,`${fixture.name}: step ${step}`);
      if (step % 60 === 0 || step === 276) process.stderr.write(JSON.stringify({fixture: fixture.name, step, capturedStandingTrials}) + '\n');
    }
    assert(capturedStandingTrials > 0);
    // A count outside the finite48 scope must invalidate only the new payload.
    // This is a diagnostic guard contract, not another physics trajectory.
    const oldState=state(candidate), oldMarker=(candidate.rider as unknown as LiveOperands).landingDemand[marker];
    const beforePatchWords=fields.patchFields.flatMap(patch=>patch.fields).map(name=>(candidate.rider as unknown as LiveOperands).landingDemand[name]);
    const oldWaterCalls=ownWords(calls.get(candidate.water));
    const method=(AttachedRider.prototype as unknown as HookablePrototype).observeBoardWaterPatch!;
    // Bypass the test's default48 hook to exercise the unchanged passive method.
    restoreCandidate();
    const passiveMethod=(AttachedRider.prototype as unknown as HookablePrototype).observeBoardWaterPatch!;
    assert.notEqual(passiveMethod,method);
    passiveMethod.apply(candidate.rider,[47,0,...Array(40).fill(0)]);
    assert.equal((candidate.rider as unknown as LiveOperands).landingDemand.waterPatchCount,47);
    assert.equal((candidate.rider as unknown as LiveOperands).landingDemand.waterPatchScopeAvailable,0);
    assert.equal((candidate.rider as unknown as LiveOperands).landingDemand[marker],oldMarker);
    equalWords(fields.patchFields.flatMap(patch=>patch.fields).map(name=>(candidate.rider as unknown as LiveOperands).landingDemand[name]),beforePatchWords,'invalid scope retains finite stale words');
    equalWords(state(candidate),oldState,'invalid scope preserves all original143/private words');
    equalWords(ownWords(calls.get(candidate.water)),oldWaterCalls,'invalid scope makes no water calls');
  } finally { restoreCandidateBoard(); restoreOracleBoard(); restoreCandidate(); restoreOracle(); }
}, 180000);
