/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { EngineStats, EnvironmentSettings, CutscenePresetId, CameraMode, BiomeParameters, PointOfInterest } from '../types';
import { SkyAtmosphere } from './skyAtmosphere';
import { WeatherSystem } from './weatherParticles';
import { VolumetricRays } from './volumetricRays';
import { TerrainLODManager } from './lodManager';
import { createTerrainMaterial, createWaterMaterial } from './terrainShaders';
import { CinematicDirector } from './cinematicDirector';
import { PostProcessingStack } from './postProcessing';
import { POIManager } from './poiMarkers';
import { EnvironmentalElements } from './environmentalElements';
import { BiomeSystem, globalBiomeSystem } from './biomeSystem';

export class WorldEngine {
  private container: HTMLElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public cameraController: CinematicDirector;
  public cinematicDirector: CinematicDirector;

  // Components
  public sky: SkyAtmosphere;
  public weatherSystem: WeatherSystem;
  public volumetricRays: VolumetricRays;
  public lodManager: TerrainLODManager;
  public postProcessing: PostProcessingStack;
  public poiManager: POIManager;
  public environmentalElements: EnvironmentalElements;
  public biomeSystem: BiomeSystem;

  // Scene Objects
  private dirLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private waterMesh: THREE.Mesh;
  private terrainMaterial: THREE.ShaderMaterial;
  private waterMaterial: THREE.ShaderMaterial;

  // Animation & Telemetry State
  private isRunning = false;
  private animFrameId = 0;
  private lastTime = performance.now();
  private frameCount = 0;
  private fpsUpdateTime = performance.now();
  private currentFps = 100;
  private currentFrameTime = 10.0;
  private gpuName = 'WebGL2 GPU';

  // Environment Settings
  public settings: EnvironmentSettings = {
    timeOfDay: 11.0,
    dayCycleSpeed: 0.25,
    isCycleActive: true,
    weather: 'clear',
    fogDensity: 0.0028,
    windSpeed: 1.0,

    bloomEnabled: true,
    bloomIntensity: 0.75,
    motionBlurEnabled: true,
    motionBlurIntensity: 0.35,
    colorGrading: 'cinematic-warm',
    exposure: 1.1,
    contrast: 1.05,
    saturation: 1.15,
    vignetteEnabled: true,
    chromaticAberration: true,

    volumetricRays: true,
    rayIntensity: 0.65,
    shadowsEnabled: true,
    waterReflections: true,

    lodBias: 1.0,
    occlusionCulling: true,
    targetFps: 100,
    qualityPreset: 'high-100fps',
  };

  public onStatsUpdate?: (stats: EngineStats) => void;
  public onSelectPOI?: (poi: PointOfInterest | null) => void;

  constructor(container: HTMLElement) {
    this.container = container;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. WebGL2 High-Performance Renderer
    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: false,
      stencil: false,
      depth: true,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    // Get GPU Name from WebGL Context
    try {
      const gl = this.renderer.getContext();
      const dbgRenderInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (dbgRenderInfo) {
        this.gpuName = gl.getParameter(dbgRenderInfo.UNMASKED_RENDERER_WEBGL) || 'Mobile WebGL2';
      }
    } catch {
      this.gpuName = 'Hardware Accelerated GPU';
    }

    // 2. Scene & Camera & Cinematic Director
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(65, width / height, 0.5, 2500);
    this.cinematicDirector = new CinematicDirector(this.camera);
    this.cameraController = this.cinematicDirector;
    this.biomeSystem = globalBiomeSystem;

    // 3. Lighting
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 50;
    this.dirLight.shadow.camera.far = 1200;
    const d = 350;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0006;
    this.scene.add(this.dirLight);

    // 4. Sky & Atmosphere
    this.sky = new SkyAtmosphere();
    this.sky.getObjects().forEach((obj) => this.scene.add(obj));

    // 5. Volumetric Light Shafts
    this.volumetricRays = new VolumetricRays();
    this.scene.add(this.volumetricRays.group);

    // 6. Terrain Material & LOD Grid
    this.terrainMaterial = createTerrainMaterial({
      sunDirection: { value: new THREE.Vector3(0.5, 1.0, 0.3).normalize() },
      sunColor: { value: new THREE.Color(0xfff0d8) },
      ambientColor: { value: new THREE.Color(0x354050) },
      fogColor: { value: new THREE.Color(0x7590b5) },
      fogDensity: { value: this.settings.fogDensity },
      time: { value: 0 },
      wetness: { value: 0 },
      sandColor: { value: new THREE.Color(0xd6be8e) },
      grassColor: { value: new THREE.Color(0x386e30) },
      rockColor: { value: new THREE.Color(0x615c58) },
      snowColor: { value: new THREE.Color(0xf0f5ff) },
    });

    this.lodManager = new TerrainLODManager(this.terrainMaterial);
    this.scene.add(this.lodManager.group);

    // 7. Water Surface (y = 8.0)
    const waterGeo = new THREE.PlaneGeometry(1600, 1600, 96, 96);
    waterGeo.rotateX(-Math.PI / 2);
    this.waterMaterial = createWaterMaterial({
      sunDirection: { value: new THREE.Vector3(0.5, 1.0, 0.3).normalize() },
      sunColor: { value: new THREE.Color(0xfff0d8) },
      ambientColor: { value: new THREE.Color(0x354050) },
      fogColor: { value: new THREE.Color(0x7590b5) },
      fogDensity: { value: this.settings.fogDensity },
      time: { value: 0 },
    });
    this.waterMesh = new THREE.Mesh(waterGeo, this.waterMaterial);
    this.waterMesh.position.y = 8.0;
    this.scene.add(this.waterMesh);

    // 8. Dynamic Weather Particles
    this.weatherSystem = new WeatherSystem();
    this.scene.add(this.weatherSystem.group);

    // 9. Interactive POI Markers
    this.poiManager = new POIManager();
    this.poiManager.onSelectPOI = (poi) => {
      if (this.onSelectPOI) {
        this.onSelectPOI(poi);
      }
    };
    this.scene.add(this.poiManager.group);

    // 10. Interactive Environmental Elements (Foliage, Wildlife Flocks, Physics Particles)
    this.environmentalElements = new EnvironmentalElements();
    this.scene.add(this.environmentalElements.group);

    // 11. Post-Processing Stack (ACES, Bloom, Motion Blur, Color Grading)
    this.postProcessing = new PostProcessingStack(this.renderer, width, height);

    // Window Resize Handler
    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);

    // Keyboard bindings for Camera
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    // Pointer event on canvas for POI clicks
    this.onPointerDown = this.onPointerDown.bind(this);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);

    // Start Render Loop
    this.start();
  }

  private onPointerDown(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const hitPOI = this.poiManager.handleRaycast(x, y, this.camera);
    if (!hitPOI && this.poiManager.selectedPOIId) {
      this.poiManager.selectPOI(null);
      if (this.onSelectPOI) this.onSelectPOI(null);
    }
  }

  public flyToPOI(poiId: string) {
    const poi = this.poiManager.pois.find((p) => p.id === poiId);
    if (!poi) return;

    this.poiManager.selectPOI(poiId);
    // Camera approach point 24m back and 14m elevated
    const targetCamPos: [number, number, number] = [
      poi.pos[0] + 22,
      poi.pos[1] + 14,
      poi.pos[2] + 24,
    ];
    this.cinematicDirector.flyTo({
      position: targetCamPos,
      lookAt: [poi.pos[0], poi.pos[1] + 4, poi.pos[2]],
      fov: 62,
      durationSec: 3.0,
      onComplete: () => {
        this.cinematicDirector.currentKeyframeText = `Approaching: ${poi.name}`;
      },
    });
  }

  public regenerateProceduralWorld(params?: Partial<BiomeParameters>) {
    if (params) {
      this.biomeSystem.setParams(params);
    }
    this.lodManager.updateGeometryHeights();
    this.poiManager.rebuildMarkers();
  }

  private onResize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.postProcessing.setSize(width, height);
  }

  private onKeyDown(e: KeyboardEvent) {
    this.cameraController.keys[e.code] = true;
  }

  private onKeyUp(e: KeyboardEvent) {
    this.cameraController.keys[e.code] = false;
  }

  public setQualityPreset(preset: 'mobile-perf' | 'high-100fps' | 'ultra-120fps') {
    this.settings.qualityPreset = preset;
    if (preset === 'mobile-perf') {
      this.renderer.setPixelRatio(1.0);
      this.settings.lodBias = 0.75;
      this.settings.targetFps = 60;
      this.settings.motionBlurIntensity = 0.15;
      this.settings.bloomIntensity = 0.5;
      this.dirLight.shadow.mapSize.set(1024, 1024);
    } else if (preset === 'high-100fps') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      this.settings.lodBias = 1.0;
      this.settings.targetFps = 100;
      this.settings.motionBlurIntensity = 0.35;
      this.settings.bloomIntensity = 0.75;
      this.dirLight.shadow.mapSize.set(2048, 2048);
    } else {
      // Ultra 120 FPS
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      this.settings.lodBias = 1.35;
      this.settings.targetFps = 120;
      this.settings.motionBlurIntensity = 0.45;
      this.settings.bloomIntensity = 0.95;
      this.dirLight.shadow.mapSize.set(2048, 2048);
    }
  }

  public playCutscene(id: CutscenePresetId) {
    this.cameraController.playCutscene(id);
  }

  public setCameraMode(mode: CameraMode) {
    this.cameraController.setMode(mode);
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.loop();
  }

  public stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animFrameId);
  }

  public destroy() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
    this.renderer.dispose();
  }

  private loop = () => {
    if (!this.isRunning) return;
    this.animFrameId = requestAnimationFrame(this.loop);

    const now = performance.now();
    const deltaMs = now - this.lastTime;
    const delta = Math.min(deltaMs * 0.001, 0.1); // Clamp delta to avoid huge jumps
    this.lastTime = now;
    this.currentFrameTime = deltaMs;

    // Performance & FPS counter update
    this.frameCount++;
    if (now - this.fpsUpdateTime > 400) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.fpsUpdateTime));
      this.frameCount = 0;
      this.fpsUpdateTime = now;
    }

    // 1. Advance Day-Night cycle if active
    if (this.settings.isCycleActive) {
      this.settings.timeOfDay = (this.settings.timeOfDay + delta * this.settings.dayCycleSpeed) % 24.0;
    }

    // 2. Update Sky, Sun, and Atmosphere
    const atmosphere = this.sky.update(this.settings.timeOfDay, now * 0.001, this.settings.weather);

    // 3. Update Directional Light position & colors
    const sunPos = new THREE.Vector3().copy(atmosphere.sunDir).multiplyScalar(650);
    this.dirLight.position.copy(sunPos);
    this.dirLight.color.copy(atmosphere.sunColor);
    this.dirLight.intensity = atmosphere.isNight ? 0.35 : 2.4;
    this.dirLight.target.position.set(0, 20, 0);

    // 4. Update Weather Particles & Lightning
    const { wetness, lightningBoost } = this.weatherSystem.update(
      delta,
      this.camera.position,
      this.settings.weather,
      atmosphere.isNight
    );

    if (lightningBoost > 0) {
      this.dirLight.intensity += lightningBoost * 4.0;
      this.dirLight.color.setRGB(0.9, 0.95, 1.0);
    }

    // 5. Update Volumetric Sun Rays
    const rayIntensity = this.settings.volumetricRays
      ? (atmosphere.isNight ? 0.0 : this.settings.rayIntensity)
      : 0.0;
    this.volumetricRays.update(atmosphere.sunDir, atmosphere.sunColor, now * 0.001, rayIntensity);

    // 6. Update Camera / Cutscene Controller
    this.cameraController.update(delta);

    // Follow camera with directional light shadow box for cascading detail
    this.dirLight.target.position.set(this.camera.position.x, 20, this.camera.position.z);
    this.dirLight.target.updateMatrixWorld();

    // 7. Update Terrain LOD & Occlusion Culling
    const lodStats = this.lodManager.update(
      this.camera,
      this.settings.lodBias,
      this.settings.occlusionCulling
    );

    // 7b. Update POI Markers & Environmental Interactions
    const elapsedTime = now * 0.001;
    this.poiManager.update(elapsedTime, this.camera);
    this.environmentalElements.update(delta, this.camera.position, elapsedTime);

    // 8. Update Shader Uniforms
    const tU = this.terrainMaterial.uniforms;
    tU.uSunDir.value.copy(atmosphere.sunDir);
    tU.uSunColor.value.copy(atmosphere.sunColor);
    tU.uAmbientColor.value.copy(atmosphere.ambientColor);
    tU.uFogColor.value.copy(atmosphere.fogColor);
    tU.uFogDensity.value = this.settings.fogDensity;
    tU.uTime.value = elapsedTime;
    tU.uWetness.value = wetness;

    const wU = this.waterMaterial.uniforms;
    wU.uSunDir.value.copy(atmosphere.sunDir);
    wU.uSunColor.value.copy(atmosphere.sunColor);
    wU.uAmbientColor.value.copy(atmosphere.ambientColor);
    wU.uFogColor.value.copy(atmosphere.fogColor);
    wU.uFogDensity.value = this.settings.fogDensity;
    wU.uTime.value = elapsedTime;

    // 9. Update Post-Processing Stack
    this.postProcessing.updateUniforms({
      exposure: this.settings.exposure,
      contrast: this.settings.contrast,
      saturation: this.settings.saturation,
      bloomIntensity: this.settings.bloomEnabled ? this.settings.bloomIntensity : 0.0,
      motionBlur: this.settings.motionBlurEnabled ? this.settings.motionBlurIntensity : 0.0,
      colorGrading: this.settings.colorGrading,
      vignette: this.settings.vignetteEnabled,
      chromaticAberration: this.settings.chromaticAberration,
    });

    // 10. Render Post-Processing Pass
    this.postProcessing.render(this.scene, this.camera);

    // 11. Broadcast Telemetry
    if (this.onStatsUpdate) {
      const info = this.renderer.info;
      this.onStatsUpdate({
        fps: this.currentFps,
        targetFps: this.settings.targetFps,
        frameTimeMs: parseFloat(this.currentFrameTime.toFixed(1)),
        drawCalls: info.render.calls,
        triangles: lodStats.triangles,
        totalChunks: lodStats.totalChunks,
        renderedChunks: lodStats.renderedChunks,
        culledChunks: lodStats.culledChunks,
        lodCounts: lodStats.lodCounts,
        memoryMb: Math.round((info.memory.geometries + info.memory.textures) * 0.8 + 48),
        gpuRenderer: this.gpuName,
        resolution: `${this.renderer.domElement.width}x${this.renderer.domElement.height}`,
      });
    }
  };
}
