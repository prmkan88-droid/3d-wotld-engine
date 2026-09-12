/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { WeatherType } from '../types';

export class WeatherSystem {
  public group: THREE.Group;
  private rainMesh: THREE.Points;
  private rainCount = 4500;
  private rainPositions: Float32Array;
  private rainVelocities: Float32Array;

  private emberMesh: THREE.Points;
  private emberCount = 600;
  private emberPositions: Float32Array;

  private lightningTimer = 0;
  public lightningFlash = 0; // 0 to 1 intensity

  constructor() {
    this.group = new THREE.Group();

    // 1. Rain particles (high performance Point cloud with custom streak-like appearance)
    this.rainPositions = new Float32Array(this.rainCount * 3);
    this.rainVelocities = new Float32Array(this.rainCount);

    const range = 280;
    for (let i = 0; i < this.rainCount; i++) {
      this.rainPositions[i * 3] = (Math.random() - 0.5) * range;
      this.rainPositions[i * 3 + 1] = Math.random() * 120 + 5;
      this.rainPositions[i * 3 + 2] = (Math.random() - 0.5) * range;
      this.rainVelocities[i] = Math.random() * 1.5 + 2.5; // fall speed
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

    // 2. Bioluminescent Fireflies / Ambient Motes
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
    // Follow camera horizontal position so particles remain around the viewer
    this.group.position.x = cameraPos.x;
    this.group.position.z = cameraPos.z;

    const rainMat = this.rainMesh.material as THREE.PointsMaterial;
    const emberMat = this.emberMesh.material as THREE.PointsMaterial;

    // Target opacities based on weather
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

    // Animate Rain
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

        // Reset if below ground
        if (y < 2.0) {
          y = 120.0;
          x = (Math.random() - 0.5) * 280;
        }

        arr[i * 3] = x;
        arr[i * 3 + 1] = y;
      }
      posAttr.needsUpdate = true;
    }

    // Fireflies / Motes (visible during Night, Sunset, or Aurora)
    const fireflyActive = isNight || weather === 'aurora' || weather === 'sunset';
    const targetEmberOpacity = fireflyActive ? 0.7 : 0.0;
    emberMat.opacity = THREE.MathUtils.lerp(emberMat.opacity, targetEmberOpacity, 0.05);

    if (emberMat.opacity > 0.02) {
      const posAttr = this.emberMesh.geometry.attributes.position as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const time = performance.now() * 0.0015;

      for (let i = 0; i < this.emberCount; i++) {
        const offset = i * 0.2;
        arr[i * 3] += Math.sin(time + offset) * 0.12;
        arr[i * 3 + 1] += Math.cos(time * 0.8 + offset) * 0.08;
        arr[i * 3 + 2] += Math.sin(time * 0.6 + offset) * 0.12;
      }
      posAttr.needsUpdate = true;
    }

    // Thunderstorm lightning simulator
    let lightningBoost = 0;
    if (weather === 'storm') {
      this.lightningTimer += delta;
      if (this.lightningTimer > 4.5 && Math.random() < 0.025) {
        this.lightningFlash = 1.0;
        this.lightningTimer = 0;
      }
    }

    if (this.lightningFlash > 0.01) {
      this.lightningFlash *= 0.85; // fast decay
      lightningBoost = this.lightningFlash * 1.5;
    }

    const wetness = isRaining ? 1.0 : weather === 'fog' ? 0.45 : 0.05;

    return { wetness, lightningBoost };
  }
}
