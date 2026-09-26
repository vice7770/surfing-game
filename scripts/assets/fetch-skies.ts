/**
 * Downloads the three photographed skies (Poly Haven, CC0), moves each sun out
 * of its HDR into a measured light, and writes public/assets/skies/skies.json.
 * Run: npm run assets:skies (needs the network and macOS `sips`).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, statSync, writeFileSync } from 'node:fs';
import { encodeHdr, extractSun, horizontalIrradiance, parseHdr } from './skyMath';

/** One sky per P8 time of day. */
const SKIES = [
  { id: 'qwantani_sunrise_puresky', timeOfDay: 'dawn' },
  { id: 'kloofendal_48d_partly_cloudy_puresky', timeOfDay: 'midday' },
  { id: 'qwantani_sunset_puresky', timeOfDay: 'sunset' },
] as const;
const OUT = 'public/assets/skies';
const CACHE = 'scripts/assets/.cache';
// Poly Haven's API refuses requests without a user agent.
const HEADERS = { 'User-Agent': 'breakline-asset-script (github.com/vice7770/surfing-game)' };

async function json(url: string): Promise<any> {
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

async function download(url: string, path: string): Promise<Uint8Array> {
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  writeFileSync(path, bytes);
  return bytes;
}

mkdirSync(OUT, { recursive: true });
mkdirSync(CACHE, { recursive: true });
const manifest = [];
for (const { id, timeOfDay } of SKIES) {
  const files = await json(`https://api.polyhaven.com/files/${id}`);
  const info = await json(`https://api.polyhaven.com/info/${id}`);
  const hdr = parseHdr(await download(files.hdri['1k'].hdr.url, `${CACHE}/${id}_1k.hdr`));
  const { sun, image } = extractSun(hdr);
  writeFileSync(`${OUT}/${id}_1k.hdr`, encodeHdr(image));
  await download(files.tonemapped.url, `${CACHE}/${id}.jpg`);
  execFileSync('sips', ['-z', '2048', '4096', '-s', 'formatOptions', '82', `${CACHE}/${id}.jpg`, '--out', `${OUT}/${id}.jpg`], { stdio: 'ignore' });
  const elevation = (Math.asin(sun.direction[1]) * 180) / Math.PI;
  manifest.push({
    id,
    timeOfDay,
    hdr: `skies/${id}_1k.hdr`,
    background: `skies/${id}.jpg`,
    sun: { direction: sun.direction, irradiance: sun.irradiance, pixels: sun.pixels },
    skyIrradiance: horizontalIrradiance(image),
    author: Object.keys(info.authors ?? {}).join(', '),
    licence: 'CC0',
    source: `https://polyhaven.com/a/${id}`,
    bytes: { hdr: statSync(`${OUT}/${id}_1k.hdr`).size, background: statSync(`${OUT}/${id}.jpg`).size },
  });
  console.log(`${id}: sun ${elevation.toFixed(1)}° up, ${sun.pixels} px, irradiance ${sun.irradiance.map((v) => v.toFixed(2)).join(' ')}; sky ${manifest.at(-1)!.skyIrradiance.toFixed(2)}`);
}
writeFileSync(`${OUT}/skies.json`, `${JSON.stringify({ skies: manifest }, null, 2)}\n`);
