import { Quaternion, Vector3 } from 'three';
import { it } from 'vitest';
import { AttachedRider } from '../physics/AttachedRider';
import { BoardBody } from '../physics/BoardBody';
import { PlaneWater } from '../physics/PlaneWater';
import { createBoardSpraySheet, unpackBoardSheets } from '../physics/boardSpray';
import { RIDER_PHASES, SURF_ZONE_STEP } from '../wave/SurfZoneRunner';
import { POSE_BYTES, createPose, encodeBundle, encodePose } from './poseCodec';
import { RemoteSurfers, createRemoteState } from './RemoteSurfers';
import { RemoteSpray } from './remoteSpray';

const look = { body: 'surfer1', outfit: 'fullsuit', color: 'teal', board: 'classic' };
const G = 9.81;
it('replay', () => {
  for (const speed of [7, 9]) {
    const board = new BoardBody();
    board.place(new Vector3(0, board.shape.centerOfMass.y, 0), new Quaternion(), new Vector3(0, 0, speed));
    const rider = new AttachedRider(board.shape, { phase: 'standing' });
    board.attach(rider);
    const water = new PlaneWater();
    const remote = new RemoteSurfers();
    remote.join({ id: 1, name: 'Ana', look });
    const sprays = { spin: new RemoteSpray(), old: new RemoteSpray({ snapFan: 'old' }) };
    const state = createRemoteState();
    const sheets = [createBoardSpraySheet(), createBoardSpraySheet()];
    const rows: string[] = [];
    const errs = { spin: [] as number[], old: [] as number[], fmSpin: [] as number[], fmOld: [] as number[] };
    for (let n = 0; n < 96; n += 1) {
      const t = n * SURF_ZONE_STEP;
      rider.steer = t < 0.2 ? 0 : -1;
      rider.snap = t >= 0.2 && t < 0.8 ? 1 : 0;
      board.step(SURF_ZONE_STEP, water);
      if (!rider.attached) break;
      if ((n + 1) % 3 !== 0) continue;
      const step = n + 1;
      const p = createPose();
      const q = board.orientation;
      Object.assign(p, { step, x: board.position.x, z: board.position.z, lift: board.position.y, qx: q.x, qy: q.y, qz: q.z, qw: q.w, phase: RIDER_PHASES.indexOf('standing'), present: true, boardPresent: true });
      const bytes = new Uint8Array(POSE_BYTES);
      encodePose(p, new DataView(bytes.buffer), 0);
      remote.receiveBundle(encodeBundle([{ id: 1, pose: bytes }]).buffer as ArrayBuffer, step * SURF_ZONE_STEP * 1000, []);
      if (step < 30) continue;
      const count = board.spraySheets(sheets, 0);
      const local = sheets.slice(0, count);
      const seaTime = step * SURF_ZONE_STEP;
      remote.sample(1, seaTime, state);
      const got: Record<string, ReturnType<typeof unpackBoardSheets>> = {};
      for (const [name, spray] of Object.entries(sprays)) {
        spray.begin();
        spray.add(remote, 1, seaTime, state, () => 0);
        const packed = spray.packed();
        got[name] = packed ? unpackBoardSheets(packed) : [];
      }
      const yaw = (board.angularVelocity.y * 180) / Math.PI;
      for (const s of local) {
        if (s.flux < 10) continue;
        const apex = (vy: number) => (vy > 0 ? (vy * vy) / (2 * G) : 0);
        const a = got.spin.find((x) => x.side === s.side);
        const b = got.old.find((x) => x.side === s.side);
        const la = apex(s.aftVY);
        if (a) { errs.spin.push((apex(a.aftVY) - la) / Math.max(0.05, la)); errs.fmSpin.push(a.fluxMean - s.fluxMean); }
        if (b) { errs.old.push((apex(b.aftVY) - la) / Math.max(0.05, la)); errs.fmOld.push(b.fluxMean - s.fluxMean); }
        rows.push(`${speed} t ${seaTime.toFixed(2)} yaw ${yaw.toFixed(0)} side ${s.side} flux ${s.flux.toFixed(0)} local apex ${la.toFixed(2)} fm ${s.fluxMean.toFixed(2)} | spin ${a ? apex(a.aftVY).toFixed(2) + ' fm ' + a.fluxMean.toFixed(2) + ' flux ' + a.flux.toFixed(0) : '-'} | old ${b ? apex(b.aftVY).toFixed(2) + ' fm ' + b.fluxMean.toFixed(2) + ' flux ' + b.flux.toFixed(0) : '-'}`);
      }
    }
    console.log(rows.join('\n'));
    const med = (v: number[]) => [...v].sort((x, y) => x - y)[Math.floor(v.length / 2)];
    const absmed = (v: number[]) => med(v.map(Math.abs));
    console.log(speed, 'apex err median |spin| ', absmed(errs.spin), 'old', absmed(errs.old), 'fm |spin|', absmed(errs.fmSpin), 'old', absmed(errs.fmOld));
  }
});
