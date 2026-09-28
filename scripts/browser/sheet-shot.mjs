// Saves the surfer sheet as a PNG, its labels included (dev only):
//   node scripts/browser/sheet-shot.mjs <out.png> "<query>" [--url=http://localhost:5173/]
// e.g. node scripts/browser/sheet-shot.mjs /tmp/stances.png "sky=midday&stances"
import { writeFileSync } from 'node:fs';
import { launch } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const [out, query = 'sky=midday&stances'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const base = args.url ?? 'http://localhost:5173/';
const page = await launch({ url: `${base}character-sheet.html?${query}`, width: 1800, height: 1100, args: ['--mute-audio'] });
try {
  await page.waitFor('window.sheetReady === true', 180000);
  // The page's own size: the canvas scales to the page width, the labels over it.
  const size = JSON.parse(await page.eval('JSON.stringify({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight })'));
  const shot = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: size.w, height: size.h, scale: 1 } });
  writeFileSync(out, Buffer.from(shot.data, 'base64'));
  console.log(`saved ${out} (${size.w} × ${size.h})`);
} finally {
  await page.close();
}
