// Dev only (the perf study of 2026-10-22, docs/research/perf-2026-10-22/README.md). Copied to .m1-cpu-base/perf-page.js
// and imported by a water sheet page opened with &diagnostics, on either tree (ab.html installs it in both frames).
// - time(view, look): each frame drawn alone (a 1-pixel read after it, so frames never overlap on the GPU), timing the
//   main thread's submission (cpu), the GPU's own timer (gpu) and the whole serial frame (wall). Light frames read
//   high here: the M1's GPU clocks down between them (Classic jumps between about 2.8 and 5.8 ms).
// - throughput(view, look): frames drawn back to back with one read per block, the GPU kept busy: the steady-state
//   cost a frame. The study's GPU tables use it.
// - abThroughput(view, look, arms): dev arms (set() switches them) in turn, block by block.
// Views: the sheet's shots plus the game's own ride camera.
export function install() {
  const d = window.breaklineDiagnostics;
  const gl = d.canvas.getContext('webgl2');
  const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const channel = new MessageChannel();
  const waiting = [];
  channel.port1.onmessage = () => waiting.shift()?.();
  const breathe = () => new Promise((resolve) => { waiting.push(resolve); channel.port2.postMessage(0); });
  const game = window.waterSheetMode.camera.camera;
  const ride = game.clone();
  ride.aspect = 1280 / 720;
  ride.updateProjectionMatrix();
  const views = { ride };
  for (const shot of window.waterSheetShots) {
    const camera = game.clone();
    camera.fov = 55;
    camera.aspect = 1280 / 720;
    camera.near = 0.1;
    camera.far = 3000;
    camera.position.copy(shot.eye);
    camera.lookAt(shot.target);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    views[shot.name] = camera;
  }
  const pixel = new Uint8Array(4);
  const q = (values, share) => {
    const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
    return sorted.length ? +sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))].toFixed(2) : NaN;
  };
  async function time(view, look, frames = 40) {
    const camera = views[view];
    if (!camera) return undefined;
    d.setWaterLook(look);
    for (let k = 0; k < 6; k += 1) {
      d.renderView(camera);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    }
    const cpu = [];
    const wall = [];
    const queries = [];
    for (let k = 0; k < frames; k += 1) {
      const query = gl.createQuery();
      const start = performance.now();
      gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
      d.renderView(camera);
      gl.endQuery(timer.TIME_ELAPSED_EXT);
      const submitted = performance.now();
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      cpu.push(submitted - start);
      wall.push(performance.now() - start);
      queries.push(query);
      if (k % 8 === 7) await breathe();
    }
    const gpu = [];
    for (const query of queries) {
      while (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) await breathe();
      if (!gl.getParameter(timer.GPU_DISJOINT_EXT)) gpu.push(gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6);
      gl.deleteQuery(query);
    }
    return { gpu: q(gpu, 0.5), gpu10: q(gpu, 0.1), wall: q(wall, 0.5), wall10: q(wall, 0.1), cpu: q(cpu, 0.5) };
  }
  /** Paired arms on one view: each arm's frame in turn, the order turned every cycle; per arm the medians and the paired difference to the first. */
  async function ab(view, look, arms, cycles = 30) {
    const camera = views[view];
    d.setWaterLook(look);
    for (const arm of arms) {
      await arm.set();
      for (let k = 0; k < 4; k += 1) {
        d.renderView(camera);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      }
    }
    const gpu = arms.map(() => []);
    const wall = arms.map(() => []);
    const pending = [];
    for (let cycle = 0; cycle < cycles; cycle += 1) {
      for (let j = 0; j < arms.length; j += 1) {
        const arm = (cycle + j) % arms.length;
        await arms[arm].set();
        // One untimed frame after a switch (a program swap's first use), then the timed one.
        d.renderView(camera);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        const query = gl.createQuery();
        const start = performance.now();
        gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
        d.renderView(camera);
        gl.endQuery(timer.TIME_ELAPSED_EXT);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        wall[arm][cycle] = performance.now() - start;
        pending.push({ arm, cycle, query });
      }
      await breathe();
    }
    for (const { arm, cycle, query } of pending) {
      while (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) await breathe();
      gpu[arm][cycle] = gl.getParameter(timer.GPU_DISJOINT_EXT) ? NaN : gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6;
      gl.deleteQuery(query);
    }
    return Object.fromEntries(arms.map((arm, k) => [arm.label, {
      gpu: q(gpu[k], 0.5), wall: q(wall[k], 0.5),
      gpuVsFirst: k === 0 ? 0 : q(gpu[k].map((t, c) => t - gpu[0][c]), 0.5),
      wallVsFirst: k === 0 ? 0 : q(wall[k].map((t, c) => t - wall[0][c]), 0.5),
    }]));
  }
  /**
   * Steady-state cost a frame: `frames` frames drawn back to back with no read between them (the GPU kept busy, so it
   * holds its clock), then one 1-pixel read; ms a frame, over `blocks` blocks (median and fastest).
   */
  async function throughput(view, look, frames = 30, blocks = 5) {
    const camera = views[view];
    if (!camera) return undefined;
    d.setWaterLook(look);
    for (let k = 0; k < 10; k += 1) d.renderView(camera);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    const per = [];
    for (let b = 0; b < blocks; b += 1) {
      const start = performance.now();
      for (let k = 0; k < frames; k += 1) d.renderView(camera);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      per.push((performance.now() - start) / frames);
      await breathe();
    }
    return { ms: q(per, 0.5), min: q(per, 0) };
  }
  /** Paired throughput blocks: the arms take turns block by block, the order turned every cycle; the paired median difference to the first. */
  async function abThroughput(view, look, arms, cycles = 8, frames = 20) {
    const camera = views[view];
    d.setWaterLook(look);
    for (const arm of arms) { await arm.set(); for (let k = 0; k < 6; k += 1) d.renderView(camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel); }
    const per = arms.map(() => []);
    for (let cycle = 0; cycle < cycles; cycle += 1) {
      for (let j = 0; j < arms.length; j += 1) {
        const arm = (cycle + j) % arms.length;
        await arms[arm].set();
        for (let k = 0; k < 3; k += 1) d.renderView(camera);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        const start = performance.now();
        for (let k = 0; k < frames; k += 1) d.renderView(camera);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        per[arm][cycle] = (performance.now() - start) / frames;
        await breathe();
      }
    }
    return Object.fromEntries(arms.map((arm, k) => [arm.label, { ms: q(per[k], 0.5), min: q(per[k], 0), vsFirst: k === 0 ? 0 : q(per[k].map((t, c) => t - per[0][c]), 0.5) }]));
  }
  async function standard(names = ['ride', 'lineup', 'horizon'], frames = 40) {
    await window.waterSheetShot('lineup', 'rich', 'midday', 'x.png');
    const out = {};
    for (const look of ['rich', 'classic']) for (const v of names) if (views[v]) {
      const serial = await time(v, look, frames);
      const steady = await throughput(v, look);
      out[look + ' ' + v] = { ...serial, steady: steady.ms, steadyMin: steady.min };
    }
    return out;
  }
  window.perf = { time, ab, views, breathe, standard, throughput, abThroughput };
  return Object.keys(views);
}
