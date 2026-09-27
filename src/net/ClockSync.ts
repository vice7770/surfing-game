import type { RoomInfo } from './protocol';

interface ClockSample {
  offset: number;
  rtt: number;
}

/**
 * The server's clock seen from this page (spec N1), NTP-style: each ping/pong
 * gives offset = server + rtt/2 − received. The quickest recent round trip is
 * trusted most, since its two halves can differ least.
 */
export class ClockSync {
  private readonly samples: ClockSample[] = [];

  constructor(private readonly keep = 8) {}

  /** A pong: its ping left at `sentAt` and it came back at `receivedAt` (local ms); the server's clock read `server` (ms). */
  add(sentAt: number, server: number, receivedAt: number): void {
    const rtt = receivedAt - sentAt;
    if (!(rtt >= 0) || !Number.isFinite(server)) return;
    this.samples.push({ offset: server + rtt / 2 - receivedAt, rtt });
    if (this.samples.length > this.keep) this.samples.shift();
  }

  get ready(): boolean {
    return this.samples.length > 0;
  }

  private get best(): ClockSample | undefined {
    let best: ClockSample | undefined;
    for (const sample of this.samples) if (!best || sample.rtt < best.rtt) best = sample;
    return best;
  }

  /** Server ms minus local ms. */
  get offset(): number {
    return this.best?.offset ?? 0;
  }

  get rtt(): number {
    return this.best?.rtt ?? Number.NaN;
  }

  serverNow(localNow: number): number {
    return localNow + this.offset;
  }
}

/** The room's sea time, s, at a server time, ms. */
export function roomSeaTime(room: Pick<RoomInfo, 'seaTimeAtCreate' | 'createdAt'>, serverNow: number): number {
  return room.seaTimeAtCreate + (serverNow - room.createdAt) / 1000;
}
