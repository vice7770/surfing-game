// Shoots a Canyon wave peeling (the canyon spilling prototype, docs/research/canyon-spilling-2026-10-05), dev only:
// the water sheet runs the Canyon on a square, narrow groundswell, then steps a second at a time and shoots each step
// from the beach looking out to sea and from overhead. Start `npx vite --port 5199` first.
//
//   CHROME=/opt/pw-browsers/chromium node scripts/browser/canyon-peel-shots.mjs <out dir> [--frames=24] [--every=1]
//     [--url=http://localhost:5199/] [--query=...] [--look=rich] [--time=midday] [--headless]
import { createServer } from 'node:http';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { launch } from './cdp.mjs';

const args = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => {
  const [key, ...value] = a.slice(2).split('=');
  return [key, value.length ? value.join('=') : 'true'];
}));
const [out = 'canyon-shots'] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
mkdirSync(out, { recursive: true });
const frames = Number(args.frames ?? 24);
const every = Number(args.every ?? 1);
const look = args.look ?? 'rich';
const time = args.time ?? 'midday';
const receiverPort = 5299;
let prefix = 'frame';
const server = createServer((request, response) => {
  const chunks = [];
  request.on('data', (chunk) => chunks.push(chunk));
  request.on('end', () => {
    const name = new URL(request.url, 'http://localhost').searchParams.get('name') ?? 'upload.png';
    writeFileSync(join(out, `${prefix}-${name}`), Buffer.concat(chunks));
    response.writeHead(200, { 'Access-Control-Allow-Origin': '*' });
    response.end('ok');
  });
});
await new Promise((resolve) => server.listen(receiverPort, resolve));

const base = args.url ?? 'http://localhost:5199/';
const query = args.query ?? `inpage&waterSheet&spot=canyon&swell=medium&direction=0&spreading=150&compute=cpu&receiver=http://localhost:${receiverPort}`;
const page = await launch({
  url: `${base}?${query}`, width: 1280, height: 720,
  args: ['--mute-audio', ...(args.headless ? ['--headless=new', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--no-sandbox'] : [])],
});
try {
  prefix = 'sheet';
  await page.waitFor('window.waterSheetReady === true', 1800000);
  // Views: from the beach looking out to sea (+x is screen-right), and from overhead (+x right, the sea at the top).
  const views = JSON.parse(args.views ?? JSON.stringify({
    beach: { eye: [-5, 9, 15], target: [-5, 0, -110] },
    overhead: { eye: [-5, 170, -55], target: [-5, 0, -95] },
  }));
  for (let frame = 0; frame < frames; frame += 1) {
    const seconds = await page.eval(`window.waterSheetStep(${every})`);
    for (const [name, view] of Object.entries(views)) {
      prefix = `${name}-${String(frame).padStart(2, '0')}`;
      await page.eval(`window.waterSheetShot(${JSON.stringify(view)}, '${look}', '${time}')`);
    }
    console.log(`frame ${frame} at ${Number(seconds).toFixed(1)} s`);
  }
} finally {
  await page.close();
  server.close();
}
