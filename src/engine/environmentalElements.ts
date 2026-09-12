/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { EnvironmentalSettings } from '../types';
import { globalBiomeSystem } from './biomeSystem';

export class EnvironmentalElements {
  public group: THREE.Group;
  public settings: EnvironmentalSettings = {
    reactiveFoliage: true,
    wildlifeFlocks: true,
    groundWildlife: true,
    ambientParticles: true,
    wildlifeScatterDistance: 38.0,
  };

  // 1. Reactive Foliage (Instanced Grass & Shrubs)
  private foliageMesh: THREE.InstancedMesh;
  private foliageCount = 650;
  private foliageBaseTransforms: { pos: THREE.Vector3; rot: THREE.Euler; scale: THREE.Vector3 }[] = [];
  private dummyObj = new THREE.Object3D();

  // 2. Flying Bird Wildlife Flocks (Boids with Scatter Behavior)
  private birdMesh: THREE.InstancedMesh;
  private birdCount = 36;
  private birds: {
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    wingPhase: number;
    scatterTimer: number;
    homePos: THREE.Vector3;
  }[] = [];

  // 3. Ground Wildlife (Alpine Deer / Mountain Hares that graze & scatter)
  private groundFaunaMesh: THREE.InstancedMesh;
  private faunaCount = 18;
  private fauna: {
    pos: THREE.Vector3;
    targetPos: THREE.Vector3;
    speed: number;
    isScattered: boolean;
    scatterTimer: number;
    yaw: number;
    size: number;
  }[] = [];

  // 4. Subtle Physics Particles: Falling Leaves & Tumbling Cliff Scree
  private leafParticles: THREE.Points;
  private leafCount = 180;
  private leafPositions: Float32Array;
  private leafVelocities: Float32Array;

  private screePebbles: THREE.InstancedMesh;
  private screeCount = 45;
  private screeList: {
    pos: THREE.Vector3;
    vel: THREE.Vector3;
    rot: THREE.Vector3;
    rotVel: THREE.Vector3;
    isActive: boolean;
    groundY: number;
  }[] = [];

  constructor() {
    this.group = new THREE.Group();

    // 1. Initialize Reactive Foliage
    this.foliageMesh = this.initFoliage();
    this.group.add(this.foliageMesh);

    // 2. Initialize Bird Flocks
    this.birdMesh = this.initBirdFlocks();
    this.group.add(this.birdMesh);

    // 3. Initialize Ground Wildlife
    this.groundFaunaMesh = this.initGroundFauna();
    this.group.add(this.groundFaunaMesh);

    // 4. Initialize Subtle Physics Particles
    const { leafPoints, screeMesh } = this.initPhysicsParticles();
    this.leafParticles = leafPoints;
    this.screePebbles = screeMesh;
    this.group.add(this.leafParticles);
    this.group.add(this.screePebbles);
  }

  /**
   * 1. Reactive Foliage: Instanced Grass & Alpine Shrubs that part dynamically
   * when player or camera walks through them.
   */
  private initFoliage(): THREE.InstancedMesh {
    // Cross-quad blade geometry for lush 3D appearance at ultra-low vertex cost
    const bladeGeo = new THREE.BufferGeometry();
    const w = 0.45;
    const h = 2.4;
    // Two crossing planes
    const vertices = new Float32Array([
      // Quad 1
      -w, 0, 0,
       w, 0, 0,
       w, h, 0,
      -w, 0, 0,
       w, h, 0,
      -w, h, 0,
      // Quad 2 (rotated 90 deg)
      0, 0, -w,
      0, 0,  w,
      0, h,  w,
      0, 0, -w,
      0, h,  w,
      0, h, -w,
    ]);
    bladeGeo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    bladeGeo.computeVertexNormals();

    const mat = new THREE.MeshLambertMaterial({
      color: 0x48bb78,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.InstancedMesh(bladeGeo, mat, this.foliageCount);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Populate foliage across meadow & forest biomes
    let spawned = 0;
    let attempts = 0;
    while (spawned < this.foliageCount && attempts < 2500) {
      attempts++;
      const x = (Math.random() - 0.5) * 450;
      const z = (Math.random() - 0.5) * 450;
      const evalData = globalBiomeSystem.evaluate(x, z);

      // Spawn in meadow and forest zones with reasonable slopes
      if (evalData.height >= 8.5 && evalData.height <= 44.0 && (evalData.weights.meadow > 0.3 || evalData.weights.forest > 0.3)) {
        const y = evalData.height;
        const pos = new THREE.Vector3(x, y, z);
        const rot = new THREE.Euler(0, Math.random() * Math.PI * 2, 0);
        const scaleFactor = 0.8 + Math.random() * 0.7;
        const scale = new THREE.Vector3(scaleFactor, scaleFactor * (1.0 + Math.random() * 0.4), scaleFactor);

        this.foliageBaseTransforms.push({ pos, rot, scale });

        this.dummyObj.position.copy(pos);
        this.dummyObj.rotation.copy(rot);
        this.dummyObj.scale.copy(scale);
        this.dummyObj.updateMatrix();
        mesh.setMatrixAt(spawned, this.dummyObj.matrix);
        spawned++;
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
  }

  /**
   * 2. Flying Bird Wildlife Flocks (Hawks / Alpine Gulls)
   */
  private initBirdFlocks(): THREE.InstancedMesh {
    // Origami bird geometry: body + 2 wings
    const birdGeo = new THREE.ConeGeometry(0.7, 2.2, 3);
    birdGeo.rotateX(Math.PI / 2);

    const mat = new THREE.MeshBasicMaterial({
      color: 0x22262c,
      wireframe: false,
    });

    const mesh = new THREE.InstancedMesh(birdGeo, mat, this.birdCount);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    for (let i = 0; i < this.birdCount; i++) {
      const angle = (i / this.birdCount) * Math.PI * 2;
      const radius = 90 + (i % 3) * 35;
      const height = 65 + (i % 4) * 15;
      const pos = new THREE.Vector3(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );
      const vel = new THREE.Vector3(-Math.sin(angle) * 18, 0, Math.cos(angle) * 18);

      this.birds.push({
        pos,
        vel,
        wingPhase: Math.random() * Math.PI * 2,
        scatterTimer: 0,
        homePos: pos.clone(),
      });
    }

    return mesh;
  }

  /**
   * 3. Ground Wildlife (Alpine Hares / Deer in Meadows)
   */
  private initGroundFauna(): THREE.InstancedMesh {
    // Stylized animal geometry: torso + head
    const faunaGeo = new THREE.BoxGeometry(1.2, 1.4, 2.2);
    faunaGeo.translate(0, 0.7, 0);

    const mat = new THREE.MeshLambertMaterial({
      color: 0x926b48,
    });

    const mesh = new THREE.InstancedMesh(faunaGeo, mat, this.faunaCount);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    for (let i = 0; i < this.faunaCount; i++) {
      const angle = (i / this.faunaCount) * Math.PI * 2;
      const dist = 60 + Math.random() * 140;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const y = globalBiomeSystem.getHeight(x, z);

      this.fauna.push({
        pos: new THREE.Vector3(x, y, z),
        targetPos: new THREE.Vector3(x + (Math.random() - 0.5) * 20, y, z + (Math.random() - 0.5) * 20),
        speed: 2.2,
        isScattered: false,
        scatterTimer: 0,
        yaw: Math.random() * Math.PI * 2,
        size: 0.8 + Math.random() * 0.4,
      });
    }

    return mesh;
  }

  /**
   * 4. Subtle Physics Particles: Drifting Leaves & Rolling Cliff Scree
   */
  private initPhysicsParticles(): {
    leafPoints: THREE.Points;
    screeMesh: THREE.InstancedMesh;
  } {
    // 4a. Leaves
    const leafGeo = new THREE.BufferGeometry();
    this.leafPositions = new Float32Array(this.leafCount * 3);
    this.leafVelocities = new Float32Array(this.leafCount * 3);

    for (let i = 0; i < this.leafCount; i++) {
      const i3 = i * 3;
      this.leafPositions[i3] = (Math.random() - 0.5) * 250;
      this.leafPositions[i3 + 1] = 20 + Math.random() * 35;
      this.leafPositions[i3 + 2] = (Math.random() - 0.5) * 250;

      this.leafVelocities[i3] = (Math.random() - 0.5) * 1.5;
      this.leafVelocities[i3 + 1] = -0.6 - Math.random() * 0.8;
      this.leafVelocities[i3 + 2] = (Math.random() - 0.5) * 1.5;
    }

    leafGeo.setAttribute('position', new THREE.BufferAttribute(this.leafPositions, 3));
    const leafMat = new THREE.PointsMaterial({
      color: 0xca8a04, // Autumn amber/gold
      size: 1.2,
      transparent: true,
      opacity: 0.85,
    });
    const leafPoints = new THREE.Points(leafGeo, leafMat);

    // 4b. Scree Pebbles (Rolling down steep rocky cliffs)
    const screeGeo = new THREE.DodecahedronGeometry(0.55, 0);
    const screeMat = new THREE.MeshLambertMaterial({ color: 0x78716c });
    const screeMesh = new THREE.InstancedMesh(screeGeo, screeMat, this.screeCount);
    screeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    for (let i = 0; i < this.screeCount; i++) {
      const x = -80 + (Math.random() - 0.5) * 120;
      const z = -60 + (Math.random() - 0.5) * 120;
      const y = globalBiomeSystem.getHeight(x, z);

      this.screeList.push({
        pos: new THREE.Vector3(x, y + 0.3, z),
        vel: new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2),
        rot: new THREE.Vector3(),
        rotVel: new THREE.Vector3(Math.random() * 4, Math.random() * 4, Math.random() * 4),
        isActive: true,
        groundY: y,
      });
    }

    return { leafPoints, screeMesh };
  }

  /**
   * Main Per-Frame Update (called from WorldEngine loop)
   */
  public update(delta: number, cameraPos: THREE.Vector3, time: number) {
    if (this.settings.reactiveFoliage) {
      this.updateReactiveFoliage(cameraPos, time);
    }

    if (this.settings.wildlifeFlocks) {
      this.updateBirds(delta, cameraPos, time);
    }

    if (this.settings.groundWildlife) {
      this.updateGroundFauna(delta, cameraPos);
    }

    if (this.settings.ambientParticles) {
      this.updatePhysicsParticles(delta, time);
    }
  }

  /**
   * Update 1: Foliage Bending / Parting away from Camera/Player
   */
  private updateReactiveFoliage(cameraPos: THREE.Vector3, time: number) {
    const influenceRadius = 7.5;
    const invRadius = 1.0 / influenceRadius;
    let needsUpdate = false;

    const count = this.foliageBaseTransforms.length;
    for (let i = 0; i < count; i++) {
      const base = this.foliageBaseTransforms[i];
      const dx = base.pos.x - cameraPos.x;
      const dz = base.pos.z - cameraPos.z;
      const dy = base.pos.y - cameraPos.y;
      const dist = Math.sqrt(dx * dx + dz * dz);

      this.dummyObj.position.copy(base.pos);
      this.dummyObj.scale.copy(base.scale);

      // Natural wind sway
      const windSwayX = Math.sin(time * 2.5 + base.pos.x * 0.2) * 0.12;
      const windSwayZ = Math.cos(time * 2.0 + base.pos.z * 0.2) * 0.12;

      if (dist < influenceRadius && Math.abs(dy) < 6.0) {
        // Dynamic Player/Camera Proximity Parting: bend outward radially
        const factor = (1.0 - dist * invRadius);
        const pushX = (dx / (dist + 0.001)) * factor * 0.85;
        const pushZ = (dz / (dist + 0.001)) * factor * 0.85;

        this.dummyObj.rotation.set(
          base.rot.x + pushZ + windSwayZ,
          base.rot.y,
          base.rot.z - pushX + windSwayX
        );
        needsUpdate = true;
      } else {
        this.dummyObj.rotation.set(
          base.rot.x + windSwayZ,
          base.rot.y,
          base.rot.z + windSwayX
        );
      }

      this.dummyObj.updateMatrix();
      this.foliageMesh.setMatrixAt(i, this.dummyObj.matrix);
    }

    this.foliageMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Update 2: Bird Flocking & Sudden Scatter when approached
   */
  private updateBirds(delta: number, cameraPos: THREE.Vector3, time: number) {
    const scatterDist = this.settings.wildlifeScatterDistance;

    for (let i = 0; i < this.birds.length; i++) {
      const b = this.birds[i];
      const distToCam = b.pos.distanceTo(cameraPos);

      // Trigger Scatter
      if (distToCam < scatterDist && b.scatterTimer <= 0) {
        b.scatterTimer = 4.5; // Scatter for 4.5s
        // Scatter acceleration away from camera with banking
        const scatterDir = new THREE.Vector3().subVectors(b.pos, cameraPos).normalize();
        scatterDir.y += 0.4;
        b.vel.add(scatterDir.multiplyScalar(42.0));
      }

      if (b.scatterTimer > 0) {
        b.scatterTimer -= delta;
        // Dampen back towards cruising speed
        b.vel.multiplyScalar(0.97);
      } else {
        // Normal circling thermal behavior
        const toHome = new THREE.Vector3().subVectors(b.homePos, b.pos);
        b.vel.add(toHome.multiplyScalar(0.015));

        // Tangential circling thrust
        const tangent = new THREE.Vector3(-b.pos.z, 0, b.pos.x).normalize();
        b.vel.add(tangent.multiplyScalar(0.8));

        // Clamp speed
        const speed = b.vel.length();
        if (speed > 22.0) b.vel.setLength(22.0);
        if (speed < 12.0) b.vel.setLength(12.0);
      }

      b.pos.addScaledVector(b.vel, delta);

      // Wing flapping and banking orientation
      b.wingPhase += delta * (b.scatterTimer > 0 ? 16.0 : 7.0);
      const pitch = -b.vel.y * 0.04;
      const yaw = Math.atan2(b.vel.x, b.vel.z);
      const roll = Math.sin(b.wingPhase) * (b.scatterTimer > 0 ? 0.35 : 0.15);

      this.dummyObj.position.copy(b.pos);
      this.dummyObj.rotation.set(pitch, yaw, roll);
      this.dummyObj.scale.set(1.4, 1.4, 1.4);
      this.dummyObj.updateMatrix();

      this.birdMesh.setMatrixAt(i, this.dummyObj.matrix);
    }

    this.birdMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Update 3: Ground Wildlife Grazing & Bolting/Scattering
   */
  private updateGroundFauna(delta: number, cameraPos: THREE.Vector3) {
    const scatterDist = 32.0;

    for (let i = 0; i < this.fauna.length; i++) {
      const f = this.fauna[i];
      const distToCam = f.pos.distanceTo(cameraPos);

      // Trigger startle & bolt
      if (distToCam < scatterDist && f.scatterTimer <= 0) {
        f.isScattered = true;
        f.scatterTimer = 5.0;
        // Pick panic escape target away from camera
        const awayDir = new THREE.Vector3().subVectors(f.pos, cameraPos).normalize();
        awayDir.y = 0;
        f.targetPos.copy(f.pos).addScaledVector(awayDir, 45.0 + Math.random() * 25.0);
        f.speed = 14.0; // Sprint speed
      }

      if (f.scatterTimer > 0) {
        f.scatterTimer -= delta;
        if (f.scatterTimer <= 0) {
          f.isScattered = false;
          f.speed = 2.2; // Return to calm grazing
        }
      }

      // Move towards target position
      const toTarget = new THREE.Vector3().subVectors(f.targetPos, f.pos);
      toTarget.y = 0;
      const distToTarget = toTarget.length();

      if (distToTarget > 1.0) {
        toTarget.normalize();
        f.pos.addScaledVector(toTarget, f.speed * delta);
        f.yaw = Math.atan2(toTarget.x, toTarget.z);
      } else if (!f.isScattered) {
        // Pick new relaxed grazing wander spot
        f.targetPos.set(
          f.pos.x + (Math.random() - 0.5) * 35,
          0,
          f.pos.z + (Math.random() - 0.5) * 35
        );
      }

      // Clamp ground height
      const gh = globalBiomeSystem.getHeight(f.pos.x, f.pos.z);
      f.pos.y = Math.max(gh, 8.2);

      this.dummyObj.position.copy(f.pos);
      this.dummyObj.rotation.set(0, f.yaw, 0);
      const bob = Math.sin(performance.now() * 0.008 * f.speed) * 0.15;
      this.dummyObj.scale.set(f.size, f.size + bob, f.size);
      this.dummyObj.updateMatrix();

      this.groundFaunaMesh.setMatrixAt(i, this.dummyObj.matrix);
    }

    this.groundFaunaMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Update 4: Falling Autumn Leaves & Rolling Scree
   */
  private updatePhysicsParticles(delta: number, time: number) {
    // 4a. Update Leaves
    const pos = this.leafPositions;
    const vel = this.leafVelocities;
    const count = this.leafCount;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      pos[i3] += (vel[i3] + Math.sin(time + pos[i3 + 1] * 0.3) * 0.8) * delta;
      pos[i3 + 1] += vel[i3 + 1] * delta;
      pos[i3 + 2] += (vel[i3 + 2] + Math.cos(time + pos[i3 + 1] * 0.3) * 0.8) * delta;

      const groundY = globalBiomeSystem.getHeight(pos[i3], pos[i3 + 2]);
      if (pos[i3 + 1] < groundY + 0.4) {
        // Respawn above tree canopy
        pos[i3] = (Math.random() - 0.5) * 250;
        pos[i3 + 1] = groundY + 20.0 + Math.random() * 25.0;
        pos[i3 + 2] = (Math.random() - 0.5) * 250;
      }
    }

    const posAttr = this.leafParticles.geometry.attributes.position as THREE.BufferAttribute;
    posAttr.needsUpdate = true;

    // 4b. Update Scree Rolling Down Slopes
    for (let i = 0; i < this.screeList.length; i++) {
      const s = this.screeList[i];
      // Slight downward slope roll
      s.pos.x += s.vel.x * delta;
      s.pos.z += s.vel.z * delta;

      const gy = globalBiomeSystem.getHeight(s.pos.x, s.pos.z);
      s.pos.y = gy + 0.3;

      s.rot.x += s.rotVel.x * delta;
      s.rot.y += s.rotVel.y * delta;
      s.rot.z += s.rotVel.z * delta;

      this.dummyObj.position.copy(s.pos);
      this.dummyObj.rotation.set(s.rot.x, s.rot.y, s.rot.z);
      this.dummyObj.scale.set(0.9, 0.9, 0.9);
      this.dummyObj.updateMatrix();

      this.screePebbles.setMatrixAt(i, this.dummyObj.matrix);
    }

    this.screePebbles.instanceMatrix.needsUpdate = true;
  }

  /**
   * Manual trigger: Scatter all wildlife instantly (useful for cutscene events)
   */
  public triggerMassWildlifeScatter() {
    for (const b of this.birds) {
      b.scatterTimer = 6.0;
      b.vel.y += 25.0;
    }
    for (const f of this.fauna) {
      f.isScattered = true;
      f.scatterTimer = 6.0;
      f.speed = 16.0;
    }
  }
}
