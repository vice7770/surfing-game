interface Capture {
  fps: number;
  fields: string[];
  sides: string[];
  frames: number[][][];
}

const video = document.querySelector<HTMLVideoElement>('#replay')!;
const play = document.querySelector<HTMLButtonElement>('#play')!;
const restart = document.querySelector<HTMLButtonElement>('#restart')!;
const scrub = document.querySelector<HTMLInputElement>('#scrub')!;
const speed = document.querySelector<HTMLSelectElement>('#speed')!;
const time = document.querySelector<HTMLOutputElement>('#time')!;
const status = document.querySelector<HTMLElement>('#status')!;
const phaseName = document.querySelector<HTMLElement>('#phase-name')!;
const expected = document.querySelector<HTMLElement>('#expected')!;
const frameNumber = document.querySelector<HTMLElement>('#frame-number')!;
const outcome = document.querySelector<HTMLElement>('#outcome')!;
const table = document.querySelector<HTMLTableSectionElement>('#metrics')!;
const phaseButtons = [...document.querySelectorAll<HTMLButtonElement>('#phases button')];
const phases = [
  'Settle over planted feet after the pop-up. Both runs begin with the same stance and no input.',
  'Full steer and Compress should load the inside rail. Look for bent knees, a lower pelvis than the neutral ride, and a change in course.',
  'As both controls release, look for the knees to open and the hips to rise while the board carries through the turn.',
  'A bottom turn should carry speed into a climb up the face. Compare the board’s height with the moving trough underneath it.',
];
const phaseFrames = phaseButtons.map(button => Number(button.dataset.frame));

function signed(value: number, digits = 0) {
  const rounded = Number(value.toFixed(digits));
  return (rounded > 0 ? '+' : rounded < 0 ? '−' : '') + Math.abs(rounded).toFixed(digits);
}

async function prepare() {
  const response = await fetch('/debug/canyon/turn-frames.json');
  if (!response.ok) throw new Error('Frame measurements could not be loaded.');
  const capture: Capture = await response.json();
  const { fps, frames, fields } = capture;
  const required = ['steer', 'compress', 'boardRollDeg', 'courseChangeDeg', 'frontKneeDeg', 'rearKneeDeg', 'pelvisDeckM',
    'neutralPelvisDeckM', 'lowerWristAboveWaterM', 'heightAboveMovingTroughM', 'speedThroughWaterMps', 'trunkFlexionDeg'];
  if (fps !== 30 || frames.length !== 90 || capture.sides.join(',') !== 'left,right' ||
      !required.every(field => fields.includes(field)) || !frames.every(pair => pair.length === 2 &&
        pair.every(side => side.length === fields.length && side.every(Number.isFinite)))) {
    throw new Error('The measurements do not match this recording.');
  }
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    if (video.error) throw new Error('The recording could not be opened.');
    await new Promise<void>((resolve, reject) => {
      video.addEventListener('loadeddata', () => resolve(), { once: true });
      video.addEventListener('error', () => reject(new Error('The recording could not be opened.')), { once: true });
    });
  }
  if (Math.abs(video.duration - frames.length / fps) > 0.5 / fps) throw new Error('The recording and frame measurements have different durations.');

  const col = Object.fromEntries(fields.map((name, i) => [name, i]));
  const last = frames.length - 1;
  let current = -1;
  const rows: [string, (sample: number[], i: number) => string][] = [
    ['Input', (s, i) => s[col.compress] && s[col.steer] ? 'Steer + Compress' : i >= phaseFrames[2] ? 'Released' : 'Neutral'],
    ['Change in course', s => signed(s[col.courseChangeDeg], 1) + '°'],
    ['Board roll', s => signed(s[col.boardRollDeg], 1) + '°'],
    ['Front / rear knee', s => Math.round(s[col.frontKneeDeg]) + '° / ' + Math.round(s[col.rearKneeDeg]) + '°'],
    ['Trunk flexion', s => Math.round(s[col.trunkFlexionDeg]) + '°'],
    ['Pelvis vs. neutral', s => signed(100 * (s[col.pelvisDeckM] - s[col.neutralPelvisDeckM])) + ' cm'],
    ['Lower wrist above water', s => Math.round(100 * s[col.lowerWristAboveWaterM]) + ' cm'],
    ['Height above moving trough', s => s[col.heightAboveMovingTroughM].toFixed(2) + ' m'],
    ['Through-water speed', s => s[col.speedThroughWaterMps].toFixed(2) + ' m/s'],
  ];
  const cells = rows.map(([label]) => {
    const row = table.insertRow();
    const heading = document.createElement('th');
    heading.scope = 'row';
    heading.textContent = label;
    row.append(heading);
    return [row.insertCell(), row.insertCell()];
  });
  const release = phaseFrames[2];
  function draw(i: number) {
    i = Math.max(0, Math.min(last, i));
    if (current === i) return;
    current = i;
    const pair = frames[i];
    const phase = phaseFrames.reduce((active, start, index) => start <= i ? index : active, 0);
    scrub.value = String(i);
    time.value = (i / fps).toFixed(2) + ' / ' + video.duration.toFixed(2) + ' s';
    frameNumber.textContent = 'Frame ' + (i + 1) + ' / ' + frames.length;
    phaseButtons.forEach((button, index) => {
      if (index === phase) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    phaseName.textContent = phaseButtons[phase].textContent;
    expected.textContent = phases[phase];
    rows.forEach(([, format], row) => pair.forEach((sample, side) => {
      cells[row][side].textContent = format(sample, i);
    }));
    if (phase === 0) {
      outcome.textContent = 'Both columns follow the same paddle-in until the turn input begins.';
    } else if (phase === 1) {
      outcome.textContent = 'Pelvis vs. neutral compares each turn with a third ride on the same wave at the same instant, with both controls untouched.';
    } else if (phase === 2) {
      const delta = pair.map((sample, side) => signed(100 * (sample[col.pelvisDeckM] - frames[release - 1][side][col.pelvisDeckM])));
      outcome.textContent = 'Since the last held frame, pelvis height above the deck has changed by ' + delta[0] + ' cm on the left and ' + delta[1] + ' cm on the right.';
    } else {
      const rise = pair.map((sample, side) => {
        const lowest = Math.min(...frames.slice(release, i + 1).map(frame => frame[side][col.heightAboveMovingTroughM]));
        return (sample[col.heightAboveMovingTroughM] - lowest).toFixed(2);
      });
      outcome.textContent = 'Since release, the boards have risen ' + rise[0] + ' m on the left and ' + rise[1] + ' m on the right from their lowest height above the moving trough.';
    }
  }

  function seek(i: number) {
    video.pause();
    const index = Math.max(0, Math.min(last, i));
    video.currentTime = index === 0 ? 0 : (index + 0.25) / fps;
    draw(index);
  }
  async function resume() {
    if (current === last) seek(0);
    try { await video.play(); }
    catch { status.textContent = 'Playback could not start. Press Play to try again.'; }
  }
  function toggle() {
    if (video.paused) void resume();
    else video.pause();
  }
  function syncClock() {
    if (!video.paused) draw(Math.floor(video.currentTime * fps + 0.0001));
  }
  function updateVideoFrame(_: number, meta: VideoFrameCallbackMetadata) {
    if (video.paused) return;
    draw(Math.floor(meta.mediaTime * fps + 0.0001));
    frameCallback = video.requestVideoFrameCallback(updateVideoFrame);
  }
  let frameCallback: number | undefined;
  video.addEventListener('play', () => {
    play.textContent = 'Pause';
    status.textContent = '';
    if (typeof video.requestVideoFrameCallback === 'function') frameCallback = video.requestVideoFrameCallback(updateVideoFrame);
  });
  video.addEventListener('pause', () => {
    play.textContent = 'Play';
    if (frameCallback !== undefined) video.cancelVideoFrameCallback(frameCallback);
  });
  if (typeof video.requestVideoFrameCallback !== 'function') video.addEventListener('timeupdate', syncClock);
  video.addEventListener('ended', () => { play.textContent = 'Play'; draw(last); });
  play.addEventListener('click', toggle);
  restart.addEventListener('click', () => { seek(0); void resume(); });
  scrub.addEventListener('input', () => seek(Number(scrub.value)));
  speed.addEventListener('change', () => { video.playbackRate = Number(speed.value); });
  phaseButtons.forEach((button, index) => button.addEventListener('click', () => seek(phaseFrames[index])));
  document.addEventListener('keydown', event => {
    const target = event.target as HTMLElement;
    if (event.altKey || event.ctrlKey || event.metaKey || target.matches('select, input:not([type=range]), textarea')) return;
    if (event.code === 'Space' && !target.closest('button, a')) { event.preventDefault(); toggle(); }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault(); seek(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  [play, restart, scrub, ...phaseButtons].forEach(control => { control.disabled = false; });
  status.textContent = '';
  draw(0);
}

void prepare().catch((error: Error) => { status.textContent = error.message; });
