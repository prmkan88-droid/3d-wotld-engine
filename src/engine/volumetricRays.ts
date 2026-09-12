/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export class VolumetricRays {
  public group: THREE.Group;
  private rayMesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  constructor() {
    this.group = new THREE.Group();

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunColor: { value: new THREE.Color(0xffe6b0) },
        uTime: { value: 0 },
        uIntensity: { value: 0.65 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorldPos = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform float uTime;
        uniform float uIntensity;
        varying vec2 vUv;
        varying vec3 vWorldPos;

        void main() {
          if (uIntensity <= 0.01) {
            discard;
          }

          // Ray noise streaks
          float streaks = sin(vUv.x * 32.0 + uTime * 0.4) * cos(vUv.x * 16.0 - uTime * 0.3);
          streaks = smoothstep(-0.2, 0.8, streaks);

          // Fade out at ends
          float fadeY = sin(vUv.y * 3.14159);
          float alpha = streaks * fadeY * uIntensity * 0.28;

          gl_FragColor = vec4(uSunColor * 1.2, alpha);
        }
      `,
    });

    // Multi-beam cylinder geometry spanning from high sky towards mountains
    const geo = new THREE.CylinderGeometry(80, 550, 750, 32, 1, true);
    this.rayMesh = new THREE.Mesh(geo, this.material);
    this.rayMesh.position.set(0, 320, 0);
    this.group.add(this.rayMesh);
  }

  public update(sunDir: THREE.Vector3, sunColor: THREE.Color, time: number, intensity: number) {
    this.material.uniforms.uSunDir.value.copy(sunDir);
    this.material.uniforms.uSunColor.value.copy(sunColor);
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uIntensity.value = intensity;

    // Orient rays along sun direction
    const target = new THREE.Vector3().copy(sunDir).multiplyScalar(-1000);
    this.rayMesh.lookAt(target);
  }
}
