"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeaState = exports.SPECTRUM_RANGE = exports.JONSWAP_GAMMA = void 0;
exports.jonswapShape = jonswapShape;
exports.bandwidthWindow = bandwidthWindow;
const dispersion_1 = require("./dispersion");
const random_1 = require("./random");
exports.JONSWAP_GAMMA = 3.3;
/** JONSWAP spectral shape without the α g² scale, which fromSpectrum normalizes to Hs. */
function jonswapShape(omega, peakOmega, gamma = exports.JONSWAP_GAMMA) {
    if (!(omega > 0))
        return 0;
    const sigma = omega <= peakOmega ? 0.07 : 0.09;
    const r = Math.exp(-((omega - peakOmega) ** 2) / (2 * sigma * sigma * peakOmega * peakOmega));
    return Math.pow(omega, -5) * Math.exp(-1.25 * Math.pow(peakOmega / omega, 4)) * Math.pow(gamma, r);
}
/** Gaussian dispersion window exp(−(ω/ω_p − 1)² / 2w²); 1 everywhere for a non-finite width. */
function bandwidthWindow(omega, peakOmega, bandwidth = Infinity) {
    if (!Number.isFinite(bandwidth))
        return 1;
    const offset = omega / peakOmega - 1;
    return Math.exp(-(offset * offset) / (2 * bandwidth * bandwidth));
}
/** Frequency range the spectrum is sampled over, as multiples of ω_p. */
exports.SPECTRUM_RANGE = { low: 0.5, high: 4 };
/** Draws of a direction that points offshore before one is clamped to shoreward travel (never reached at the game's spreads). */
const MAX_REDRAWS = 64;
/** The most oblique shoreward direction a clamped draw takes, rad. */
const SHOREWARD_LIMIT = Math.PI / 2 - 1e-3;
function clamp(value, low, high) {
    return Math.min(high, Math.max(low, value));
}
/** Tabulated inverse CDF of `density` on [lo, hi] (trapezoid rule, linear inversion). */
function inverseCdf(lo, hi, samples, density) {
    const xs = new Float64Array(samples);
    const cdf = new Float64Array(samples);
    const dx = (hi - lo) / (samples - 1);
    xs[0] = lo;
    let previous = density(lo);
    for (let index = 1; index < samples; index += 1) {
        xs[index] = lo + index * dx;
        const value = density(xs[index]);
        cdf[index] = cdf[index - 1] + 0.5 * (value + previous) * dx;
        previous = value;
    }
    const total = cdf[samples - 1];
    return (u) => {
        const target = Math.min(1, Math.max(0, u)) * total;
        let low = 0;
        let high = samples - 1;
        while (high - low > 1) {
            const middle = (low + high) >> 1;
            if (cdf[middle] < target)
                low = middle;
            else
                high = middle;
        }
        const span = cdf[high] - cdf[low];
        const t = span > 0 ? (target - cdf[low]) / span : 0;
        return xs[low] + t * (xs[high] - xs[low]);
    };
}
/** A linear sea: a fixed set of seeded Airy components over a reference depth. */
class SeaState {
    depth;
    waveNumberAt;
    components;
    constructor(components, depth, waveNumberAt = dispersion_1.exactWaveNumber) {
        this.depth = depth;
        this.waveNumberAt = waveNumberAt;
        this.components = components.map((component) => {
            const k = waveNumberAt(component.omega, depth);
            return { ...component, k, kx: k * Math.sin(component.direction), kz: k * Math.cos(component.direction) };
        });
    }
    /**
     * Split a JONSWAP spectrum into equal-energy frequency bins and draw each bin's
     * frequency, direction (cos-2s, clipped to shoreward travel), and phase from the
     * seed. Equal energy per component makes the realized Hs exact.
     */
    static fromSpectrum(params, seed, waveNumberAt = dispersion_1.exactWaveNumber) {
        const count = Math.max(1, Math.floor(params.componentCount));
        const peakOmega = (2 * Math.PI) / params.peakPeriod;
        const frequencyAt = inverseCdf(exports.SPECTRUM_RANGE.low * peakOmega, exports.SPECTRUM_RANGE.high * peakOmega, 2048, (omega) => jonswapShape(omega, peakOmega) * bandwidthWindow(omega, peakOmega, params.bandwidth));
        const halfWidth = Math.PI / 2;
        const s = Math.max(0, params.spreading);
        const directionAt = inverseCdf(-halfWidth, halfWidth, 721, (theta) => Math.pow(Math.cos(theta / 2), 2 * s));
        const amplitude = params.significantHeight / Math.sqrt(8 * count);
        const random = (0, random_1.seededRandom)(seed, 0x5eaa57a7);
        const components = [];
        for (let index = 0; index < count; index += 1) {
            const omega = frequencyAt((index + 0.25 + 0.5 * random()) / count);
            // Spread about an oblique mean, a draw can point offshore: it is drawn again (a cos-2s sea truncated to
            // shoreward travel). The warm start's flux ratio is negative for it, and its shoal went non-finite.
            let direction = params.direction + directionAt(random());
            for (let redraw = 0; redraw < MAX_REDRAWS && !(Math.abs(direction) < halfWidth); redraw += 1) {
                direction = params.direction + directionAt(random());
            }
            if (!(Math.abs(direction) < halfWidth))
                direction = clamp(direction, -SHOREWARD_LIMIT, SHOREWARD_LIMIT);
            components.push({ amplitude, omega, direction, phase: 2 * Math.PI * random() });
        }
        return new SeaState(components, params.depth, waveNumberAt);
    }
    /** Linear surface elevation η(x, z, t) = Σ a cos(k·x − ωt + φ), m. */
    elevation(x, z, t) {
        let eta = 0;
        for (const component of this.components) {
            eta += component.amplitude * Math.cos(component.kx * x + component.kz * z - component.omega * t + component.phase);
        }
        return eta;
    }
    /** Depth-averaged horizontal flow from linear continuity, ū = η ω / (k h) along each component, m/s. */
    depthAveragedVelocity(x, z, t) {
        const flow = { x: 0, z: 0 };
        if (!Number.isFinite(this.depth))
            return flow;
        for (const component of this.components) {
            const speed = (component.amplitude * component.omega) / (component.k * this.depth)
                * Math.cos(component.kx * x + component.kz * z - component.omega * t + component.phase);
            flow.x += speed * Math.sin(component.direction);
            flow.z += speed * Math.cos(component.direction);
        }
        return flow;
    }
    /** Wave-group envelope |Σ a e^{iψ}|; its slow beats are the sets, m. */
    envelope(x, z, t) {
        let real = 0;
        let imaginary = 0;
        for (const component of this.components) {
            const psi = component.kx * x + component.kz * z - component.omega * t + component.phase;
            real += component.amplitude * Math.cos(psi);
            imaginary += component.amplitude * Math.sin(psi);
        }
        return Math.hypot(real, imaginary);
    }
    /** First set peak after `fromTime`: an envelope maximum within 90 % of the horizon's largest, s. */
    nextSetPeak(x, z, fromTime, horizon = 600, step = 0.25) {
        const count = Math.max(3, Math.ceil(horizon / step) + 1);
        const values = new Float64Array(count);
        let largest = 0;
        let largestIndex = 0;
        for (let index = 0; index < count; index += 1) {
            values[index] = this.envelope(x, z, fromTime + index * step);
            if (values[index] > largest) {
                largest = values[index];
                largestIndex = index;
            }
        }
        for (let index = 1; index < count - 1; index += 1) {
            const value = values[index];
            if (value < 0.9 * largest || value < values[index - 1] || value < values[index + 1])
                continue;
            const curvature = values[index - 1] - 2 * value + values[index + 1];
            const offset = curvature < 0 ? (0.5 * (values[index - 1] - values[index + 1])) / curvature : 0;
            return fromTime + (index + offset) * step;
        }
        return fromTime + largestIndex * step;
    }
    get significantHeight() {
        let m0 = 0;
        for (const component of this.components)
            m0 += 0.5 * component.amplitude * component.amplitude;
        return 4 * Math.sqrt(m0);
    }
}
exports.SeaState = SeaState;
