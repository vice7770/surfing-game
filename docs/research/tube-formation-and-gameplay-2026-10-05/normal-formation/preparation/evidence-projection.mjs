// Source-only preparation. This factory is self-contained for browser serialization.
export function createProductionEvidenceProjection() {
  const limits = Object.freeze({ maxRows: 7201, compactRowBytes: 3440, maxEvents: 6,
    fullEventBytes: 256 * 1024, reportBytes: 32 * 1024 * 1024, traceBytes: 24 * 1024 * 1024,
    checkpointBytes: 512 * 1024, headerReserveBytes: 512 * 1024,
    metadataReserveBytes: 7 * 512 * 1024 });
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const fail = m => { throw Error('Production evidence: ' + m); };
  const object = (v, name) => {
    if (!v || typeof v !== 'object' || Array.isArray(v) || ArrayBuffer.isView(v)) fail(name + ' must be a data object');
    return v;
  };
  const data = (o, k) => {
    const d = Object.getOwnPropertyDescriptor(o, k);
    if (d && !own(d, 'value')) fail('Accessor cannot be evidence: ' + k);
    return d;
  };
  const fresh = () => Object.create(null);
  function mark(out, key, state) { (out.$availability ??= fresh())[key] = state; }
  function primitive(out, key, descriptor) {
    if (!descriptor) { out[key] = null; mark(out, key, 'absent'); return; }
    const v = descriptor.value;
    if (v === undefined) { out[key] = null; mark(out, key, 'undefined'); return; }
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) { out[key] = null; mark(out, key, Number.isNaN(v) ? 'NaN' : v > 0 ? '+Infinity' : '-Infinity'); }
      else if (Object.is(v, -0)) { out[key] = 0; mark(out, key, '-0'); }
      else out[key] = v;
    } else if (v === null || typeof v === 'boolean') out[key] = v;
    else if (typeof v === 'string' && v.length <= 128) out[key] = v;
    else fail('Unsupported or oversized primitive: ' + key);
  }
  function fields(source, keys, name) {
    object(source, name); const out = fresh();
    for (const key of keys) primitive(out, key, data(source, key));
    return out;
  }
  function section(out, key, source, project) {
    const d = data(source, key);
    if (!d || d.value === undefined || d.value === null) primitive(out, key, d);
    else out[key] = project(d.value);
  }
  function count(out, key, maximum, name) {
    if (!Number.isSafeInteger(out[key]) || out[key] < 0 || out[key] > maximum) fail('Invalid bounded count: ' + name);
  }
  const waveFields = ['valid', 'directionX', 'directionZ', 'aheadOfCrest', 'crestSpeed', 'faceHeight',
    'faceFraction', 'crestBreaking', 'curlDistance', 'curlSide', 'speedOverGround', 'speedShoreward',
    'speedAlongCrest', 'requiredSpeed'];
  function projectWave(wave) {
    object(wave, 'wave');
    for (const key of Object.keys(wave)) {
      const d = data(wave, key), v = d.value;
      if ((v === null || ['number', 'boolean', 'string', 'undefined'].includes(typeof v)) && !waveFields.includes(key))
        fail('Unrecognized own WaveFrame primitive would be omitted: ' + key);
    }
    return fields(wave, waveFields, 'wave');
  }
  function projectView(view) {
    const out = fields(view, ['peelDirection', 'focusZ', 'crestBehind'], 'inputView');
    section(out, 'board', view, v => fields(v, ['x', 'z', 'heading'], 'inputView.board'));
    const ride = data(view, 'ride');
    if (!ride || ride.value == null) {
      primitive(out, 'phase', undefined); primitive(out, 'cue', undefined);
    } else {
      object(ride.value, 'inputView.ride');
      primitive(out, 'phase', data(ride.value, 'phase')); primitive(out, 'cue', data(ride.value, 'cue'));
    }
    return out;
  }
  function projectRide(ride) {
    const out = fields(ride, ['phase', 'speed', 'boardSpeed', 'cue', 'separation', 'resets', 'balance'], 'ride');
    count(out, 'resets', Number.MAX_SAFE_INTEGER, 'ride.resets');
    section(out, 'wave', ride, projectWave);
    section(out, 'popUp', ride, p => fields(p, ['outcome', 'refusal'], 'ride.popUp'));
    return out;
  }
  function exactWords(words, count, name) {
    if (!(words instanceof Float64Array) || words.length !== count) fail(name + ' must be the exact active Float64Array view');
    for (const word of words) if (!Number.isFinite(word)) fail('Nonfinite published ' + name + ' word');
    const bytes = new Uint8Array(words.buffer, words.byteOffset, words.byteLength).slice();
    let binary = ''; for (const b of bytes) binary += String.fromCharCode(b);
    return { dtype: 'Float64Array', littleEndian: new Uint8Array(new Uint16Array([0x0102]).buffer)[0] === 2,
      encoding: 'base64-exact-active-typed-array-words', count, data: btoa(binary) };
  }
  function finiteWords(words, count, name) {
    if (!(Array.isArray(words) || ArrayBuffer.isView(words)) || words.length !== count) fail('Wrong ' + name + ' length');
    const out = Array.from(words);
    if (!out.every(Number.isFinite)) fail('Nonfinite ' + name + ' word');
    return out;
  }
  function projectInput(input) {
    object(input, 'input');
    const keys = Object.keys(input);
    if (keys.length !== 3 || !['paddle', 'popUp', 'steer'].every(k => keys.includes(k))) fail('Input differs from production line-pilot shape');
    if (typeof data(input, 'paddle').value !== 'boolean' || typeof data(input, 'popUp').value !== 'boolean' ||
        !Number.isFinite(data(input, 'steer').value)) fail('Invalid production line-pilot input');
    const out = fresh(); for (const key of keys) out[key] = data(input, key).value;
    return out;
  }
  function projectWitness(witness) {
    object(witness, 'witness'); const out = fresh();
    for (const [to, from] of [['classification', 'classification'], ['pointCount', 'pointCountInUnambiguousCavity'],
      ['commonComponents', 'commonComponentCount'], ['contained', 'sevenPublishedWitnessesAndReferenceTrunkSpheresContained']])
      primitive(out, to, data(witness, from));
    count(out, 'pointCount', 7, 'witness.pointCount'); count(out, 'commonComponents', 300, 'witness.commonComponents');
    section(out, 'component', witness, c => {
      const v = fields(c, ['front'], 'witness.component');
      if (v.front !== null) count(v, 'front', Number.MAX_SAFE_INTEGER, 'component.front');
      v.rows = finiteWords([c.firstRow, c.lastRow], 2, 'component.rows');
      for (const row of v.rows) if (!Number.isSafeInteger(row) || row < 0 || row > 300) fail('Invalid component row');
      v.sigma = finiteWords([c.sigmaMin, c.sigmaMax], 2, 'component.sigma'); return v;
    });
    const head = data(witness, 'headVertical');
    if (!head || head.value == null) primitive(out, 'headGaps', head);
    else out.headGaps = finiteWords([head.value.floorGap, head.value.roofGap], 2, 'witness.headGaps');
    return out;
  }
  function projectNear(near) {
    const out = fields(near, ['available', 'qualifies', 'front', 'horizontalDistance', 'reason'], 'nearFormed');
    if (typeof out.front === 'number') count(out, 'front', Number.MAX_SAFE_INTEGER, 'nearFormed.front'); return out;
  }
  function projectRow(raw) {
    object(raw, 'row');
    if (!Number.isSafeInteger(raw.step) || raw.step < 0 || raw.step > 7200) fail('Step outside declared 0..7200');
    const out = fields(raw, ['step', 'physicalSeconds', 'seaTime'], 'row');
    if (!Number.isFinite(out.physicalSeconds) || out.physicalSeconds < 0 || out.physicalSeconds > 120) fail('Physical seconds outside0..120');
    section(out, 'input', raw, projectInput);
    section(out, 'inputView', raw, projectView);
    section(out, 'ride', raw, projectRide);
    out.board = exactWords(raw.board, 8, 'board'); out.rider = exactWords(raw.rider, 33, 'rider');
    section(out, 'pilot', raw, p => {
      const v = fields(p, ['state', 'attempts', 'outcome', 'rideTime', 'phase'], 'pilot');
      count(v, 'attempts', 1, 'pilot.attempts');
      if (!Number.isFinite(v.rideTime) || v.rideTime < 0 || v.rideTime > 120) fail('Pilot ride time outside0..120'); return v;
    });
    section(out, 'clocks', raw, c => {
      const v = fields(c, ['workerSeaTime', 'visualClock', 'waterTime', 'surfaceRevision'], 'clocks');
      count(v, 'surfaceRevision', Number.MAX_SAFE_INTEGER, 'clocks.surfaceRevision'); return v;
    });
    section(out, 'camera', raw, c => ({ position: finiteWords(c.position, 3, 'camera.position'),
      quaternion: finiteWords(c.quaternion, 4, 'camera.quaternion') }));
    section(out, 'loft', raw, l => {
      const v = fields(l, ['slices', 'vertices', 'indices'], 'loft');
      count(v, 'slices', 300, 'loft.slices'); count(v, 'vertices', 40200, 'loft.vertices'); count(v, 'indices', 240000, 'loft.indices'); return v;
    });
    section(out, 'witness', raw, projectWitness);
    section(out, 'nearFormed', raw, projectNear);
    section(out, 'detector', raw, d => fields(d, ['cumulativeMilliseconds', 'disabledReason', 'measured'], 'detector'));
    if (new TextEncoder().encode(JSON.stringify(out)).length > limits.compactRowBytes) fail('Compact row exceeds3440 byte cap');
    return out;
  }
  function cloneGraph(root) {
    let nodes = 0;
    function clone(value, depth) {
      if (++nodes > 4096 || depth > 8) fail('Contact graph structural bound');
      if (!value || typeof value !== 'object') fail('Contact graph object expected');
      if (Array.isArray(value) || ArrayBuffer.isView(value)) fail('Unexpected contact graph array');
      const keys = Object.keys(value); if (keys.length > 256) fail('Contact graph property bound');
      const out = fresh();
      for (const key of keys) {
        if (key.length > 64 || key === '$availability') fail('Unexpected contact graph key');
        const d = data(value, key), v = d.value;
        if (v !== null && typeof v === 'object') out[key] = clone(v, depth + 1);
        else primitive(out, key, d);
      }
      return out;
    }
    return clone(root, 0);
  }
  function projectEventRide(ride) {
    const out = projectRide(ride);
    primitive(out, 'bank', data(ride, 'bank'));
    section(out, 'popUp', ride, p => fields(p, ['outcome', 'refusal', 'duration', 'landingPeak', 'frontShare'], 'eventRide.popUp'));
    section(out, 'contactDiagnostics', ride, cloneGraph);
    if (new TextEncoder().encode(JSON.stringify(out)).length > limits.fullEventBytes) fail('Full event exceeds256KiB cap');
    return out;
  }
  return Object.freeze({ projectView, projectRide, projectRow, projectEventRide, limits });
}
