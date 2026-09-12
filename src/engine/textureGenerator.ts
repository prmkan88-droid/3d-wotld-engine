/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

/**
 * Creates high-detail procedural PBR textures for the landscape terrain:
 * - Grass detail map with organic blade variation
 * - Rock cliff normal map with stratified cracks
 * - Snow glitter normal & roughness
 * - Water normal ripple normal map for Gerstner waves
 */
export class ProceduralTextureGenerator {
  private static cache: Map<string, THREE.CanvasTexture> = new Map();

  public static getGrassTexture(): THREE.CanvasTexture {
    if (this.cache.has('grass')) return this.cache.get('grass')!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base rich meadow tones
    ctx.fillStyle = '#2d5a27';
    ctx.fillRect(0, 0, size, size);

    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;

    // Add blade micro-detail & organic noise
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 45;
      const moss = Math.sin((i / 4) * 0.05) * 15;
      data[i] = Math.min(255, Math.max(0, 48 + n));       // R
      data[i + 1] = Math.min(255, Math.max(0, 95 + n + moss)); // G
      data[i + 2] = Math.min(255, Math.max(0, 32 + n * 0.5)); // B
      data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = true;

    this.cache.set('grass', tex);
    return tex;
  }

  public static getRockNormalTexture(): THREE.CanvasTexture {
    if (this.cache.has('rockNormal')) return this.cache.get('rockNormal')!;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        // Generate rocky crag normal perturbation
        const angle = Math.sin(x * 0.08) * Math.cos(y * 0.08) * 0.4;
        const crack = Math.sin(x * 0.3 + y * 0.1) > 0.85 ? -0.5 : 0.0;

        const nx = 128 + Math.floor((Math.cos(angle) * 0.5 + crack) * 127);
        const ny = 128 + Math.floor((Math.sin(angle) * 0.5 + crack) * 127);
        const nz = 255; // Upward normal

        data[idx] = nx;
        data[idx + 1] = ny;
        data[idx + 2] = nz;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;

    this.cache.set('rockNormal', tex);
    return tex;
  }

  public static getWaterRippleTexture(): THREE.CanvasTexture {
    if (this.cache.has('waterRipple')) return this.cache.get('waterRipple')!;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const wave1 = Math.sin(x * 0.1) * Math.cos(y * 0.1);
        const wave2 = Math.sin((x + y) * 0.15) * 0.5;
        const w = (wave1 + wave2) * 0.5;

        data[idx] = Math.floor(128 + w * 60);
        data[idx + 1] = Math.floor(128 + w * 60);
        data[idx + 2] = 255;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.generateMipmaps = true;

    this.cache.set('waterRipple', tex);
    return tex;
  }
}
