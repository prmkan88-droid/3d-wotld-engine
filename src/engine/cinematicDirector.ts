/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import {
  CameraMode,
  CutscenePresetId,
  CutsceneTrajectory,
  CutsceneKeyframe,
  StaticVantagePoint,
} from '../types';
import { globalBiomeSystem } from './biomeSystem';

export const STATIC_VANTAGE_POINTS: StaticVantagePoint[] = [
  {
    id: 'vantage_summit',
    name: 'Zenith Summit Balcony',
    pos: [-230, 115, -240],
    lookAt: [0, 20, 0],
    biome: 'alpine',
    description: 'Breathtaking 360° panorama from the highest alpine peak looking down across the continent.',
    fov: 65,
  },
  {
    id: 'vantage_fjord',
    name: 'Sapphire Fjord Pier',
    pos: [-25, 14, -15],
    lookAt: [110, 45, 90],
    biome: 'meadow',
    description: 'Serene lakeside observation post catching crisp reflections and dancing mountain water.',
    fov: 60,
  },
  {
    id: 'vantage_forest',
    name: 'Taiga Canopy Watch',
    pos: [130, 52, 100],
    lookAt: [-50, 25, -20],
    biome: 'forest',
    description: 'Sheltered vantage amongst ancient pine boughs overlooking valley mist and wildlife.',
    fov: 58,
  },
  {
    id: 'vantage_desert',
    name: 'Dune Sunken Ridge',
    pos: [210, 36, -170],
    lookAt: [0, 30, 0],
    biome: 'desert',
    description: 'Elevated sandstone ridge viewing rippling dunes and distant golden sunset horizon.',
    fov: 62,
  },
  {
    id: 'vantage_caldera',
    name: 'Obsidian Caldera Outcrop',
    pos: [-210, 72, 160],
    lookAt: [-100, 30, 80],
    biome: 'volcanic',
    description: 'Volcanic rim perch overlooking dark basalt fractures and geothermal terrain formations.',
    fov: 66,
  },
];

export const EXTENDED_CUTSCENE_PRESETS: CutsceneTrajectory[] = [
  {
    id: 'mountain_crest',
    name: 'Mountain Crest Flyover',
    tagline: 'Sweeping low-altitude cruise carving through alpine crags into the valley basin',
    durationSec: 18,
    recommendedWeather: 'clear',
    recommendedTime: 10.5,
    keyframes: [
      { pos: [-280, 110, -260], lookAt: [-150, 60, -120], fov: 68, duration: 4.5, description: 'High Alpine Summit' },
      { pos: [-140, 75, -120], lookAt: [0, 25, 0], fov: 62, duration: 4.5, description: 'Canyon Descent' },
      { pos: [-30, 32, -20], lookAt: [120, 20, 100], fov: 60, duration: 4.5, description: 'Lake Surface Skim' },
      { pos: [110, 55, 90], lookAt: [0, 30, 0], fov: 65, duration: 4.5, description: 'Foothill Ascend' },
    ],
  },
  {
    id: 'biome_grand_tour',
    name: 'Biome Grand Expedition',
    tagline: 'Expansive continental journey from snowy glaciers across taiga, dunes, and volcanic rift',
    durationSec: 26,
    recommendedWeather: 'clear',
    recommendedTime: 12.0,
    keyframes: [
      { pos: [-240, 115, -250], lookAt: [-140, 60, -150], fov: 65, duration: 6.5, description: 'Glacial Horn Starting Point' },
      { pos: [130, 50, 110], lookAt: [80, 30, 40], fov: 60, duration: 6.5, description: 'Dense Pine Valley Crossing' },
      { pos: [220, 36, -170], lookAt: [120, 25, -80], fov: 62, duration: 6.5, description: 'Shifting Desert Dunes Low Pass' },
      { pos: [-210, 75, 170], lookAt: [-100, 35, 90], fov: 68, duration: 6.5, description: 'Obsidian Caldera Volcanic Finale' },
    ],
  },
  {
    id: 'canyon_slalom',
    name: 'High-Speed Canyon Slalom',
    tagline: 'Aggressive proximity flying banking through razor-sharp granite gorges',
    durationSec: 16,
    recommendedWeather: 'clear',
    recommendedTime: 14.5,
    keyframes: [
      { pos: [-160, 68, -80], lookAt: [-90, 40, -30], fov: 72, duration: 4.0, description: 'Chasm Ingress' },
      { pos: [-80, 36, -20], lookAt: [-10, 24, 20], fov: 70, duration: 4.0, description: 'Granite Pinch Bank' },
      { pos: [20, 28, 40], lookAt: [90, 32, 70], fov: 74, duration: 4.0, description: 'Low River Gorge Skim' },
      { pos: [120, 58, 110], lookAt: [160, 80, 150], fov: 68, duration: 4.0, description: 'Skyward Ridge Breach' },
    ],
  },
  {
    id: 'golden_hour_ridge',
    name: 'Golden Hour Ridge Horizon',
    tagline: 'Warm amber volumetric sun rays piercing through craggy peaks at dusk',
    durationSec: 20,
    recommendedWeather: 'sunset',
    recommendedTime: 17.8,
    keyframes: [
      { pos: [220, 45, -200], lookAt: [0, 28, 0], fov: 60, duration: 5.0, description: 'Sun Glint Horizon' },
      { pos: [120, 70, -110], lookAt: [-60, 40, 40], fov: 55, duration: 5.0, description: 'Volumetric Ridge' },
      { pos: [10, 38, -30], lookAt: [-120, 35, 120], fov: 58, duration: 5.0, description: 'Valley Amber Glow' },
      { pos: [-150, 65, 80], lookAt: [80, 25, -60], fov: 62, duration: 5.0, description: 'Sunset Panoramic Finale' },
    ],
  },
  {
    id: 'storm_descent',
    name: 'Storm Watcher Descent',
    tagline: 'Dramatic dive through heavy mist, rain squalls, and crackling lightning',
    durationSec: 16,
    recommendedWeather: 'storm',
    recommendedTime: 14.0,
    keyframes: [
      { pos: [0, 160, 240], lookAt: [0, 25, 0], fov: 75, duration: 4.0, description: 'Cloud Ceiling Breach' },
      { pos: [-90, 85, 140], lookAt: [30, 18, -20], fov: 65, duration: 4.0, description: 'Rain Squall Canyon' },
      { pos: [-40, 28, 40], lookAt: [100, 15, -40], fov: 60, duration: 4.0, description: 'Wet Lake Run' },
      { pos: [80, 42, -50], lookAt: [-50, 35, 30], fov: 68, duration: 4.0, description: 'Thunder Gorge' },
    ],
  },
  {
    id: 'aurora_nocturne',
    name: 'Aurora Nocturne',
    tagline: 'Ethereal nocturnal drift beneath undulating emerald and violet northern lights',
    durationSec: 22,
    recommendedWeather: 'aurora',
    recommendedTime: 1.0,
    keyframes: [
      { pos: [-180, 50, 180], lookAt: [0, 70, 0], fov: 65, duration: 5.5, description: 'Dancing Sky Gaze' },
      { pos: [-60, 75, 90], lookAt: [80, 120, -50], fov: 62, duration: 5.5, description: 'Glacial Aurora Drift' },
      { pos: [60, 45, -60], lookAt: [-100, 90, 120], fov: 60, duration: 5.5, description: 'Starlight Water Mirror' },
      { pos: [160, 65, -160], lookAt: [0, 60, 0], fov: 66, duration: 5.5, description: 'Celestial Arc' },
    ],
  },
  {
    id: 'orbit_panorama',
    name: 'Orbit Panorama',
    tagline: '360-degree steady orbital revolution showcasing full world topographical relief',
    durationSec: 24,
    recommendedWeather: 'clear',
    recommendedTime: 12.0,
    keyframes: [
      { pos: [260, 85, 0], lookAt: [0, 25, 0], fov: 60, duration: 6.0, description: 'Eastern Ridge' },
      { pos: [0, 95, 260], lookAt: [0, 25, 0], fov: 60, duration: 6.0, description: 'Southern Basin' },
      { pos: [-260, 85, 0], lookAt: [0, 25, 0], fov: 60, duration: 6.0, description: 'Western Monoliths' },
      { pos: [0, 95, -260], lookAt: [0, 25, 0], fov: 60, duration: 6.0, description: 'Northern Fjords' },
    ],
  },
];

export class CinematicDirector {
  public camera: THREE.PerspectiveCamera;
  public mode: CameraMode = 'cutscene';
  public currentCutsceneId: CutscenePresetId = 'mountain_crest';
  public currentVantageId: string = 'vantage_summit';

  // Playback settings
  public playbackSpeed = 1.0;
  public isPaused = false;
  private cutsceneTime = 0;
  public currentKeyframeText = '';

  // Free Flight & FPS state
  public position: THREE.Vector3 = new THREE.Vector3(0, 45, 120);
  public rotation: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private moveVelocity: THREE.Vector3 = new THREE.Vector3();
  private lookTarget: THREE.Vector3 = new THREE.Vector3(0, 25, 0);

  // Transition interpolation (e.g. fly to POI or switch vantage points)
  private isTransitioning = false;
  private transitionProgress = 0;
  private transitionDuration = 2.5;
  private transStartPos = new THREE.Vector3();
  private transTargetPos = new THREE.Vector3();
  private transStartLook = new THREE.Vector3();
  private transTargetLook = new THREE.Vector3();

  // Input bindings
  public keys: Record<string, boolean> = {};
  public touchMoveDelta = { x: 0, y: 0 };
  public touchLookDelta = { x: 0, y: 0 };

  // Trajectories list
  public trajectories: CutsceneTrajectory[] = [...EXTENDED_CUTSCENE_PRESETS];

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
    this.playCutscene('mountain_crest');
  }

  public setMode(mode: CameraMode) {
    this.mode = mode;
    this.isTransitioning = false;

    if (mode === 'static') {
      this.setVantagePoint(this.currentVantageId);
    } else if (mode === 'firstPerson') {
      const gh = globalBiomeSystem.getHeight(this.camera.position.x, this.camera.position.z);
      this.camera.position.y = gh + 2.5;
    }
  }

  public playCutscene(id: CutscenePresetId) {
    this.mode = 'cutscene';
    this.currentCutsceneId = id;
    this.cutsceneTime = 0;
    this.isPaused = false;
    this.isTransitioning = false;
  }

  public setVantagePoint(vantageId: string) {
    const vantage = STATIC_VANTAGE_POINTS.find((v) => v.id === vantageId) || STATIC_VANTAGE_POINTS[0];
    this.currentVantageId = vantage.id;
    this.mode = 'static';

    // Start smooth transition to vantage point
    this.flyTo({
      position: vantage.pos,
      lookAt: vantage.lookAt,
      fov: vantage.fov || 60,
      durationSec: 2.0,
      onComplete: () => {
        this.currentKeyframeText = `Static Vantage: ${vantage.name}`;
      },
    });
  }

  /**
   * Smooth automatic camera fly-to interpolation to any destination (e.g. POI or landmark)
   */
  public flyTo(options: {
    position: [number, number, number];
    lookAt: [number, number, number];
    fov?: number;
    durationSec?: number;
    onComplete?: () => void;
  }) {
    this.transStartPos.copy(this.camera.position);
    this.transTargetPos.set(options.position[0], options.position[1], options.position[2]);

    this.transStartLook.copy(this.lookTarget);
    this.transTargetLook.set(options.lookAt[0], options.lookAt[1], options.lookAt[2]);

    this.transitionDuration = Math.max(0.5, options.durationSec || 2.5);
    this.transitionProgress = 0;
    this.isTransitioning = true;
  }

  public update(delta: number): void {
    // 1. If currently in a targeted fly-to transition, advance transition
    if (this.isTransitioning) {
      this.updateTransition(delta);
      return;
    }

    // 2. Otherwise execute mode-specific controller logic
    switch (this.mode) {
      case 'cutscene':
        this.updateCutscene(delta);
        break;
      case 'static':
        this.updateStaticVantage(delta);
        break;
      case 'free':
        this.updateFreeFly(delta);
        break;
      case 'firstPerson':
        this.updateFirstPerson(delta);
        break;
      case 'orbit':
        this.updateOrbit(delta);
        break;
    }
  }

  private updateTransition(delta: number) {
    this.transitionProgress += delta / this.transitionDuration;
    const t = Math.min(1.0, this.transitionProgress);

    // Smooth quintic ease in-out
    const ease = t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;

    // Catmull-Rom arc elevation boost during flight
    const arcHeight = Math.sin(t * Math.PI) * 18.0;

    const currentPos = new THREE.Vector3().lerpVectors(this.transStartPos, this.transTargetPos, ease);
    currentPos.y += arcHeight;

    // Keep safe clearance above terrain
    const gh = globalBiomeSystem.getHeight(currentPos.x, currentPos.z);
    currentPos.y = Math.max(currentPos.y, gh + 4.0);

    this.camera.position.copy(currentPos);

    this.lookTarget.lerpVectors(this.transStartLook, this.transTargetLook, ease);
    this.camera.lookAt(this.lookTarget);

    if (t >= 1.0) {
      this.isTransitioning = false;
    }
  }

  private updateCutscene(delta: number) {
    const trajectory = this.trajectories.find((c) => c.id === this.currentCutsceneId) || this.trajectories[0];
    const totalDuration = trajectory.durationSec;

    if (!this.isPaused) {
      this.cutsceneTime = (this.cutsceneTime + delta * this.playbackSpeed) % totalDuration;
    }

    const kfs = trajectory.keyframes;
    const count = kfs.length;
    const segDuration = totalDuration / count;
    const segIndex = Math.floor(this.cutsceneTime / segDuration) % count;
    const nextIndex = (segIndex + 1) % count;
    const progress = (this.cutsceneTime % segDuration) / segDuration;

    // Smooth Hermite / Catmull-Rom easing
    const ease = progress * progress * (3.0 - 2.0 * progress);

    const kf1 = kfs[segIndex];
    const kf2 = kfs[nextIndex];

    this.currentKeyframeText = `${trajectory.name} — ${kf1.description}`;

    // Interpolate camera position
    const px = THREE.MathUtils.lerp(kf1.pos[0], kf2.pos[0], ease);
    const py = THREE.MathUtils.lerp(kf1.pos[1], kf2.pos[1], ease);
    const pz = THREE.MathUtils.lerp(kf1.pos[2], kf2.pos[2], ease);

    // Prevent camera from clipping under ground during cutscenes
    const groundY = globalBiomeSystem.getHeight(px, pz);
    const safeY = Math.max(py, groundY + 3.8);

    this.camera.position.set(px, safeY, pz);

    // Interpolate lookAt target
    const lx = THREE.MathUtils.lerp(kf1.lookAt[0], kf2.lookAt[0], ease);
    const ly = THREE.MathUtils.lerp(kf1.lookAt[1], kf2.lookAt[1], ease);
    const lz = THREE.MathUtils.lerp(kf1.lookAt[2], kf2.lookAt[2], ease);

    this.lookTarget.set(lx, ly, lz);
    this.camera.lookAt(this.lookTarget);

    // Dynamic FOV breathing
    const fov1 = kf1.fov || 65;
    const fov2 = kf2.fov || 65;
    this.camera.fov = THREE.MathUtils.lerp(fov1, fov2, ease);
    this.camera.updateProjectionMatrix();
  }

  /**
   * Static Vantage Mode: Fixed camera position with gentle atmospheric breathing sway
   */
  private updateStaticVantage(delta: number) {
    const vantage = STATIC_VANTAGE_POINTS.find((v) => v.id === this.currentVantageId) || STATIC_VANTAGE_POINTS[0];
    const time = performance.now() * 0.001;

    // Subtle natural tripod sway
    const swayX = Math.sin(time * 0.8) * 0.45;
    const swayY = Math.cos(time * 0.6) * 0.25;
    const swayZ = Math.sin(time * 0.4) * 0.45;

    this.camera.position.set(
      vantage.pos[0] + swayX,
      vantage.pos[1] + swayY,
      vantage.pos[2] + swayZ
    );

    // Slight tracking focal drift
    this.lookTarget.set(
      vantage.lookAt[0] + Math.sin(time * 0.5) * 1.5,
      vantage.lookAt[1] + Math.cos(time * 0.4) * 1.0,
      vantage.lookAt[2] + Math.cos(time * 0.5) * 1.5
    );
    this.camera.lookAt(this.lookTarget);
    this.currentKeyframeText = `Static Vantage: ${vantage.name}`;
  }

  private updateFreeFly(delta: number) {
    const isBoost = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    const speed = (isBoost ? 110 : 45) * delta;

    // Touch look or mouse look
    if (this.touchLookDelta.x !== 0 || this.touchLookDelta.y !== 0) {
      this.rotation.y -= this.touchLookDelta.x * 0.003;
      this.rotation.x -= this.touchLookDelta.y * 0.003;
      this.rotation.x = Math.max(-1.4, Math.min(1.4, this.rotation.x));
      this.touchLookDelta.x = 0;
      this.touchLookDelta.y = 0;
    }

    const forward = new THREE.Vector3(0, 0, -1).applyEuler(this.rotation);
    const right = new THREE.Vector3(1, 0, 0).applyEuler(this.rotation);

    let moveX = 0;
    let moveZ = 0;
    let moveY = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;
    if (this.keys['KeyE'] || this.keys['Space']) moveY += 1;
    if (this.keys['KeyQ'] || this.keys['KeyC']) moveY -= 1;

    moveX += this.touchMoveDelta.x;
    moveZ -= this.touchMoveDelta.y;

    const move = forward.clone().multiplyScalar(moveZ * speed)
      .add(right.clone().multiplyScalar(moveX * speed))
      .add(new THREE.Vector3(0, moveY * speed, 0));

    this.camera.position.add(move);
    this.camera.rotation.copy(this.rotation);

    // Keep above terrain
    const minHeight = globalBiomeSystem.getHeight(this.camera.position.x, this.camera.position.z) + 3.0;
    if (this.camera.position.y < minHeight) {
      this.camera.position.y = minHeight;
    }

    this.currentKeyframeText = `Free Flight Drone (${isBoost ? 'High-Speed Thrusters' : 'Cruise'})`;
  }

  private updateFirstPerson(delta: number) {
    const speed = 18 * delta;

    if (this.touchLookDelta.x !== 0 || this.touchLookDelta.y !== 0) {
      this.rotation.y -= this.touchLookDelta.x * 0.003;
      this.rotation.x -= this.touchLookDelta.y * 0.003;
      this.rotation.x = Math.max(-1.3, Math.min(1.3, this.rotation.x));
      this.touchLookDelta.x = 0;
      this.touchLookDelta.y = 0;
    }

    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation.y);

    let moveX = 0;
    let moveZ = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

    moveX += this.touchMoveDelta.x;
    moveZ -= this.touchMoveDelta.y;

    const move = forward.clone().multiplyScalar(moveZ * speed)
      .add(right.clone().multiplyScalar(moveX * speed));

    this.camera.position.x += move.x;
    this.camera.position.z += move.z;

    const groundY = globalBiomeSystem.getHeight(this.camera.position.x, this.camera.position.z);
    this.camera.position.y = Math.max(groundY + 2.2, 9.5);

    this.camera.rotation.copy(this.rotation);
    this.currentKeyframeText = 'Ground Walk Inspection';
  }

  private updateOrbit(delta: number) {
    const time = performance.now() * 0.0002;
    const radius = 230;
    this.camera.position.x = Math.cos(time) * radius;
    this.camera.position.z = Math.sin(time) * radius;
    this.camera.position.y = 75 + Math.sin(time * 2.0) * 15;
    this.camera.lookAt(0, 30, 0);
    this.currentKeyframeText = '360° Continental Orbit';
  }
}
