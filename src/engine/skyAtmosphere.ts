/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export interface AtmosphereColors {
  sunColor: THREE.Color;
  ambientColor: THREE.Color;
  skyZenith: THREE.Color;
  skyHorizon: THREE.Color;
  fogColor: THREE.Color;
  sunDir: THREE.Vector3;
  sunElevation: number; // in radians
  isNight: boolean;
}

export class SkyAtmosphere {
  public domeMesh: THREE.Mesh;
  public auroraMesh: THREE.Mesh;
  private skyMaterial: THREE.ShaderMaterial;
  private auroraMaterial: THREE.ShaderMaterial;
  private starfield: THREE.Points;

  constructor() {
    // 1. Atmosphere Dome Shader
    this.skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSkyZenith: { value: new THREE.Color(0x1a4580) },
        uSkyHorizon: { value: new THREE.Color(0x89b6db) },
        uSunColor: { value: new THREE.Color(0xfff4e0) },
        uTime: { value: 0 },
        uSunElevation: { value: 1.0 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDir;
        uniform vec3 uSkyZenith;
        uniform vec3 uSkyHorizon;
        uniform vec3 uSunColor;
        uniform float uSunElevation;
        uniform float uTime;
        varying vec3 vWorldPosition;

        void main() {
          vec3 dir = normalize(vWorldPosition);
          float heightFactor = max(dir.y, 0.0);

          // Atmospheric gradient from horizon to zenith
          vec3 sky = mix(uSkyHorizon, uSkyZenith, pow(heightFactor, 0.45));

          // Mie scattering sun disk & halo
          float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
          float sunHalo = pow(sunDot, 18.0) * 0.4;
          float sunDisk = pow(sunDot, 650.0) * 3.5;

          if (uSunElevation > -0.1) {
            sky += uSunColor * (sunHalo + sunDisk);
          }

          gl_FragColor = vec4(sky, 1.0);
        }
      `,
    });

    const domeGeo = new THREE.SphereGeometry(1800, 32, 24);
    this.domeMesh = new THREE.Mesh(domeGeo, this.skyMaterial);

    // 2. Undulating Aurora Borealis Ribbon Mesh
    this.auroraMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0.0 }, // 0.0 at day, up to 1.0 at aurora night
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying float vHeight;

        void main() {
          vUv = uv;
          vec3 pos = position;

          // Undulate ribbon vertices with wave harmonics
          float wave1 = sin(pos.x * 0.005 + uTime * 0.8) * cos(pos.z * 0.005 + uTime * 0.6) * 45.0;
          float wave2 = sin(pos.x * 0.015 - uTime * 1.2) * 20.0;
          pos.y += wave1 + wave2;

          vHeight = uv.y;
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uIntensity;
        varying vec2 vUv;
        varying float vHeight;

        void main() {
          if (uIntensity <= 0.01) {
            discard;
          }

          // Vertical curtain stripes
          float stripes = sin(vUv.x * 80.0 + sin(vUv.x * 20.0 + uTime * 0.5) * 8.0);
          stripes = smoothstep(-0.2, 0.8, stripes);

          // Emerald Green base to Magenta tip gradient
          vec3 green = vec3(0.1, 0.95, 0.45);
          vec3 cyan = vec3(0.05, 0.85, 0.95);
          vec3 purple = vec3(0.7, 0.2, 0.9);

          vec3 auroraColor = mix(green, cyan, sin(vUv.x * 12.0 + uTime) * 0.5 + 0.5);
          auroraColor = mix(auroraColor, purple, pow(vHeight, 2.0));

          // Soft vertical envelope
          float alpha = sin(vHeight * 3.14159) * (0.35 + stripes * 0.65) * uIntensity;

          gl_FragColor = vec4(auroraColor, alpha * 0.85);
        }
      `,
    });

    const auroraGeo = new THREE.CylinderGeometry(850, 950, 240, 64, 16, true);
    this.auroraMesh = new THREE.Mesh(auroraGeo, this.auroraMaterial);
    this.auroraMesh.position.set(0, 480, 0);

    // 3. Realistic Twinkling Starfield
    const starCount = 1800;
    const starPositions = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 1600;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = Math.abs(r * Math.cos(phi)) + 150; // upper hemisphere
      const z = r * Math.sin(phi) * Math.sin(theta);

      starPositions[i * 3] = x;
      starPositions[i * 3 + 1] = y;
      starPositions[i * 3 + 2] = z;
      starSizes[i] = Math.random() * 2.5 + 1.0;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 3.5,
      transparent: true,
      opacity: 0.0, // animated with time of day
      sizeAttenuation: false,
    });

    this.starfield = new THREE.Points(starGeo, starMat);
  }

  public getObjects(): THREE.Object3D[] {
    return [this.domeMesh, this.auroraMesh, this.starfield];
  }

  /**
   * Computes sun trajectory, atmospheric color transitions, and night/day values.
   * timeOfDay: 0 to 24 (e.g. 6.0 = dawn, 12.0 = noon, 18.0 = sunset, 22.0 = night)
   */
  public update(timeOfDay: number, elapsedTime: number, weather: string): AtmosphereColors {
    // 24-hour cycle mapped to sun angle (0h = bottom, 12h = zenith)
    const angle = ((timeOfDay - 6.0) / 24.0) * Math.PI * 2.0;
    const sunX = Math.cos(angle) * 1200;
    const sunY = Math.sin(angle) * 1200;
    const sunZ = Math.sin(angle * 0.5) * 350;

    const sunDir = new THREE.Vector3(sunX, sunY, sunZ).normalize();
    const sunElevation = Math.sin(angle); // -1 to 1

    this.skyMaterial.uniforms.uSunDir.value.copy(sunDir);
    this.skyMaterial.uniforms.uSunElevation.value = sunElevation;
    this.skyMaterial.uniforms.uTime.value = elapsedTime;

    this.auroraMaterial.uniforms.uTime.value = elapsedTime;

    // Atmospheric calculations based on sun altitude
    const sunColor = new THREE.Color();
    const ambientColor = new THREE.Color();
    const skyZenith = new THREE.Color();
    const skyHorizon = new THREE.Color();
    const fogColor = new THREE.Color();

    const isNight = sunElevation < -0.05;

    if (sunElevation > 0.25) {
      // Day (Noon to Afternoon)
      const t = Math.min(1.0, (sunElevation - 0.25) / 0.75);
      sunColor.setRGB(1.0, 0.98, 0.92);
      ambientColor.setRGB(0.24, 0.28, 0.35);
      skyZenith.lerpColors(new THREE.Color(0x18488a), new THREE.Color(0x133c75), 1.0 - t);
      skyHorizon.lerpColors(new THREE.Color(0x89bade), new THREE.Color(0xa7d0ef), t);
      fogColor.setRGB(0.72, 0.82, 0.92);
    } else if (sunElevation > 0.0) {
      // Golden Hour / Sunrise / Sunset
      const t = sunElevation / 0.25;
      sunColor.setRGB(1.0, 0.62, 0.28);
      ambientColor.setRGB(0.28, 0.22, 0.25);
      skyZenith.lerpColors(new THREE.Color(0x352352), new THREE.Color(0x18488a), t);
      skyHorizon.lerpColors(new THREE.Color(0xeb6b34), new THREE.Color(0xf2a65a), t);
      fogColor.setRGB(0.85, 0.55, 0.45);
    } else if (sunElevation > -0.2) {
      // Twilight / Dusk
      const t = (sunElevation + 0.2) / 0.2;
      sunColor.setRGB(0.4, 0.25, 0.2);
      ambientColor.setRGB(0.12, 0.12, 0.18);
      skyZenith.lerpColors(new THREE.Color(0x0a0e22), new THREE.Color(0x352352), t);
      skyHorizon.lerpColors(new THREE.Color(0x1d1a38), new THREE.Color(0x6e3b5e), t);
      fogColor.setRGB(0.18, 0.16, 0.25);
    } else {
      // Deep Night / Moonlight
      sunColor.setRGB(0.15, 0.2, 0.35); // Moon reflection
      ambientColor.setRGB(0.04, 0.06, 0.1);
      skyZenith.setHex(0x030611);
      skyHorizon.setHex(0x0a1020);
      fogColor.setRGB(0.06, 0.09, 0.15);
    }

    // Weather adjustments
    if (weather === 'storm') {
      sunColor.multiplyScalar(0.25);
      ambientColor.multiplyScalar(0.4);
      skyZenith.setHex(0x1c212a);
      skyHorizon.setHex(0x282f3c);
      fogColor.setRGB(0.2, 0.23, 0.28);
    } else if (weather === 'sandstorm') {
      sunColor.setRGB(0.8, 0.45, 0.2);
      skyZenith.setRGB(0.45, 0.28, 0.15);
      skyHorizon.setRGB(0.7, 0.45, 0.25);
      fogColor.setRGB(0.65, 0.42, 0.22);
    }

    // Aurora intensity
    let auroraTarget = 0.0;
    if (weather === 'aurora' || (isNight && (weather === 'clear' || weather === 'fog'))) {
      auroraTarget = weather === 'aurora' ? 1.0 : 0.65;
    }
    this.auroraMaterial.uniforms.uIntensity.value = THREE.MathUtils.lerp(
      this.auroraMaterial.uniforms.uIntensity.value,
      auroraTarget,
      0.05
    );

    // Starfield visibility
    const starOpacity = Math.max(0.0, Math.min(1.0, -sunElevation * 3.5));
    (this.starfield.material as THREE.PointsMaterial).opacity = starOpacity;

    // Apply to sky dome material uniforms
    this.skyMaterial.uniforms.uSkyZenith.value.copy(skyZenith);
    this.skyMaterial.uniforms.uSkyHorizon.value.copy(skyHorizon);
    this.skyMaterial.uniforms.uSunColor.value.copy(sunColor);

    return {
      sunColor,
      ambientColor,
      skyZenith,
      skyHorizon,
      fogColor,
      sunDir,
      sunElevation,
      isNight,
    };
  }
}
