/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type WeatherType = 'clear' | 'sunset' | 'storm' | 'fog' | 'aurora' | 'sandstorm';

export type BiomeType = 'alpine' | 'forest' | 'desert' | 'meadow' | 'volcanic';

export type ColorGradingPreset = 
  | 'natural' 
  | 'cinematic-warm' 
  | 'nordic-cool' 
  | 'moody-noir' 
  | 'cyber-neon' 
  | 'vibrant';

export type CameraMode = 'cutscene' | 'free' | 'static' | 'firstPerson' | 'orbit';

export type CutscenePresetId = 
  | 'mountain_crest' 
  | 'golden_hour_ridge' 
  | 'storm_descent' 
  | 'aurora_nocturne' 
  | 'orbit_panorama'
  | 'biome_grand_tour'
  | 'canyon_slalom';

export type QualityPreset = 'mobile-perf' | 'high-100fps' | 'ultra-120fps';

export interface StaticVantagePoint {
  id: string;
  name: string;
  pos: [number, number, number];
  lookAt: [number, number, number];
  biome: BiomeType;
  description: string;
  fov?: number;
}

export interface CutsceneKeyframe {
  pos: [number, number, number];
  lookAt: [number, number, number];
  fov?: number;
  duration: number; // in seconds
  description: string;
}

export interface CutsceneTrajectory {
  id: CutscenePresetId;
  name: string;
  tagline: string;
  durationSec: number;
  keyframes: CutsceneKeyframe[];
  recommendedWeather: WeatherType;
  recommendedTime: number; // 0-24
}

export interface PointOfInterest {
  id: string;
  name: string;
  tagline: string;
  biome: BiomeType;
  pos: [number, number, number];
  altitudeMeters: number;
  temperatureC: number;
  description: string;
  lore: string;
  iconType: 'peak' | 'forest' | 'desert' | 'water' | 'volcano' | 'ruins';
  custom?: boolean;
}

export interface BiomeParameters {
  seed: number;
  heightScale: number; // 0.5 - 2.0
  roughness: number;   // 0.5 - 2.0
  biomeScale: number;  // 0.5 - 2.0
  moistureOffset: number; // -0.5 (arid/desert) to +0.5 (wet/forest)
  temperatureOffset: number; // -0.5 (glacial) to +0.5 (tropical)
  mountainSteepness: number;
  valleyDepth: number;
  primaryBiome: BiomeType | 'diverse';
}

export interface EnvironmentalSettings {
  reactiveFoliage: boolean;
  wildlifeFlocks: boolean;
  groundWildlife: boolean;
  ambientParticles: boolean; // falling leaves, spores, pebbles
  wildlifeScatterDistance: number;
}

export interface EngineStats {
  fps: number;
  targetFps: number;
  frameTimeMs: number;
  drawCalls: number;
  triangles: number;
  totalChunks: number;
  renderedChunks: number;
  culledChunks: number;
  lodCounts: [number, number, number, number]; // chunks at LOD 0, 1, 2, 3
  memoryMb: number;
  gpuRenderer: string;
  resolution: string;
}

export interface EnvironmentSettings {
  timeOfDay: number; // 0 to 24
  dayCycleSpeed: number; // 0 = paused, 1 = realtime, 10 = fast
  isCycleActive: boolean;
  weather: WeatherType;
  fogDensity: number;
  windSpeed: number;
  
  // Post-processing
  bloomEnabled: boolean;
  bloomIntensity: number;
  motionBlurEnabled: boolean;
  motionBlurIntensity: number;
  colorGrading: ColorGradingPreset;
  exposure: number;
  contrast: number;
  saturation: number;
  vignetteEnabled: boolean;
  chromaticAberration: boolean;
  
  // Advanced Volumetrics & Lighting
  volumetricRays: boolean;
  rayIntensity: number;
  shadowsEnabled: boolean;
  waterReflections: boolean;
  
  // Optimisation & LOD
  lodBias: number; // 0.5 = performance, 1.0 = balanced, 1.5 = ultra detail
  occlusionCulling: boolean;
  targetFps: number; // 60, 100, 120
  qualityPreset: QualityPreset;
}

export interface AIDirectorResponse {
  directorMessage: string;
  timeOfDay: number;
  weather: WeatherType;
  fogDensity: number;
  bloomIntensity: number;
  exposure: number;
  motionBlur: number;
  colorGrading: ColorGradingPreset;
  cameraTourPreset: CutscenePresetId;
  loreNarrative: string;
}
