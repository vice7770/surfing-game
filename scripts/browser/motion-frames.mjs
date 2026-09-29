// Films stance recipes on the surfer sheet frame by frame (dev only), for renderers too slow to film live
// (software WebGL in a container): each frame drawn on demand, then encoded by ffmpeg at a steady rate.
//   node scripts/browser/motion-frames.mjs <out.mp4> "<recipe,recipe…>" [--surfer=1] [--side=goofy] [--fps=30] [--slow=1] [--readout] [--url=http://localhost:5173/]
// `--slow=2` plays at half speed; `--readout` draws the time, the board's roll, the speed and the weight over the front foot.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launch } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const [out, recipes = 'trim,bottom-turn,snap-frontside,pumping'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const base = args.url ?? 'http://localhost:5173/';
const fps = Number(args.fps ?? 30);
const slow = Number(args.slow ?? 1);
const query = `sky=midday&motion=${recipes}&surfer=${args.surfer ?? 1}&side=${args.side ?? 'regular'}${'readout' in args ? '&readout' : ''}&at=0`;
const page = await launch({ url: `${base}character-sheet.html?${query}`, width: 1320, height: 800, args: ['--mute-audio'] });
const dir = mkdtempSync(join(tmpdir(), 'motion-frames-'));
try {
  await page.waitFor('window.sheetReady === true && typeof window.motionAt === "function"', 600000);
  const length = Number(await page.eval('window.motionLength'));
  const count = Math.ceil((length * fps * slow));
  for (let i = 0; i < count; i += 1) {
    const url = await page.eval(`window.motionAt(${i / (fps * slow)})`);
    writeFileSync(join(dir, `f${String(i).padStart(5, '0')}.jpg`), Buffer.from(url.split(',')[1], 'base64'));
  }
  const ffmpeg = process.env.FFMPEG ?? 'ffmpeg';
  const encoded = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', join(dir, 'f%05d.jpg'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-movflags', '+faststart', out], { stdio: 'inherit' });
  if (encoded.status !== 0) throw new Error(`ffmpeg failed (${encoded.status})`);
  console.log(`saved ${out} (${count} frames, ${(count / fps).toFixed(1)} s${slow !== 1 ? `, ${slow}× slower` : ''})`);
} finally {
  await page.close();
  rmSync(dir, { recursive: true, force: true });
}
