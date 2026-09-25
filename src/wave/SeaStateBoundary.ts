import type { SeaState } from './SeaState';
import type { RelaxationZone, WaterTarget } from './ShallowWaterSolver';

export interface ZoneGrid {
  readonly nx: number;
  readonly nz: number;
  readonly xCenters: ArrayLike<number>;
  readonly zCenters: ArrayLike<number>;
}

/**
 * Relaxation target reproducing a linear sea state inside a solver zone, with
 * the linear flux q = c η along each component. Each component's phase splits
 * into an along-shore part (per column, refreshed when the window slides) and
 * a cross-shore part (per zone row, refreshed per time), so a cell costs two
 * multiply-adds per component per step.
 */
export class SeaStateBoundary implements RelaxationZone {
  private readonly count: number;
  private readonly firstRow: number;
  private readonly rows: number;
  private readonly amplitude: Float64Array;
  private readonly kx: Float64Array;
  private readonly omega: Float64Array;
  private readonly speedX: Float64Array;
  private readonly speedZ: Float64Array;
  private readonly rowPhase: Float64Array;
  private readonly columnCos: Float64Array;
  private readonly columnSin: Float64Array;
  private readonly rowCos: Float64Array;
  private readonly rowSin: Float64Array;
  private cachedTime = Number.NaN;
  private cachedFirstX = Number.NaN;

  constructor(
    private readonly grid: ZoneGrid,
    readonly sea: SeaState,
    readonly weights: Float64Array,
    readonly timeOffset = 0,
  ) {
    const components = sea.components;
    this.count = components.length;
    let first = grid.nz;
    let last = -1;
    for (let iz = 0; iz < grid.nz; iz += 1) {
      for (let ix = 0; ix < grid.nx; ix += 1) {
        if (weights[iz * grid.nx + ix] <= 0) continue;
        first = Math.min(first, iz);
        last = Math.max(last, iz);
      }
    }
    this.firstRow = first;
    this.rows = Math.max(0, last - first + 1);
    const perComponent = () => new Float64Array(this.count);
    this.amplitude = perComponent(); this.kx = perComponent(); this.omega = perComponent();
    this.speedX = perComponent(); this.speedZ = perComponent();
    this.rowPhase = new Float64Array(this.rows * this.count);
    this.rowCos = new Float64Array(this.rows * this.count);
    this.rowSin = new Float64Array(this.rows * this.count);
    this.columnCos = new Float64Array(grid.nx * this.count);
    this.columnSin = new Float64Array(grid.nx * this.count);
    components.forEach((component, c) => {
      const speed = component.omega / component.k;
      this.amplitude[c] = component.amplitude;
      this.kx[c] = component.kx;
      this.omega[c] = component.omega;
      this.speedX[c] = speed * Math.sin(component.direction);
      this.speedZ[c] = speed * Math.cos(component.direction);
      for (let r = 0; r < this.rows; r += 1) {
        this.rowPhase[r * this.count + c] = component.kz * grid.zCenters[this.firstRow + r] + component.phase;
      }
    });
  }

  target(x: number, z: number, t: number, out: WaterTarget, index = -1): void {
    const row = index >= 0 ? Math.floor(index / this.grid.nx) - this.firstRow : -1;
    if (row < 0 || row >= this.rows) {
      this.direct(x, z, t, out);
      return;
    }
    this.refresh(t);
    const column = (index % this.grid.nx) * this.count;
    const rowBase = row * this.count;
    let eta = 0;
    let qx = 0;
    let qz = 0;
    for (let c = 0; c < this.count; c += 1) {
      // cos(kx·x + (kz·z + φ − ωt)) from the column and row factors.
      const value = this.amplitude[c] * (this.columnCos[column + c] * this.rowCos[rowBase + c] - this.columnSin[column + c] * this.rowSin[rowBase + c]);
      eta += value;
      qx += this.speedX[c] * value;
      qz += this.speedZ[c] * value;
    }
    out.eta = eta;
    out.qx = qx;
    out.qz = qz;
  }

  private refresh(t: number): void {
    const firstX = this.grid.xCenters[0];
    if (firstX !== this.cachedFirstX) {
      for (let ix = 0; ix < this.grid.nx; ix += 1) {
        const x = this.grid.xCenters[ix];
        for (let c = 0; c < this.count; c += 1) {
          this.columnCos[ix * this.count + c] = Math.cos(this.kx[c] * x);
          this.columnSin[ix * this.count + c] = Math.sin(this.kx[c] * x);
        }
      }
      this.cachedFirstX = firstX;
    }
    if (t !== this.cachedTime) {
      const seaTime = t + this.timeOffset;
      for (let r = 0; r < this.rows; r += 1) {
        for (let c = 0; c < this.count; c += 1) {
          const phase = this.rowPhase[r * this.count + c] - this.omega[c] * seaTime;
          this.rowCos[r * this.count + c] = Math.cos(phase);
          this.rowSin[r * this.count + c] = Math.sin(phase);
        }
      }
      this.cachedTime = t;
    }
  }

  private direct(x: number, z: number, t: number, out: WaterTarget): void {
    let eta = 0;
    let qx = 0;
    let qz = 0;
    const seaTime = t + this.timeOffset;
    this.sea.components.forEach((component, c) => {
      const value = component.amplitude * Math.cos(component.kx * x + component.kz * z - component.omega * seaTime + component.phase);
      eta += value;
      qx += this.speedX[c] * value;
      qz += this.speedZ[c] * value;
    });
    out.eta = eta;
    out.qx = qx;
    out.qz = qz;
  }
}
