// Films stance recipes played on the surfer sheet (dev only): the rig's motion, drawn as the game draws it.
//   node scripts/browser/motion-clip.mjs <out.mp4> "<recipe,recipe…>" [--surfer=1] [--side=goofy] [--url=http://localhost:5173/]
// e.g. node scripts/browser/motion-clip.mjs /tmp/after.mp4 "trim,bottom-turn,snap-frontside,pumping"
// The page's recorder picks MP4 where Chrome can, else WebM: the file's real type is printed.
import { writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const [out, recipes = 'trim,bottom-turn,snap-frontside,pumping'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const base = args.url ?? 'http://localhost:5173/';
const query = `sky=midday&motion=${recipes}&surfer=${args.surfer ?? 1}&side=${args.side ?? 'regular'}&record`;
const page = await launch({ url: `${base}character-sheet.html?${query}`, width: 1320, height: 800, args: ['--mute-audio'] });
try {
  await page.waitFor('typeof window.motionFilm === "string"', 300000);
  const url = await page.eval('window.motionFilm');
  const [head, data] = url.split(',');
  writeFileSync(out, Buffer.from(data, 'base64'));
  console.log(`saved ${out} (${head.slice(5)}, ${(data.length * 0.75 / 1e6).toFixed(1)} MB)`);
} finally {
  await page.close();
}
