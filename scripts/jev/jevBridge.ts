/**
 * The page's way to Jev (dev only): a local server the Jev film (`?inpage&record&pilot=jev`, src/dev/jevRecorder.ts)
 * posts its looks to, so the key stays in Node and never reaches the browser. It also takes the film and the page's
 * log lines, as the ride recorder's receiver does (scripts/ride-video-receiver.mjs), into the given folder.
 *
 *   npm run film:jev                 (then open http://localhost:5173/?inpage&record&pilot=jev)
 *   npm run film:jev -- /tmp/jev     (writes jev-ride.mp4, log.txt and looks.jsonl there)
 *
 * POST /jev    {state, questions} → a Verdict (src/dev/jev/answers.ts)
 * POST /upload?name=…              the film
 * POST /log                        a progress line
 * POST /look                       one landed look, as JSON, appended to looks.jsonl
 */
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { JevClient } from './jevClient';

const dir = process.argv[2] ?? 'recordings';
const port = Number(process.env.JEV_BRIDGE_PORT ?? 5199);
mkdirSync(dir, { recursive: true });
const client = new JevClient({ model: process.env.JEV_MODEL ?? 'jev-latest' });

createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    res.end();
    return;
  }
  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    const url = new URL(req.url ?? '/', 'http://bridge');
    const body = Buffer.concat(chunks);
    if (url.pathname === '/jev') {
      const { state, questions } = JSON.parse(body.toString()) as { state: unknown; questions: never };
      void client.decide(state, questions).then((verdict) => {
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify(verdict));
      });
      return;
    }
    if (url.pathname === '/upload') {
      const name = (url.searchParams.get('name') ?? 'video.mp4').replace(/[^a-z0-9._-]/gi, '_');
      writeFileSync(`${dir}/${name}`, body);
      appendFileSync(`${dir}/log.txt`, `${new Date().toISOString()} saved ${name} (${body.length} bytes)\n`);
      console.log(`saved ${dir}/${name} ${body.length} bytes`);
    } else if (url.pathname === '/look') {
      appendFileSync(`${dir}/looks.jsonl`, `${body.toString()}\n`);
    } else {
      appendFileSync(`${dir}/log.txt`, `${new Date().toISOString()} ${body.toString()}\n`);
      console.log(body.toString());
    }
    res.end('ok');
  });
}).listen(port, () => console.log(`Jev bridge on ${port}: ${client.model}, writing to ${dir}/`));
