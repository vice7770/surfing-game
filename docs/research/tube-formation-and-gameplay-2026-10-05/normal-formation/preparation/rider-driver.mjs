// Serialized into the real application page. No startup/reset/placement/overlay control APIs.
export function installProductionRider(Autopilot, autopilotView, riderPartVolumes, createWitnessSampler, createBorrowedLoftSnapshotTools, createProductionSnapshotTools, nearestIndexedFormed, installFollowerCamera, createProductionEvidenceProjection, createMouthCameraInspection) {
  const d = window.breaklineDiagnostics, lab = window.breaklineLab, mode = d.mode, DT = 1 / 60;
  const must = (value, message) => { if (!value) throw Error(message); };
  const jsonClone = value => JSON.parse(JSON.stringify(value));
  const pilot = new Autopilot({ style: 'line' });
  const projection = createProductionEvidenceProjection();
  const measure = createWitnessSampler();
  const snapshots = createProductionSnapshotTools(createBorrowedLoftSnapshotTools);
  const mouthInspection = createMouthCameraInspection(d);
  const radii = riderPartVolumes().map(volume => Math.cbrt(3 * volume / (4 * Math.PI)));
  const follower = installFollowerCamera(d, lab, document.querySelector('#app'));
  const tide = mode.config.tide;
  must(Number.isFinite(tide), 'Actual normal config tide required');
  let steps = 0, lastInput = null, lastView = null, fullWitness = null, nearFormed = null;
  let detectorMs = 0, detectorFailure = null, measured = false, previousPhase = mode.host.snapshot.status.ride.phase;
  function raw() {
    const snapshot = mode.host.snapshot, ride = snapshot.status.ride, camera = mode.camera.camera, loft = mode.barrelLoft;
    must(ride && snapshot.board instanceof Float64Array && snapshot.rider instanceof Float64Array && snapshot.board.length >= 8 && snapshot.rider.length >= 33, 'Exact published Float64 body words required');
    return { step: steps, physicalSeconds: steps * DT, seaTime: snapshot.status.seaTime,
      input: lastInput, inputView: lastView, ride, board: snapshot.board.subarray(0, 8), rider: snapshot.rider.subarray(0, 33),
      pilot: { state: pilot.state, outcome: pilot.outcome ?? null, attempts: pilot.attempts, rideTime: pilot.rideTime, phase: pilot.phase },
      clocks: { workerSeaTime: snapshot.status.seaTime, visualClock: mode.riderState.clock, waterTime: d.water.materialUniforms.waterTime.value, surfaceRevision: d.water.surfaceRevision },
      camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray() },
      loft: loft ? { slices: loft.sliceCount, vertices: loft.vertexCount, indices: loft.indexCount } : null,
      witness: fullWitness, nearFormed, detector: { cumulativeMilliseconds: detectorMs, disabledReason: detectorFailure?.slice(0, 128) ?? null, measured } };
  }
  function current() { follower.hold(); return projection.projectRow(raw()); }
  async function step() {
    follower.hold(); must(steps < 7200 && mode.host.outstandingSteps === 0, 'Finite ordinary drained step');
    const before = mode.host.snapshot.status.seaTime, view = autopilotView(mode.host, mode.focus.z, tide);
    must(view, 'Actual production view required');
    const input = pilot.next(view, DT);
    must(Object.keys(input).sort().join(',') === 'paddle,popUp,steer' && typeof input.paddle === 'boolean' && typeof input.popUp === 'boolean' && Number.isFinite(input.steer) && Math.abs(input.steer) <= 1, 'Unmodified production line input');
    lastView = { board: { ...view.board }, peelDirection: view.peelDirection, focusZ: view.focusZ, crestBehind: view.crestBehind, ride: { phase: view.ride.phase, cue: view.ride.cue } }; lastInput = { ...input };
    const inputWords = JSON.stringify(input);
    d.step(input);
    const waitStarted = performance.now();
    while (mode.host.outstandingSteps) {
      must(performance.now() - waitStarted < 10000, 'Single worker step drain deadline');
      await new Promise(resolve => setTimeout(resolve, 2));
    }
    must(JSON.stringify(input) === inputWords, 'Public advance mutated requested input');
    must(Math.abs(mode.host.snapshot.status.seaTime - before - DT) < 1e-7, 'One-step physical clock mismatch');
    mode.update(DT); follower.certifyRender(); d.renderView(mode.camera.camera); follower.certifyRender();
    steps++; const snapshot = mode.host.snapshot, phase = snapshot.status.ride.phase;
    fullWitness = null; nearFormed = null; measured = false;
    if (phase === 'standing' && (steps % 6 === 0 || previousPhase !== 'standing') && !detectorFailure && detectorMs < 20000) {
      const begin = performance.now();
      try {
        fullWitness = measure(mode.barrelLoft, Array.from(snapshot.rider.subarray(0, 21)), radii, mode.sweptBarrel.waterAt.bind(mode.sweptBarrel));
        nearFormed = nearestIndexedFormed(mode.barrelLoft, Array.from(snapshot.board.subarray(0, 8)));
        measured = true;
      } catch (error) { detectorFailure = String(error?.stack ?? error).slice(0, 2048); }
      detectorMs += performance.now() - begin;
    }
    if (detectorMs >= 20000 && !detectorFailure) detectorFailure = '20s cumulative read-only detector budget; trajectory unchanged';
    previousPhase = phase;
    return current();
  }
  function fullSnapshot(label) {
    const snapshot = mode.host.snapshot, loft = mode.barrelLoft;
    must(loft && snapshot.front instanceof Float32Array && Number.isInteger(snapshot.frontCount) && snapshot.frontCount >= 0 && snapshot.frontCount * 9 <= snapshot.front.length, 'Bounded actual loft/front packet');
    const result = snapshots.capture(loft, label, { step: steps, seaTime: snapshot.status.seaTime, surfaceRevision: d.water.surfaceRevision, drawnWaterTime: d.water.materialUniforms.waterTime.value });
    must(result.available === true, 'Complete actual drawn loft snapshot unavailable');
    const bytes = new Uint8Array(snapshot.front.buffer, snapshot.front.byteOffset, snapshot.frontCount * 9 * 4).slice();
    must(bytes.length <= 1024 * 1024, 'Raw-front 1MiB byte cap');
    let binary = ''; for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
    result.rawFrontPacket = { dtype: 'Float32Array', littleEndian: new Uint8Array(new Uint16Array([0x0102]).buffer)[0] === 2, recordCount: snapshot.frontCount, stride: 9,
      fieldOffsets: { x: 0, z: 1, front: 2, sigma: 3, tau: 4, height: 5, depth: 6, throwZ: 7, pace: 8 }, encoding: 'base64-exact-active-typed-array-words', count: snapshot.frontCount * 9, byteLength: bytes.length, data: btoa(binary) };
    const now = new Uint8Array(snapshot.front.buffer, snapshot.front.byteOffset, bytes.length);
    must(now.every((value, i) => value === bytes[i]), 'Raw-front changed during snapshot');
    result.nonmutation = { activeLoftIdentitiesAndWordsUnchanged: result.arrayIdentitiesAndWordsUnchanged === true, rawFrontWordsUnchanged: true, publicSnapshotIdentityAndClockUnchanged: mode.host.snapshot === snapshot };
    return result;
  }
  function checkpoint(label, withLoft = false) {
    follower.hold(); must(mode.host.outstandingSteps === 0, 'Drained checkpoint');
    const snapshot = mode.host.snapshot, before = JSON.stringify(current());
    follower.certifyRender(); d.renderView(mode.camera.camera); follower.certifyRender();
    const eventRide = projection.projectEventRide(snapshot.status.ride);
    must(new TextEncoder().encode(JSON.stringify(eventRide)).length <= 256 * 1024, 'Full contact event 256KiB cap');
    const camera = mode.camera.camera;
    const result = { label, step: steps, seaTime: snapshot.status.seaTime, view: 'normal-production-follower', row: current(), fullEventRide: eventRide,
      cameraFollower: follower.current(), camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), projection: camera.projectionMatrix.toArray(), fov: camera.fov, near: camera.near, far: camera.far },
      witness: fullWitness ? jsonClone(fullWitness) : null, detectorError: detectorFailure, loftSnapshot: withLoft ? fullSnapshot(label) : null, pngDataUrl: d.canvas.toDataURL('image/png') };
    must(mode.host.snapshot === snapshot && JSON.stringify(current()) === before, 'Checkpoint changed public/current actor camera state');
    result.nonmutation = { snapshotUnchanged: true, rowUnchanged: true, activeLoftWordsUnchanged: result.loftSnapshot?.arrayIdentitiesAndWordsUnchanged ?? null };
    return result;
  }
  function inspectMouth() {
    follower.hold(); must(mode.host.outstandingSteps === 0, 'Drained camera-only inspection');
    const result = mouthInspection.inspect(); follower.certifyRender();
    if (result.available) {
      result.label = 'formed-mouth'; result.step = steps; result.seaTime = mode.host.snapshot.status.seaTime;
      result.row = current(); result.fullEventRide = projection.projectEventRide(mode.host.snapshot.status.ride);
      must(new TextEncoder().encode(JSON.stringify(result.fullEventRide)).length <= 256 * 1024, 'Mouth event 256KiB cap');
      result.loftSnapshot = fullSnapshot('formed-mouth'); result.geometryOnly = true; result.riderPassageClaim = false;
    }
    return result;
  }
  let video;
  async function beginVideo() {
    must(!video && mode.host.snapshot.status.ride.phase === 'standing', 'One actual-standing recorder only');
    must(typeof MediaRecorder === 'function' && typeof d.canvas.captureStream === 'function', 'Native canvas recording required');
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(value => MediaRecorder.isTypeSupported(value));
    must(mime, 'Native WebM required');
    const stream = d.canvas.captureStream(0), track = stream.getVideoTracks()[0];
    if (!track || typeof track.requestFrame !== 'function') { stream.getTracks().forEach(value => value.stop()); throw Error('Native manual frame request unavailable'); }
    let recorder;
    try { recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4000000 }); }
    catch (error) { stream.getTracks().forEach(value => value.stop()); throw error; }
    video = { stream, track, recorder, mime: recorder.mimeType, chunks: [], bytes: 0, requests: 0, error: null, startStep: steps, startSeaTime: mode.host.snapshot.status.seaTime, startWall: performance.now(), stopped: false, out: null };
    recorder.ondataavailable = event => {
      if (!event.data.size) return;
      if (video.bytes + event.data.size > 16 * 1024 * 1024) { video.error ??= '16MiB media cap; physics continues'; if (recorder.state === 'recording') recorder.stop(); return; }
      video.chunks.push(event.data); video.bytes += event.data.size;
    };
    recorder.onstop = () => { video.stopped = true; };
    recorder.onerror = event => { video.error ??= String(event.error ?? 'Native recorder error').slice(0, 2048); };
    let initialRequest;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(Error('5s recorder start deadline')), 5000);
      recorder.onstart = () => { clearTimeout(timer); resolve(); };
      try {
        recorder.start(500); follower.certifyRender(); d.renderView(mode.camera.camera); follower.certifyRender();
        track.requestFrame(); video.requests = 1;
        initialRequest = { request: 1, step: steps, seaTime: video.startSeaTime, requestedWallMs: performance.now(), requestedBeforeRecorderStartEvent: true };
      } catch (error) { clearTimeout(timer); reject(error); }
    });
    return { mimeType: video.mime, canvas: [d.canvas.width, d.canvas.height], startStep: steps, startSeaTime: video.startSeaTime, initialRequest, complete: false };
  }
  function videoFrame() {
    follower.hold(); must(mode.host.outstandingSteps === 0 && video, 'Drained recorder frame');
    if (video.error || video.recorder.state !== 'recording') return { requested: false, stopReason: video.error ?? 'Native recorder stopped' };
    must(steps > video.startStep && (steps - video.startStep) % 3 === 0 && steps - video.startStep <= 1200 && video.requests < 401, '20Hz /20physical-second frame schedule');
    follower.certifyRender(); d.renderView(mode.camera.camera); follower.certifyRender(); video.track.requestFrame();
    return { requested: true, request: ++video.requests, step: steps, seaTime: mode.host.snapshot.status.seaTime, requestedWallMs: performance.now() };
  }
  async function finishVideo() {
    must(video, 'No recorder to finish');
    if (video.recorder.state !== 'inactive') {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(Error('8s recorder stop deadline')), 8000);
        video.recorder.onstop = () => { video.stopped = true; clearTimeout(timer); resolve(); };
        try { if (video.recorder.state === 'recording') video.recorder.requestData(); video.recorder.stop(); }
        catch (error) { clearTimeout(timer); reject(error); }
      });
    } else {
      const begin = performance.now(); while (!video.stopped) { must(performance.now() - begin < 8000, '8s inactive recorder final data deadline'); await new Promise(resolve => setTimeout(resolve, 2)); }
    }
    video.stream.getTracks().forEach(value => value.stop());
    const blob = new Blob(video.chunks, { type: video.mime }); must(blob.size <= 16 * 1024 * 1024, 'Movie bytes bounded');
    video.out = new Uint8Array(await blob.arrayBuffer()); video.chunks = [];
    return { complete: !video.error, partial: !!video.error, error: video.error, bytes: blob.size, mimeType: video.mime, requestCount: video.requests,
      startStep: video.startStep, endStep: steps, physicsAdvances: steps - video.startStep, startSeaTime: video.startSeaTime, endSeaTime: mode.host.snapshot.status.seaTime,
      wallMilliseconds: performance.now() - video.startWall, tracksStopped: video.stream.getTracks().every(value => value.readyState === 'ended'), physicalPlaybackRateClaim: false, encodedFrameCountClaim: false };
  }
  function videoChunk(offset, length) {
    must(video?.out && Number.isInteger(offset) && Number.isInteger(length) && offset >= 0 && length > 0 && length <= 512 * 1024 && offset + length <= video.out.length, 'Bounded movie chunk');
    let binary = ''; const bytes = video.out.subarray(offset, offset + length); for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768)); return btoa(binary);
  }
  function abortVideo() { if (!video) return { started: false }; try { if (video.recorder.state !== 'inactive') video.recorder.stop(); } catch (error) { video.error ??= String(error); } video.stream.getTracks().forEach(value => value.stop()); return { started: true, tracksStopped: video.stream.getTracks().every(value => value.readyState === 'ended'), error: video.error }; }
  window.__productionEntry = { step, current, checkpoint, inspectMouth, radii, beginVideo, videoFrame, finishVideo, videoChunk, abortVideo };
}
