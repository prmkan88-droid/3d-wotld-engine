/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FastNoise } from './noise';
import { BiomeType, BiomeParameters } from '../types';

export const DEFAULT_BIOME_PARAMS: BiomeParameters = {
  seed: 428309,
  heightScale: 1.0,
  roughness: 1.0,
  biomeScale: 1.0,
  moistureOffset: 0.0,
  temperatureOffset: 0.0,
  mountainSteepness: 1.15,
  valleyDepth: 1.0,
  primaryBiome: 'diverse',
};

export interface BiomeEvaluation {
  height: number;
  biome: BiomeType;
  weights: {
    alpine: number;
    forest: number;
    desert: number;
    meadow: number;
    volcanic: number;
  };
  temperature: number; // in Celsius
  moisture: number;    // 0.0 to 1.0
  slopeRoughness: number;
}

export class BiomeSystem {
  public params: BiomeParameters;
  private noise: FastNoise;
  private moistureNoise: FastNoise;
  private tempNoise: FastNoise;
  private detailNoise: FastNoise;

  constructor(params: BiomeParameters = DEFAULT_BIOME_PARAMS) {
    this.params = { ...params };
    this.noise = new FastNoise(this.params.seed);
    this.moistureNoise = new FastNoise(this.params.seed + 101);
    this.tempNoise = new FastNoise(this.params.seed + 202);
    this.detailNoise = new FastNoise(this.params.seed + 303);
  }

  public setParams(newParams: Partial<BiomeParameters>) {
    const seedChanged = newParams.seed !== undefined && newParams.seed !== this.params.seed;
    this.params = { ...this.params, ...newParams };
    if (seedChanged) {
      this.noise = new FastNoise(this.params.seed);
      this.moistureNoise = new FastNoise(this.params.seed + 101);
      this.tempNoise = new FastNoise(this.params.seed + 202);
      this.detailNoise = new FastNoise(this.params.seed + 303);
    }
  }

  /**
   * Evaluates terrain elevation at coordinates (x, z) taking into account
   * continental landmass, mountain ridged fractals, dune ripples, and caldera depressions.
   */
  public getHeight(x: number, z: number): number {
    const scale = 0.0022 / Math.max(0.2, this.params.biomeScale);
    const cx = x * scale;
    const cz = z * scale;

    // 1. Continental landmass foundation
    const baseLand = this.noise.fbm2D(cx * 0.75, cz * 0.75, 4, 2.0, 0.45);

    // 2. Alpine ridged multi-fractal (sharp peaks)
    const alpineRidges = this.noise.ridgedMF(cx * 2.2, cz * 2.2, 4);

    // 3. Desert dune rolling swells
    const duneWave = Math.sin(cx * 14.0 + cz * 7.0 + this.noise.noise2D(cx * 3.0, cz * 3.0) * 2.0);
    const duneHeight = Math.pow(Math.max(0, (duneWave + 1.0) * 0.5), 1.6) * 14.0;

    // 4. Volcanic caldera caldera depression at northwest quadrant
    const calderaDist = Math.hypot(x + 220, z - 180);
    const calderaMask = Math.exp(-Math.pow(calderaDist / 85.0, 2.0));
    const calderaRim = Math.exp(-Math.pow((calderaDist - 65.0) / 22.0, 2.0)) * 28.0;

    // 5. Lake basin depression near central-south coordinates
    const lakeDist = Math.hypot(x - 20, z + 30);
    const lakeMask = Math.exp(-Math.pow(lakeDist / 95.0, 2.0));

    // Combine layers with height and roughness multipliers
    const mountainFactor = alpineRidges * 65.0 * this.params.mountainSteepness;
    const rollingHills = baseLand * 42.0;
    const micro = this.detailNoise.fbm2D(cx * 8.0, cz * 8.0, 3, 2.2, 0.4) * 4.0 * this.params.roughness;

    let h = (rollingHills + mountainFactor + micro) * this.params.heightScale;

    // Biome influences
    if (this.params.primaryBiome === 'desert') {
      h = (rollingHills * 0.7 + duneHeight + micro * 0.6) * this.params.heightScale;
    } else if (this.params.primaryBiome === 'volcanic') {
      h += calderaRim - calderaMask * 35.0;
    } else if (this.params.primaryBiome === 'alpine') {
      h += mountainFactor * 0.4;
    } else {
      // Diverse default
      h += (calderaRim * 0.6 - calderaMask * 22.0);
      h -= lakeMask * 18.0 * this.params.valleyDepth;
    }

    // Water level threshold is at y = 8.0
    if (h < 6.0) {
      h = 4.0 + (h - 6.0) * 0.35; // smooth lake shelf
    }

    return h;
  }

  /**
   * Detailed evaluation of biome weights, climate attributes, and surface properties.
   */
  public evaluate(x: number, z: number): BiomeEvaluation {
    const height = this.getHeight(x, z);

    // Coordinate sampling for climate
    const climateScale = 0.0018 / Math.max(0.3, this.params.biomeScale);
    const rawMoisture = this.moistureNoise.fbm2D(x * climateScale, z * climateScale, 3, 2.0, 0.5);
    const rawTemp = this.tempNoise.fbm2D((x + 500) * climateScale, (z + 500) * climateScale, 3, 2.0, 0.5);

    // Altitude temperature lapse rate: roughly -0.35°C per world unit of elevation
    const baseTempC = 22.0 + (rawTemp - 0.5) * 20.0 + this.params.temperatureOffset * 25.0;
    const temperatureC = baseTempC - (height - 8.0) * 0.38;

    // Moisture calculation (higher near water at y=8.0, plus humidity noise)
    const waterProximity = Math.max(0, 1.0 - (height - 8.0) / 40.0);
    const moisture = Math.min(1.0, Math.max(0.0, rawMoisture + waterProximity * 0.3 + this.params.moistureOffset));

    // Calculate Biome weights
    // 1. Alpine: High elevation (above 52m) or very cold (< 2°C)
    const alpineWeight = Math.min(1.0, Math.max(0.0, (height - 48.0) / 24.0) + (temperatureC < 4.0 ? 0.5 : 0.0));

    // 2. Volcanic: Northwest sector or high geothermal zone
    const calderaDist = Math.hypot(x + 220, z - 180);
    const volcanicWeight = this.params.primaryBiome === 'volcanic'
      ? 0.95
      : Math.min(1.0, Math.max(0.0, 1.0 - calderaDist / 140.0));

    // 3. Desert: High temperature (> 18°C) and low moisture (< 0.38)
    const desertWeight = this.params.primaryBiome === 'desert'
      ? 0.95
      : Math.min(1.0, Math.max(0.0, (temperatureC - 16.0) / 10.0) * Math.max(0.0, 1.0 - moisture * 2.2));

    // 4. Forest: Moderate elevation, high moisture (> 0.45)
    const forestWeight = this.params.primaryBiome === 'forest'
      ? 0.95
      : Math.min(1.0, Math.max(0.0, (moisture - 0.4) / 0.35) * Math.max(0.0, 1.0 - Math.abs(height - 26.0) / 26.0));

    // 5. Meadow: Balanced temperate valley
    const meadowWeight = this.params.primaryBiome === 'meadow'
      ? 0.95
      : Math.min(1.0, Math.max(0.0, 1.0 - (alpineWeight + volcanicWeight + desertWeight + forestWeight)));

    // Normalize weights
    const total = alpineWeight + forestWeight + desertWeight + meadowWeight + volcanicWeight + 0.0001;
    const weights = {
      alpine: alpineWeight / total,
      forest: forestWeight / total,
      desert: desertWeight / total,
      meadow: meadowWeight / total,
      volcanic: volcanicWeight / total,
    };

    // Determine primary dominant biome
    let dominantBiome: BiomeType = 'meadow';
    let maxW = -1;
    for (const [k, v] of Object.entries(weights)) {
      if (v > maxW) {
        maxW = v;
        dominantBiome = k as BiomeType;
      }
    }

    return {
      height,
      biome: dominantBiome,
      weights,
      temperature: parseFloat(temperatureC.toFixed(1)),
      moisture: parseFloat(moisture.toFixed(2)),
      slopeRoughness: this.params.roughness,
    };
  }
}

// Global default singleton
export const globalBiomeSystem = new BiomeSystem();

/**
 * Global helper matching previous signature for backward compatibility
 */
export function getTerrainHeight(x: number, z: number): number {
  return globalBiomeSystem.getHeight(x, z);
}
