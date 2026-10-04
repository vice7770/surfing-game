import { BufferAttribute, BufferGeometry, ClampToEdgeWrapping, LinearFilter, type Matrix4, type PlaneGeometry, type Texture } from 'three';
import type { SurfaceGrid } from '../WaterSurface';

// A deliberately narrow ordinary-water domain. Outside it the complete original repair draws.
const MIN_MASK_SPACING = 0.25;
const MAX_TERMS = 16384;
const MAX_MASK_SIZE = 16384;
const U = 2 ** -24;

/** A private geometry view: attributes/index remain the original objects; only its own range can differ. */
export class CoarseFallbackRows {
  view!: BufferGeometry;
  private source!: PlaneGeometry;
  private position?: BufferAttribute;
  private index?: BufferAttribute;
  private positionVersion = -1;
  private indexVersion = -1;
  private rows!: Float32Array;
  private widthCells = 0;
  private validRows = false;
  private localXBound = 0;
  private support: 'full' | 'empty' | 'bounded' = 'full';
  private lowRow = 0;
  private highRow = 0;
  private maskOrigin = 0;
  private maskSpacing = 0;
  private maskSize = 0;
  private maskTexture?: Texture;
  private maskVersion = -1;

  constructor(source: PlaneGeometry) { this.bind(source); }

  /** Called before renderer traversal, only on first activation or actual source geometry replacement. */
  bind(source: PlaneGeometry): void {
    if (source === this.source) return;
    this.view?.dispose();
    this.source = source;
    this.view = new BufferGeometry();
    this.view.attributes = source.attributes;
    this.view.index = source.index;
    this.view.groups = source.groups;
    this.view.morphAttributes = source.morphAttributes;
    const nx = (source.parameters?.widthSegments ?? Number.NaN) + 1;
    const nz = (source.parameters?.heightSegments ?? Number.NaN) + 1;
    this.widthCells = nx - 1;
    this.rows = new Float32Array(Number.isInteger(nz) && nz >= 2 && nz <= MAX_MASK_SIZE ? nz : 0);
    this.localXBound = 0;
    const position = source.getAttribute('position'), index = source.index;
    this.position = position instanceof BufferAttribute ? position : undefined;
    this.index = index ?? undefined;
    this.positionVersion = this.position?.version ?? -1;
    this.indexVersion = index?.version ?? -1;
    this.validRows = Number.isInteger(nx) && nx >= 2 && nx <= MAX_MASK_SIZE && Number.isInteger(nz) && nz >= 2 && nz <= MAX_MASK_SIZE
      && this.position?.array instanceof Float32Array && this.position.itemSize === 3
      && this.position.count === nx * nz && index?.count === 6 * (nx - 1) * (nz - 1);
    if (this.validRows) {
      const p = this.position!.array, a = index!.array;
      // Capture one coordinate per row, not a second vertex buffer. Validate the actual bound topology once.
      for (let j = 0; j < nz; j++) {
        const z = p[3 * j * nx + 2]; this.rows[j] = z;
        if (!Number.isFinite(z) || (j > 0 && z <= this.rows[j - 1])) this.validRows = false;
        for (let i = 0; i < nx; i++) {
          const o = 3 * (j * nx + i);
          if (p[o + 2] !== z || !Number.isFinite(p[o]) || !Number.isFinite(p[o + 1])) this.validRows = false;
          this.localXBound = Math.max(this.localXBound, Math.abs(p[o]));
        }
      }
      for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
        const o = 6 * (j * (nx - 1) + i), v = j * nx + i;
        if (a[o] !== v || a[o + 1] !== v + nx || a[o + 2] !== v + 1
          || a[o + 3] !== v + nx || a[o + 4] !== v + nx + 1 || a[o + 5] !== v + 1) this.validRows = false;
      }
    }
    this.full();
  }

  clearMask(): void { this.support = 'full'; }

  /** Called AFTER the owner copies the actual texture bytes, never before a new mask publication. */
  setMask(data: Uint8Array, grid: SurfaceGrid, texture: Texture): void {
    this.support = 'full';
    this.maskTexture = texture; this.maskVersion = texture.version;
    const { nx, nz } = grid, spacing = Math.fround(grid.spacing), origin = Math.fround(grid.zMin);
    const xOrigin = Math.fround(grid.xMin);
    const image = texture.image as { data?: unknown; width?: unknown; height?: unknown } | undefined;
    if (!Number.isInteger(nx) || !Number.isInteger(nz) || nx < 2 || nz < 2
      || nx > MAX_MASK_SIZE || nz > MAX_MASK_SIZE || data.length !== nx * nz
      || image?.data !== data || image.width !== nx || image.height !== nz
      || !Number.isFinite(xOrigin) || Math.abs(xOrigin) > MAX_TERMS
      || !Number.isFinite(origin) || Math.abs(origin) > MAX_TERMS
      || !Number.isFinite(spacing) || spacing < MIN_MASK_SPACING || spacing > 1) return;
    let first = nz, last = -1;
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) if (data[j * nx + i] > 0) {
      // ClampToEdge repeats a positive border outside the texture: do not truncate that generic case.
      if (j === 0 || j === nz - 1 || i === 0 || i === nx - 1) return;
      if (j < first) first = j; if (j > last) last = j;
    }
    if (last < 0) { this.support = 'empty'; return; }
    this.lowRow = first; this.highRow = last; this.maskOrigin = origin;
    this.maskSpacing = spacing; this.maskSize = nz; this.support = 'bounded';
  }

  /** Current actual parent transform; changes only this already-installed view's draw range. */
  apply(matrix: Matrix4, texture: Texture, heightOnly = true): void {
    // Preserve late external source attribute/index changes even when truncation is ineligible.
    this.view.attributes = this.source.attributes; this.view.index = this.source.index;
    this.view.groups = this.source.groups; this.view.morphAttributes = this.source.morphAttributes;
    this.full();
    if (!heightOnly || this.source.morphAttributes.position?.length || !this.validRows || this.source.getAttribute('position') !== this.position || this.source.index !== this.index
      || this.position!.version !== this.positionVersion || this.index!.version !== this.indexVersion
      || texture.wrapS !== ClampToEdgeWrapping || texture.wrapT !== ClampToEdgeWrapping
      || texture.minFilter !== LinearFilter || texture.magFilter !== LinearFilter || texture.generateMipmaps || texture.flipY) return;
    if (this.support === 'full' || texture !== this.maskTexture || texture.version !== this.maskVersion) return;
    const m = matrix.elements;
    // Nonfinite Y terms could contaminate an ostensibly zero-coupled matrix multiplication.
    for (let k = 0; k < 16; k++) if (!Number.isFinite(m[k])) return;
    // XZ must be independent of displaced Y and each other, with an ordinary affine matrix.
    if (m[2] !== 0 || m[6] !== 0 || m[4] !== 0 || m[8] !== 0
      || m[3] !== 0 || m[7] !== 0 || m[11] !== 0 || m[15] !== 1) return;
    const scale = Math.fround(m[10]), translation = Math.fround(m[14]);
    const xScale = Math.fround(m[0]), xTranslation = Math.fround(m[12]);
    if (!Number.isFinite(scale) || scale <= 0 || !Number.isFinite(translation)
      || !Number.isFinite(xScale) || xScale <= 0 || !Number.isFinite(xTranslation)) return;
    const productBound = scale * Math.max(Math.abs(this.rows[0]), Math.abs(this.rows[this.rows.length - 1]));
    const terms = productBound + Math.abs(translation);
    const xTerms = xScale * this.localXBound + Math.abs(xTranslation);
    if (!Number.isFinite(terms) || terms > MAX_TERMS || !Number.isFinite(xTerms) || xTerms > MAX_TERMS) return;
    if (this.support === 'empty') { this.view.setDrawRange(0, 0); return; }
    // One extra whole mask node beyond exact LINEAR support, plus a conservative arithmetic room.
    const rounding = 16 * U * (terms + Math.abs(this.maskOrigin) + this.maskSpacing * (this.maskSize + 2) + 1);
    if (!Number.isFinite(rounding) || rounding > this.maskSpacing / 4) return;
    const low = this.maskOrigin + (this.lowRow - 2) * this.maskSpacing - rounding;
    const high = this.maskOrigin + (this.highRow + 2) * this.maskSpacing + rounding;
    let first = this.rows.length, last = -1;
    for (let j = 0; j + 1 < this.rows.length; j++) {
      const z0 = scale * this.rows[j] + translation, z1 = scale * this.rows[j + 1] + translation;
      if (z1 >= low && z0 <= high) { if (j < first) first = j; last = j; }
    }
    if (last < 0) { this.view.setDrawRange(0, 0); return; }
    // An extra adjacent primitive row covers boundary rounding; all X columns remain present.
    first = Math.max(0, first - 1); last = Math.min(this.rows.length - 2, last + 1);
    const start = first * this.widthCells * 6, end = (last + 1) * this.widthCells * 6;
    const original = this.source.drawRange;
    const drawStart = Math.max(start, original.start), drawEnd = Math.min(end, original.start + original.count, this.index!.count);
    this.view.setDrawRange(drawStart, Math.max(0, drawEnd - drawStart));
  }

  private full(): void { this.view.setDrawRange(this.source.drawRange.start, this.source.drawRange.count); }
  dispose(): void { this.view.dispose(); }
}
