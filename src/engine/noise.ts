/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Fast deterministic 2D and 3D Simplex-style noise implementation
export class FastNoise {
  private perm: Uint8Array = new Uint8Array(512);

  constructor(seed = 1337) {
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }
    // Mulberry32-based shuffle
    let s = seed | 0;
    for (let i = 255; i > 0; i--) {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      const j = ((t ^ (t >>> 14)) >>> 0) % (i + 1);
      const tmp = p[i];
      p[i] = p[j];
      p[j] = tmp;
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  private grad2(hash: number, x: number, y: number): number {
    const h = hash & 7;
    const u = h < 4 ? x : y;
    const v = h < 4 ? y : x;
    return ((h & 1) !== 0 ? -u : u) + ((h & 2) !== 0 ? -2.0 * v : 2.0 * v);
  }

  public noise2D(xin: number, yin: number): number {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

    let n0 = 0, n1 = 0, n2 = 0;
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;

    let i1 = 0, j1 = 0;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * this.grad2(this.perm[ii + this.perm[jj]], x0, y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * this.grad2(this.perm[ii + i1 + this.perm[jj + j1]], x1, y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * this.grad2(this.perm[ii + 1 + this.perm[jj + 1]], x2, y2);
    }

    return 70.0 * (n0 + n1 + n2);
  }

  // Fractional Brownian Motion (fBm) multi-octave noise
  public fbm2D(x: number, y: number, octaves = 5, lacunarity = 2.0, gain = 0.5): number {
    let total = 0;
    let frequency = 1.0;
    let amplitude = 1.0;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      total += this.noise2D(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      frequency *= lacunarity;
      amplitude *= gain;
    }

    return total / maxValue;
  }

  // Ridged multi-fractal noise for sharp alpine mountain ridges
  public ridgedMF(x: number, y: number, octaves = 4): number {
    let sum = 0;
    let freq = 1.0;
    let amp = 0.5;
    let prev = 1.0;

    for (let i = 0; i < octaves; i++) {
      let n = Math.abs(this.noise2D(x * freq, y * freq));
      n = 1.0 - n; // invert
      n = n * n; // sharpen ridges
      sum += n * amp * prev;
      prev = n;
      freq *= 2.1;
      amp *= 0.5;
    }
    return sum;
  }
}

// Global noise instance with fixed seed for deterministic terrain
export const globalNoise = new FastNoise(428309);

/**
 * Returns terrain elevation in world coordinates (Y),
 * with realistic continental shape, alpine crags, foothills, and lake basins.
 */
export function getTerrainHeight(x: number, z: number): number {
  const scale = 0.0022;
  const cx = x * scale;
  const cz = z * scale;

  // Base continental landmass
  const baseLand = globalNoise.fbm2D(cx * 0.7, cz * 0.7, 4, 2.0, 0.45);

  // Sharp mountain ridges
  const mountainRidges = globalNoise.ridgedMF(cx * 2.2, cz * 2.2, 4);

  // Micro crag detail
  const microDetail = globalNoise.fbm2D(cx * 8.0, cz * 8.0, 3, 2.2, 0.4) * 4.0;

  // Lake depression mask near center
  const distFromCenter = Math.sqrt(x * x + z * z);
  const lakeBasin = Math.sin(x * 0.003) * Math.cos(z * 0.003) * 12.0;

  let h = baseLand * 45.0 + mountainRidges * 65.0 + microDetail + lakeBasin;

  // Water level is at y = 8.0
  // Natural shoreline transition
  if (h < 6.0) {
    h = 4.0 + (h - 6.0) * 0.35; // smooth lake bottom
  }

  return h;
}
