"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CrestRayPlan = void 0;
exports.minimumCrestRaySpacing = minimumCrestRaySpacing;
exports.authoredCrestReach = authoredCrestReach;
const frontRecords_1 = require("./frontRecords");
const ProfileLibrary_1 = require("./ProfileLibrary");
/**
 * Base slices divide a span of at least 2*extension into ceil(span/spacing) intervals; refinement halves them.
 * Since ceil(a)<a+1, this lower bound also covers very short fronts and nonintegral spans.
 */
function minimumCrestRaySpacing(extension, spacing) {
    return (0.5 * spacing * (2 * extension)) / (2 * extension + spacing);
}
/** A phase-independent authored reach, in case units. Frame blending preserves these crest-relative bounds. */
function authoredCrestReach(cases, slope, points, crest) {
    if (cases.length === 0)
        return new Float64Array(2);
    let closest = cases[0].slope;
    for (const c of cases)
        if (Math.abs(c.slope - slope) < Math.abs(closest - slope))
            closest = c.slope;
    let low = Infinity;
    let high = -Infinity;
    for (const c of cases) {
        if (c.slope !== closest)
            continue;
        for (let f = 0; f < c.frames.length; f += 2 * points) {
            const origin = c.frames[f + 2 * crest];
            for (let j = 0; j < points; j += 1) {
                const along = c.frames[f + 2 * j] - origin;
                if (!Number.isFinite(along))
                    throw new RangeError('Non-finite authored crest reach');
                low = Math.min(low, along);
                high = Math.max(high, along);
            }
        }
    }
    return new Float64Array([low, high]);
}
/** Immutable authored library data is shared by the drawing, contact and crash plans. */
const envelopes = new WeakMap();
/**
 * One phase/tessellation-independent ray authority over a complete front and its shoulder extensions. Both input
 * paths capture the same float32 transport controls. The raw vector V=C(sigma+2)-C(sigma-2) is piecewise linear;
 * shifted control knots bound its length and nearby source derivative pairs bound its normalized derivative at every
 * sigma, including between drawn rows. The nearby-pair bound stays continuous when shifted knots coincide.
 * For any pair separated by dSigma, BOTH endpoint tangent advances are at least
 * dSigma*(B-U*D-R*(1-lambda)*Omega/L): B=min C'·Tref, U=max|C'|, R=profile reach,
 * D=max|n-nref|, Omega=max|nRaw'| and L=min|blend|. Own-profile offsets cancel at their own endpoints.
 */
class CrestRayPlan {
    library;
    slope;
    extension;
    minSpacing;
    diagnostics = { blend: 0, minimumAdvancePerSigma: 0, invalidIntervals: 0 };
    envelope;
    lowCase;
    highCase;
    count = 0;
    x = new Float64Array(0);
    z = new Float64Array(0);
    sigma = new Float64Array(0);
    height = new Float64Array(0);
    depth = new Float64Array(0);
    knots = new Float64Array(0);
    derivativeX = new Float64Array(0);
    derivativeZ = new Float64Array(0);
    a = new Float64Array(2);
    b = new Float64Array(2);
    v = new Float64Array(2);
    referenceX = 0;
    referenceZ = 1;
    constructor(library, slope, extension = 1.5, minSpacing = minimumCrestRaySpacing(extension, 0.5)) {
        this.library = library;
        this.slope = slope;
        this.extension = extension;
        this.minSpacing = minSpacing;
        let bySlope = envelopes.get(library);
        if (!bySlope) {
            bySlope = new Map();
            envelopes.set(library, bySlope);
        }
        let envelope = bySlope.get(slope);
        if (!envelope) {
            envelope = authoredCrestReach(library.cases, slope, ProfileLibrary_1.PROFILE_POINTS, ProfileLibrary_1.LANDMARK.crest);
            bySlope.set(slope, envelope);
        }
        this.envelope = envelope;
        let closest = library.cases[0]?.slope ?? slope;
        for (const c of library.cases)
            if (Math.abs(c.slope - slope) < Math.abs(closest - slope))
                closest = c.slope;
        let low = Infinity;
        let high = -Infinity;
        for (const c of library.cases)
            if (c.slope === closest) {
                low = Math.min(low, c.nonlinearity);
                high = Math.max(high, c.nonlinearity);
            }
        this.lowCase = low;
        this.highCase = high;
    }
    prepare(controls, start = 0, end = controls.length) {
        this.load(end - start, (i, key) => controls[start + i][key]);
    }
    prepareRecords(records, start, end) {
        this.load(end - start, (i, key) => records[(start + i) * frontRecords_1.FRONT_STRIDE + frontRecords_1.FRONT_FIELD[key]]);
    }
    load(count, read) {
        if (this.x.length < count) {
            const capacity = Math.max(count, 2 * this.x.length);
            this.x = new Float64Array(capacity);
            this.z = new Float64Array(capacity);
            this.sigma = new Float64Array(capacity);
            this.height = new Float64Array(capacity);
            this.depth = new Float64Array(capacity);
            this.knots = new Float64Array(2 * capacity + 4);
            this.derivativeX = new Float64Array(capacity + 1);
            this.derivativeZ = new Float64Array(capacity + 1);
        }
        this.count = count;
        this.diagnostics.blend = 0;
        this.diagnostics.minimumAdvancePerSigma = 0;
        this.diagnostics.invalidIntervals = 0;
        for (let k = 0; k < count; k += 1) {
            this.x[k] = Math.fround(read(k, 'x'));
            this.z[k] = Math.fround(read(k, 'z'));
            this.sigma[k] = Math.fround(read(k, 'sigma'));
            this.height[k] = Math.fround(read(k, 'footHeight'));
            this.depth[k] = Math.fround(read(k, 'footDepth'));
            if (!Number.isFinite(this.x[k]) || !Number.isFinite(this.z[k]) || !Number.isFinite(this.sigma[k])
                || !Number.isFinite(this.height[k]) || !Number.isFinite(this.depth[k]))
                throw new RangeError('Non-finite front ray control');
            if (k > 0 && (!(this.x[k] > this.x[k - 1]) || !(this.sigma[k] > this.sigma[k - 1])))
                this.diagnostics.invalidIntervals += 1;
        }
        if (count < 2 || this.diagnostics.invalidIntervals > 0)
            return;
        this.prepareBound();
    }
    prepareBound() {
        const last = this.count - 1;
        let lowSlope = -Infinity;
        let highSlope = Infinity;
        let maximumCoordinate = 0;
        let maximumScale = 0;
        for (let k = 0; k <= last; k += 1) {
            maximumCoordinate = Math.max(maximumCoordinate, Math.abs(this.x[k]), Math.abs(this.z[k]));
            maximumScale = Math.max(maximumScale, this.library.caseBlend({ slope: this.slope,
                footHeight: this.height[k], footDepth: this.depth[k] }).scale);
            if (k === last)
                continue;
            const dx = this.x[k + 1] - this.x[k];
            const dz = this.z[k + 1] - this.z[k];
            if (dz > 0)
                lowSlope = Math.max(lowSlope, -dx / dz);
            if (dz < 0)
                highSlope = Math.min(highSlope, -dx / dz);
            // Scale is linear within the below/inside/above-library branches. A branch crossing can be an interior maximum.
            for (let side = 0; side < 2; side += 1) {
                const edge = side === 0 ? this.lowCase : this.highCase;
                const a = this.height[k] - edge * this.depth[k];
                const b = this.height[k + 1] - edge * this.depth[k + 1];
                if ((a < 0 && b > 0) || (a > 0 && b < 0)) {
                    const share = a / (a - b);
                    maximumScale = Math.max(maximumScale, this.depth[k] + share * (this.depth[k + 1] - this.depth[k]));
                }
            }
        }
        let slope = (this.z[last] - this.z[0]) / (this.x[last] - this.x[0]);
        if (lowSlope !== -Infinity)
            slope = Math.max(slope, 0.9 * lowSlope);
        if (highSlope !== Infinity)
            slope = Math.min(slope, 0.9 * highSlope);
        const norm = Math.sqrt(1 + slope * slope);
        const tx = 1 / norm;
        const tz = slope / norm;
        this.referenceX = -tz;
        this.referenceZ = tx;
        let speed = 1;
        let progress = Infinity;
        for (let k = 0; k < last; k += 1) {
            const dx = this.x[k + 1] - this.x[k];
            const dz = this.z[k + 1] - this.z[k];
            const length = Math.sqrt(dx * dx + dz * dz);
            const ds = this.sigma[k + 1] - this.sigma[k];
            this.derivativeX[k + 1] = dx / ds;
            this.derivativeZ[k + 1] = dz / ds;
            if (k === 0) {
                this.derivativeX[0] = dx / length;
                this.derivativeZ[0] = dz / length;
            }
            if (k + 1 === last) {
                this.derivativeX[this.count] = dx / length;
                this.derivativeZ[this.count] = dz / length;
            }
            speed = Math.max(speed, length / ds);
            progress = Math.min(progress, (dx * tx + dz * tz) / ds);
            if (k === 0 || k + 1 === last)
                progress = Math.min(progress, (dx * tx + dz * tz) / length);
        }
        const reach = Math.max(Math.abs(this.envelope[0]), Math.abs(this.envelope[1])) * maximumScale + this.extension;
        const from = this.sigma[0] - this.extension;
        const to = this.sigma[last] + this.extension;
        let used = 0;
        this.knots[used++] = from;
        this.knots[used++] = to;
        for (let k = 0; k <= last; k += 1) {
            const left = this.sigma[k] - 2;
            const right = this.sigma[k] + 2;
            if (left > from && left < to)
                this.knots[used++] = left;
            if (right > from && right < to)
                this.knots[used++] = right;
        }
        this.knots.subarray(0, used).sort();
        let minimumVectorLength = Infinity;
        let cosine = 1;
        this.rawVector(this.knots[0], this.a);
        for (let k = 1; k < used; k += 1) {
            const ds = this.knots[k] - this.knots[k - 1];
            if (!(ds > 0))
                continue;
            this.rawVector(this.knots[k], this.b);
            const dx = this.b[0] - this.a[0];
            const dz = this.b[1] - this.a[1];
            const squared = dx * dx + dz * dz;
            const share = squared > 0 ? Math.max(0, Math.min(1, -(this.a[0] * dx + this.a[1] * dz) / squared)) : 0;
            const mx = this.a[0] + share * dx;
            const mz = this.a[1] + share * dz;
            const minimumLength = Math.sqrt(mx * mx + mz * mz);
            if (!(minimumLength > 1e-9)) {
                this.diagnostics.invalidIntervals += 1;
                return;
            }
            minimumVectorLength = Math.min(minimumVectorLength, minimumLength);
            const la = Math.sqrt(this.a[0] * this.a[0] + this.a[1] * this.a[1]);
            const lb = Math.sqrt(this.b[0] * this.b[0] + this.b[1] * this.b[1]);
            cosine = Math.min(cosine, (this.a[0] * tx + this.a[1] * tz) / la, (this.b[0] * tx + this.b[1] * tz) / lb);
            this.a[0] = this.b[0];
            this.a[1] = this.b[1];
        }
        // V'=C'(sigma+2)-C'(sigma-2). Every actual derivative pair's source intervals are at most 4m apart. An exact
        // maximum over shifted-knot intervals can jump when a vanishing interval changes which pair is present. Instead
        // bound nearby pairs with weight 1 through 4m and a continuous fade to 0 at 5m. Extra pairs only make the bound
        // conservative; every actual pair retains weight 1. The maximum and global minimum |V| vary continuously as
        // source knots pass each other, so a disappearing tiny interval cannot pop the whole front's blend.
        let derivativeDifference = 0;
        for (let i = 0; i <= this.count; i += 1) {
            const end = i < this.count ? this.sigma[i] : to + 2;
            for (let j = i + 1; j <= this.count; j += 1) {
                const start = this.sigma[j - 1];
                const gap = Math.max(0, start - end);
                if (gap >= 5)
                    break;
                const weight = Math.min(1, 5 - gap);
                const dx = this.derivativeX[j] - this.derivativeX[i];
                const dz = this.derivativeZ[j] - this.derivativeZ[i];
                derivativeDifference = Math.max(derivativeDifference, weight * Math.sqrt(dx * dx + dz * dz));
            }
        }
        const omega = derivativeDifference / minimumVectorLength;
        cosine = Math.max(0, Math.min(1, cosine));
        const distance = Math.sqrt(2 - 2 * cosine);
        const rounding = (4 * (maximumCoordinate + reach + this.extension) + 1) / (1_048_576 * this.minSpacing);
        const target = 0.05 * progress + rounding;
        const bound = (weight) => {
            const u = 1 - weight;
            const length = Math.sqrt(1 - 2 * u * weight * (1 - cosine));
            return progress - (u / length) * (2 * speed * distance + reach * omega);
        };
        if (target >= progress) {
            this.diagnostics.invalidIntervals += 1;
            this.diagnostics.blend = 1;
            return;
        }
        if (bound(0) >= target) {
            this.diagnostics.minimumAdvancePerSigma = bound(0);
            return;
        }
        let lower = 0;
        let upper = 1;
        for (let k = 0; k < 24; k += 1) {
            const middle = (lower + upper) / 2;
            if (bound(middle) >= target)
                upper = middle;
            else
                lower = middle;
        }
        this.diagnostics.blend = upper;
        this.diagnostics.minimumAdvancePerSigma = bound(upper);
    }
    /** Evaluate the original polyline/extrapolation arithmetic over captured transport controls. */
    pointAt(at, into) {
        const last = this.count - 1;
        if (at <= this.sigma[0] || at >= this.sigma[last]) {
            const k = at <= this.sigma[0] ? 0 : last;
            const neighbor = k === 0 ? 1 : last - 1;
            const dx = this.x[k] - this.x[neighbor];
            const dz = this.z[k] - this.z[neighbor];
            const length = Math.sqrt(dx * dx + dz * dz);
            const beyond = k === 0 ? this.sigma[0] - at : at - this.sigma[last];
            into[0] = this.x[k];
            into[1] = this.z[k];
            if (length > 1e-9) {
                into[0] += (beyond * dx) / length;
                into[1] += (beyond * dz) / length;
            }
            return;
        }
        let low = 1;
        let high = last;
        while (low < high) {
            const mid = (low + high) >>> 1;
            if (this.sigma[mid] < at)
                low = mid + 1;
            else
                high = mid;
        }
        const k = low - 1;
        const ds = this.sigma[k + 1] - this.sigma[k];
        const share = ds > 1e-12 ? (at - this.sigma[k]) / ds : 0;
        into[0] = this.x[k] + share * (this.x[k + 1] - this.x[k]);
        into[1] = this.z[k] + share * (this.z[k + 1] - this.z[k]);
    }
    rawVector(at, into) {
        this.pointAt(at + 2, this.v);
        const x = this.v[0];
        const z = this.v[1];
        this.pointAt(at - 2, this.v);
        into[0] = x - this.v[0];
        into[1] = z - this.v[1];
    }
    rayAt(sigma, into) {
        if (this.count < 2) {
            into[0] = 0;
            into[1] = 1;
            return into;
        }
        this.rawVector(sigma, into);
        const length = Math.sqrt(into[0] * into[0] + into[1] * into[1]);
        if (length > 1e-9) {
            into[0] /= length;
            into[1] /= length;
        }
        else {
            into[0] = 1;
            into[1] = 0;
        }
        const nx = -into[1];
        const nz = into[0];
        const weight = this.diagnostics.blend;
        if (weight === 0) {
            into[0] = nx;
            into[1] = nz;
            return into;
        }
        into[0] = nx + weight * (this.referenceX - nx);
        into[1] = nz + weight * (this.referenceZ - nz);
        const n = Math.sqrt(into[0] * into[0] + into[1] * into[1]);
        into[0] /= n;
        into[1] /= n;
        return into;
    }
}
exports.CrestRayPlan = CrestRayPlan;
