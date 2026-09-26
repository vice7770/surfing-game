// Receives the ride recorder's video and progress lines (dev only; src/dev/rideRecorder.ts).
//   npm run record:ride            (then open http://localhost:5173/?inpage&record, optionally &spot=reef&source=buoy&minRide=8)
// Writes ride.mp4 and log.txt into the given folder (default: recordings/).
import { createServer } from 'node:http';
import { appendFileSync, writeFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
const dir = process.argv[2] ?? 'recordings';
mkdirSync(dir, { recursive: true });
createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') { res.end(); return; }
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const url = new URL(req.url, 'http://x');
    const body = Buffer.concat(chunks);
    if (url.pathname === '/upload') {
      const name = (url.searchParams.get('name') ?? 'video.mp4').replace(/[^a-z0-9._-]/gi, '_');
      writeFileSync(`${dir}/${name}`, body);
      appendFileSync(`${dir}/log.txt`, `${new Date().toISOString()} saved ${name} (${body.length} bytes)\n`);
      console.log(`saved ${name} ${body.length} bytes`);
    } else {
      appendFileSync(`${dir}/log.txt`, `${new Date().toISOString()} ${body.toString()}\n`);
      console.log(body.toString());
    }
    res.end('ok');
  });
}).listen(5199, () => console.log('receiver on 5199'));
