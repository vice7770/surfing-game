/**
 * Jev at the controls: looks at the sea several times a second, asks Jev about
 * each look, and lands each answer when a player's reaction would have.
 *
 * - A look is one call: the senses as phrases, and the phase's typed questions.
 *   Looks come `hz` times a second of simulated time, and at once when the
 *   prompt lights or the phase changes; several can be in flight, as a player
 *   keeps watching while acting on what they saw a moment ago.
 * - An answer lands at its look's time plus a reaction: the call's own measured
 *   latency (`'real'`), a fixed time in ms, or none (0: lockstep, one look at a
 *   time, the sea waiting for every answer). An answer to an older look than one
 *   already landed is stale and dropped.
 * - With a real reaction the sea never runs ahead of the wall clock since any
 *   look still unanswered (it waits for the clock to catch up, or the answer);
 *   with a fixed one it waits for an answer only when it would fall due before
 *   the next step. Either way no answer lands later than its reaction.
 * - Between answers the motor holds the plan, steering onto it every step.
 */
import type { RideRequest } from '../../wave/SurfZoneRunner';
import type { Decider, Verdict } from './answers';
import { IDLE_PLAN, Motor, type Live, type Plan } from './motor';
import { Observer, type Observation, type Senses } from './observe';
import { questionsFor } from './questions';

export interface PilotOptions {
  reaction: 'real' | number;
  /** Looks per second of simulated time. */
  hz: number;
  /** Calls in flight at most (TypeSafe allows 80 requests a second). */
  maxFlights?: number;
  /** Wall clock, ms, and a wait on it. */
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  /** The game's pocket reflex with every request (the game's own default on the Practice swell). */
  pocketReflex?: boolean;
}

export interface Look {
  /** Simulated time of the look, s, and the wall clock when it was sent, ms. */
  t: number;
  wall: number;
  obs: Observation;
  asked: string[];
  verdict?: Verdict;
  done: Promise<void>;
}

export interface Landing {
  look: Look;
  verdict: Verdict;
  plan: Plan;
  /** Simulated time from the look to the answer landing, s. */
  lag: number;
}

export class JevPilot {
  plan: Plan = IDLE_PLAN;
  readonly observer = new Observer();
  readonly motor: Motor;
  looks = 0;
  landed = 0;
  stale = 0;
  errors = 0;
  readonly latencies: number[] = [];
  readonly tokens: number[] = [];
  /** The latest answer landed, for an overlay. */
  last?: Landing;
  onLand?: (landing: Landing) => void;
  private readonly flights: Look[] = [];
  private landedT = -Infinity;
  private nextLook = -Infinity;
  private urgent = false;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(private readonly decider: Decider, private readonly options: PilotOptions) {
    this.now = options.now ?? (() => performance.now());
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.motor = new Motor({ pocketReflex: options.pocketReflex });
  }

  get inFlight(): number {
    return this.flights.length;
  }

  /** Something salient changed (the prompt, the phase): look again at once. */
  attend(): void {
    this.urgent = true;
  }

  /**
   * The controls for the step starting at `t`: look if one is due, land every answer due by `t` (waiting for the call
   * when the sea must hold), then the motor's controls. `senses` is read only when looking; `live` every step.
   */
  async step(t: number, dt: number, senses: () => Senses, live: () => Live): Promise<RideRequest> {
    const { reaction } = this.options;
    const most = reaction === 0 ? 1 : this.options.maxFlights ?? 6;
    if ((this.urgent || t + 1e-9 >= this.nextLook) && this.flights.length < most) {
      this.look(t, senses());
      this.nextLook = t + 1 / this.options.hz;
      this.urgent = false;
    }
    for (let i = 0; i < this.flights.length;) {
      const flight = this.flights[i];
      if (flight.verdict) {
        const due = reaction === 'real' ? flight.verdict.latencyMs / 1000 : reaction / 1000;
        if (t - flight.t + 1e-9 < due) {
          i += 1;
          continue;
        }
        this.flights.splice(i, 1);
        if (flight.t > this.landedT) this.land(flight, t);
        else this.stale += 1;
        continue;
      }
      if (reaction === 0) {
        await flight.done;
        continue;
      }
      // How much longer the wall clock must run before the sea may take this step, s.
      const ahead = t - flight.t + dt - (reaction === 'real' ? (this.now() - flight.wall) / 1000 : reaction / 1000);
      if (ahead <= 1e-6) {
        i += 1;
        continue;
      }
      if (reaction === 'real') await Promise.race([flight.done, this.sleep(ahead * 1000)]);
      else await flight.done;
    }
    return this.motor.act(this.plan, live(), dt);
  }

  /** Every call still in flight, answered. */
  async settle(): Promise<void> {
    await Promise.all(this.flights.map((flight) => flight.done));
  }

  private look(t: number, senses: Senses): void {
    const obs = this.observer.observe(senses, t);
    const questions = questionsFor(obs);
    const look: Look = { t, wall: this.now(), obs, asked: Object.keys(questions), done: Promise.resolve() };
    look.done = this.decider.decide(obs.state, questions).then((verdict) => { look.verdict = verdict; });
    this.flights.push(look);
    this.looks += 1;
  }

  private land(look: Look, t: number): void {
    const verdict = look.verdict!;
    this.landedT = look.t;
    this.landed += 1;
    if (verdict.error) this.errors += 1;
    else {
      this.latencies.push(verdict.latencyMs);
      this.tokens.push(verdict.inputTokens);
    }
    this.plan = this.motor.plan(verdict, look.obs, this.plan, look.asked);
    this.last = { look, verdict, plan: this.plan, lag: t - look.t };
    this.onLand?.(this.last);
  }
}
