/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { WeatherType } from '../types';

export class WeatherSystem {
  public group: THREE.Group;

  // 1. Rain particles
  private rainMesh: THREE.Points;
  private rainCount = 4500;
  private rainPositions: Float32Array;
  private rainVelocities: Float32Array;

  // 2. Snow particles (High alpine & winter atmosphere)
  private snowMesh: THREE.Points;
  private snowCount = 1800;
  private snowPositions: Float32Array;
  private snowVelocities: Float32Array;

  // 3. Volcanic embers & ash plumes
  private ashMesh: THREE.Points;
  private ashCount = 900;
  private ashPositions: Float32Array;
  private ashVelocities: Float32Array;

  // 4. Bioluminescent Fireflies / Golden Forest Pollen Motes
  private emberMesh: THREE.Points;
  private emberCount = 600;
  private emberPositions: Float32Array;

  private lightningTimer = 0;
  public lightningFlash = 0; // 0 to 1 intensity

  constructor() {
    this.group = new THREE.Group();

    // 1. Rain particles
    this.rainPositions = new Float32Array(this.rainCount * 3);
    this.rainVelocities = new Float32Array(this.rainCount);
    const range = 280;
    for (let i = 0; i < this.rainCount; i++) {
      this.rainPositions[i * 3] = (Math.random() - 0.5) * range;
      this.rainPositions[i * 3 + 1] = Math.random() * 120 + 5;
      this.rainPositions[i * 3 + 2] = (Math.random() - 0.5) * range;
      this.rainVelocities[i] = Math.random() * 1.5 + 2.5;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x9dc9f5,
      size: 1.8,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.rainMesh = new THREE.Points(rainGeo, rainMat);
    this.group.add(this.rainMesh);

    // 2. Alpine Snow
    this.snowPositions = new Float32Array(this.snowCount * 3);
    this.snowVelocities = new Float32Array(this.snowCount);
    for (let i = 0; i < this.snowCount; i++) {
      this.snowPositions[i * 3] = (Math.random() - 0.5) * 260;
      this.snowPositions[i * 3 + 1] = Math.random() * 90 + 10;
      this.snowPositions[i * 3 + 2] = (Math.random() - 0.5) * 260;
      this.snowVelocities[i] = Math.random() * 0.4 + 0.3;
    }
    const snowGeo = new THREE.BufferGeometry();
    snowGeo.setAttribute('position', new THREE.BufferAttribute(this.snowPositions, 3));
    const snowMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2.2,
      transparent: true,
      opacity: 0.0,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });
    this.snowMesh = new THREE.Points(snowGeo, snowMat);
    this.group.add(this.snowMesh);

    // 3. Volcanic Embers & Ash Plumes
    this.ashPositions = new Float32Array(this.ashCount * 3);
    this.ashVelocities = new Float32Array(this.ashCount);
    for (let i = 0; i < this.ashCount; i++) {
      this.ashPositions[i * 3] = (Math.random() - 0.5) * 160;
      this.ashPositions[i * 3 + 1] = Math.random() * 70 + 5;
      this.ashPositions[i * 3 + 2] = (Math.random() - 0.5) * 160;
      this.ashVelocities[i] = Math.random() * 0.8 + 0.4;
    }
    const ashGeo = new THREE.BufferGeometry();
    ashGeo.setAttribute('position', new THREE.BufferAttribute(this.ashPositions, 3));
    const ashMat = new THREE.PointsMaterial({
      color: 0xff6622,
      size: 3.5,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.ashMesh = new THREE.Points(ashGeo, ashMat);
    this.group.add(this.ashMesh);

    // 4. Bioluminescent Fireflies / Pollen Motes
    this.emberPositions = new Float32Array(this.emberCount * 3);
    for (let i = 0; i < this.emberCount; i++) {
      this.emberPositions[i * 3] = (Math.random() - 0.5) * 220;
      this.emberPositions[i * 3 + 1] = Math.random() * 45 + 10;
      this.emberPositions[i * 3 + 2] = (Math.random() - 0.5) * 220;
    }
    const emberGeo = new THREE.BufferGeometry();
    emberGeo.setAttribute('position', new THREE.BufferAttribute(this.emberPositions, 3));
    const emberMat = new THREE.PointsMaterial({
      color: 0x6affaa,
      size: 3.2,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.emberMesh = new THREE.Points(emberGeo, emberMat);
    this.group.add(this.emberMesh);
  }

  public update(
    delta: number,
    cameraPos: THREE.Vector3,
    weather: WeatherType,
    isNight: boolean
  ): { wetness: number; lightningBoost: number } {
    // Follow camera horizontal position
    this.group.position.x = cameraPos.x;
    this.group.position.z = cameraPos.z;

    const rainMat = this.rainMesh.material as THREE.PointsMaterial;
    const snowMat = this.snowMesh.material as THREE.PointsMaterial;
    const ashMat = this.ashMesh.material as THREE.PointsMaterial;
    const emberMat = this.emberMesh.material as THREE.PointsMaterial;

    // Detect if camera is near volcanic caldera zone (-220, 180)
    const distToCaldera = Math.hypot(cameraPos.x - (-220), cameraPos.z - 180);
    const inVolcanicZone = distToCaldera < 170;

    // Detect if high altitude alpine zone
    const isHighAlpine = cameraPos.y > 60.0;

    // 1. Rain / Sandstorm update
    const isRaining = weather === 'storm';
    const isSand = weather === 'sandstorm';
    const targetRainOpacity = isRaining ? 0.75 : isSand ? 0.45 : 0.0;
    rainMat.opacity = THREE.MathUtils.lerp(rainMat.opacity, targetRainOpacity, 0.08);

    if (isSand) {
      rainMat.color.setHex(0xd18d45);
      rainMat.size = 2.4;
    } else {
      rainMat.color.setHex(0x9dc9f5);
      rainMat.size = 1.8;
    }

    if (rainMat.opacity > 0.02) {
      const posAttr = this.rainMesh.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const windX = isSand ? 1.8 : 0.35;
      const fallMultiplier = isSand ? 0.8 : 2.5;

      for (let i = 0; i < this.rainCount; i++) {
        let y = arr[i * 3 + 1];
        let x = arr[i * 3];
        y -= this.rainVelocities[i] * fallMultiplier * (delta * 60.0);
        x += windX * (delta * 60.0);
        if (y < 2.0) {
          y = 120.0;
          x = (Math.random() - 0.5) * 280;
        }
        arr[i * 3] = x;
        arr[i * 3 + 1] = y;
      }
      posAttr.needsUpdate = true;
    }

    // 2. Snow Flurries
    const targetSnowOpacity = (isHighAlpine || weather === 'fog') && !isRaining && !isSand ? 0.65 : 0.0;
    snowMat.opacity = THREE.MathUtils.lerp(snowMat.opacity, targetSnowOpacity, 0.06);

    if (snowMat.opacity > 0.02) {
      const posAttr = this.snowMesh.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const time = performance.now() * 0.001;

      for (let i = 0; i < this.snowCount; i++) {
        arr[i * 3 + 1] -= this.snowVelocities[i] * (delta * 60.0);
        arr[i * 3] += Math.sin(time + i * 0.3) * 0.25;
        arr[i * 3 + 2] += Math.cos(time + i * 0.4) * 0.25;

        if (arr[i * 3 + 1] < 2.0) {
          arr[i * 3 + 1] = 90.0;
          arr[i * 3] = (Math.random() - 0.5) * 260;
          arr[i * 3 + 2] = (Math.random() - 0.5) * 260;
        }
      }
      posAttr.needsUpdate = true;
    }

    // 3. Volcanic Embers (rise from ground)
    const targetAshOpacity = inVolcanicZone ? 0.8 : 0.0;
    ashMat.opacity = THREE.MathUtils.lerp(ashMat.opacity, targetAshOpacity, 0.08);

    if (ashMat.opacity > 0.02) {
      const posAttr = this.ashMesh.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const time = performance.now() * 0.0015;

      for (let i = 0; i < this.ashCount; i++) {
        arr[i * 3 + 1] += this.ashVelocities[i] * (delta * 60.0);
        arr[i * 3] += Math.sin(time + i * 0.5) * 0.3;
        arr[i * 3 + 2] += Math.cos(time + i * 0.7) * 0.3;

        if (arr[i * 3 + 1] > 75.0) {
          arr[i * 3 + 1] = 3.0;
          arr[i * 3] = (Math.random() - 0.5) * 160;
          arr[i * 3 + 2] = (Math.random() - 0.5) * 160;
        }
      }
      posAttr.needsUpdate = true;
    }

    // 4. Fireflies / Forest Pollen
    const fireflyActive = isNight || weather === 'aurora' || weather === 'sunset';
    const isForestPollen = !isNight && (weather === 'clear');
    const targetEmberOpacity = fireflyActive ? 0.75 : isForestPollen ? 0.4 : 0.0;
    emberMat.opacity = THREE.MathUtils.lerp(emberMat.opacity, targetEmberOpacity, 0.05);

    if (isForestPollen) {
      emberMat.color.setHex(0xffd700);
      emberMat.size = 2.4;
    } else {
      emberMat.color.setHex(0x6affaa);
      emberMat.size = 3.2;
    }

    if (emberMat.opacity > 0.02) {
      const posAttr = this.emberMesh.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const time = performance.now() * 0.0015;

      for (let i = 0; i < this.emberCount; i++) {
        const offset = i * 0.2;
        arr[i * 3] += Math.sin(time + offset) * 0.14;
        arr[i * 3 + 1] += Math.cos(time * 0.8 + offset) * 0.1;
        arr[i * 3 + 2] += Math.sin(time * 0.6 + offset) * 0.14;
      }
      posAttr.needsUpdate = true;
    }

    // Thunderstorm lightning simulator
    let lightningBoost = 0;
    if (weather === 'storm') {
      this.lightningTimer += delta;
      if (this.lightningTimer > 4.2 && Math.random() < 0.03) {
        this.lightningFlash = 1.0;
        this.lightningTimer = 0;
      }
    }

    if (this.lightningFlash > 0.01) {
      this.lightningFlash *= 0.86;
      lightningBoost = this.lightningFlash * 1.6;
    }

    const wetness = isRaining ? 1.0 : weather === 'fog' ? 0.45 : 0.05;

    return { wetness, lightningBoost };
  }
}
