/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

/**
 * Custom Terrain PBR Shader with height-slope splatting,
 * procedural normal detail, wetness simulation, and volumetric fog support.
 */
export function createTerrainMaterial(uniforms: {
  sunDirection: { value: THREE.Vector3 };
  sunColor: { value: THREE.Color };
  ambientColor: { value: THREE.Color };
  fogColor: { value: THREE.Color };
  fogDensity: { value: number };
  time: { value: number };
  wetness: { value: number };
  sandColor: { value: THREE.Color };
  grassColor: { value: THREE.Color };
  rockColor: { value: THREE.Color };
  snowColor: { value: THREE.Color };
}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uSunDir: uniforms.sunDirection,
      uSunColor: uniforms.sunColor,
      uAmbientColor: uniforms.ambientColor,
      uFogColor: uniforms.fogColor,
      uFogDensity: uniforms.fogDensity,
      uTime: uniforms.time,
      uWetness: uniforms.wetness,
      uSandColor: uniforms.sandColor,
      uGrassColor: uniforms.grassColor,
      uRockColor: uniforms.rockColor,
      uSnowColor: uniforms.snowColor,
      uForestColor: { value: new THREE.Color(0x166534) },
      uVolcanicColor: { value: new THREE.Color(0x1c1917) },
      uMagmaColor: { value: new THREE.Color(0xd97706) },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying vec2 vUv;
      varying float vSlope;
      varying float vElevation;

      void main() {
        vUv = uv;
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        vElevation = worldPos.y;

        // Compute transformed normal
        vec3 worldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        vNormal = worldNormal;

        // Slope factor: 1.0 = vertical cliff, 0.0 = flat ground
        vSlope = 1.0 - clamp(worldNormal.y, 0.0, 1.0);

        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform vec3 uAmbientColor;
      uniform vec3 uFogColor;
      uniform float uFogDensity;
      uniform float uTime;
      uniform float uWetness;

      uniform vec3 uSandColor;
      uniform vec3 uGrassColor;
      uniform vec3 uRockColor;
      uniform vec3 uSnowColor;
      uniform vec3 uForestColor;
      uniform vec3 uVolcanicColor;
      uniform vec3 uMagmaColor;

      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying vec2 vUv;
      varying float vSlope;
      varying float vElevation;

      // Hash for procedural micro-detail
      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      void main() {
        vec3 N = normalize(vNormal);
        vec3 L = normalize(uSunDir);
        vec3 V = normalize(cameraPosition - vWorldPosition);

        // Multi-frequency micro-noise perturbation on normal for realistic rugged rocky surface
        vec2 microUv = vWorldPosition.xz * 0.18;
        float nVal = noise(microUv);
        float microDetail = (noise(microUv * 3.5) - 0.5) * 0.08;
        vec3 perturbedN = normalize(N + vec3((nVal - 0.5) * 0.16 + microDetail, 0.0, (noise(microUv + 10.0) - 0.5) * 0.16));

        // Spatial Biome zones
        // 1. Desert zone (Southeast quadrant)
        float distToDesert = length(vWorldPosition.xz - vec2(220.0, -180.0));
        float desertWeight = clamp(1.0 - distToDesert / 240.0, 0.0, 1.0);

        // Desert wind ripple pattern
        float duneRipple = sin(vWorldPosition.x * 0.35 + vWorldPosition.z * 0.18) * 0.08;
        vec3 desertSand = uSandColor + vec3(duneRipple, duneRipple * 0.7, 0.0);

        // 2. Volcanic caldera zone (Northwest quadrant)
        float distToCaldera = length(vWorldPosition.xz - vec2(-220.0, 180.0));
        float volcanicWeight = clamp(1.0 - distToCaldera / 170.0, 0.0, 1.0);

        // Geothermal micro fissure glow in volcanic depressions
        float fissurePattern = step(0.88, noise(vWorldPosition.xz * 0.12));
        vec3 volcanicAlbedo = mix(uVolcanicColor, uMagmaColor, fissurePattern * 0.65 * (1.0 - clamp(vElevation / 50.0, 0.0, 1.0)));

        // 3. Shoreline / Sand (elevation <= 11.0)
        float shoreSandWeight = clamp(1.0 - (vElevation - 6.0) / 5.0, 0.0, 1.0);
        float totalSandWeight = max(shoreSandWeight, desertWeight);

        // 4. Alpine Snow on high crests (elevation >= 58.0)
        float snowWeight = clamp((vElevation - 58.0) / 20.0, 0.0, 1.0) * clamp(1.0 - vSlope * 1.25, 0.0, 1.0);

        // 5. Steep rock cliffs
        float rockWeight = clamp((vSlope - 0.36) / 0.28, 0.0, 1.0);
        rockWeight = max(rockWeight, clamp((vElevation - 45.0) / 22.0, 0.0, 0.85));

        // 6. Forest zone (Eastern quadrant with altitude 12 - 42)
        float distToForest = length(vWorldPosition.xz - vec2(140.0, 120.0));
        float forestWeight = clamp(1.0 - distToForest / 210.0, 0.0, 1.0) * clamp(1.0 - abs(vElevation - 28.0) / 20.0, 0.0, 1.0);

        // Dynamic wind ripple animation on foliage grass
        float wind = sin(vWorldPosition.x * 0.05 + uTime * 2.0) * cos(vWorldPosition.z * 0.05 + uTime * 1.5) * 0.05;
        vec3 meadowGrass = uGrassColor + vec3(wind, wind * 1.2, 0.0);
        vec3 forestGrass = uForestColor + vec3(wind * 0.6, wind * 0.8, 0.0);

        // Biome blending
        vec3 baseFlora = mix(meadowGrass, forestGrass, forestWeight);
        vec3 albedo = mix(baseFlora, desertSand, totalSandWeight);
        albedo = mix(albedo, uRockColor, rockWeight * (1.0 - totalSandWeight * 0.7));
        albedo = mix(albedo, volcanicAlbedo, volcanicWeight);
        albedo = mix(albedo, uSnowColor, snowWeight);

        // Diffuse Lambertian Lighting
        float NdotL = max(dot(perturbedN, L), 0.0);
        vec3 diffuse = albedo * (uAmbientColor + uSunColor * NdotL);

        // Specular reflection (higher on wet rocks, water shore, and snow)
        vec3 H = normalize(L + V);
        float NdotH = max(dot(perturbedN, H), 0.0);
        float specPower = mix(16.0, 64.0, max(uWetness, snowWeight));
        float specIntensity = (snowWeight * 0.45 + uWetness * 0.5 + totalSandWeight * 0.12) * pow(NdotH, specPower);
        vec3 specular = uSunColor * specIntensity;

        vec3 finalColor = diffuse + specular;

        // Volumetric Atmospheric Fog calculation
        float dist = length(cameraPosition - vWorldPosition);
        float heightFog = exp(-vWorldPosition.y * 0.018);
        float fogFactor = 1.0 - exp(-dist * uFogDensity * (1.0 + heightFog * 1.4));
        fogFactor = clamp(fogFactor, 0.0, 1.0);

        finalColor = mix(finalColor, uFogColor, fogFactor);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
  });
}

/**
 * Realistic Animated Water Shader with Gerstner wave displacement,
 * dynamic sunlight reflection glint, and depth coloring.
 */
export function createWaterMaterial(uniforms: {
  sunDirection: { value: THREE.Vector3 };
  sunColor: { value: THREE.Color };
  ambientColor: { value: THREE.Color };
  fogColor: { value: THREE.Color };
  fogDensity: { value: number };
  time: { value: number };
}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uSunDir: uniforms.sunDirection,
      uSunColor: uniforms.sunColor,
      uAmbientColor: uniforms.ambientColor,
      uFogColor: uniforms.fogColor,
      uFogDensity: uniforms.fogDensity,
      uTime: uniforms.time,
      uWaterShallow: { value: new THREE.Color(0x28a3a3) },
      uWaterDeep: { value: new THREE.Color(0x0a3b5c) },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying vec2 vUv;

      // Gerstner Wave approximation
      vec3 gerstnerWave(vec2 dir, float steepness, float wavelength, vec2 pos, float t) {
        float k = 6.28318 / wavelength;
        float c = sqrt(9.8 / k);
        vec2 d = normalize(dir);
        float f = k * (dot(d, pos) - c * t);
        float a = steepness / k;
        return vec3(d.x * (a * cos(f)), a * sin(f), d.y * (a * cos(f)));
      }

      void main() {
        vUv = uv;
        vec3 pos = position;

        // Wave superposition
        vec3 w1 = gerstnerWave(vec2(1.0, 0.6), 0.35, 12.0, pos.xz, uTime * 1.2);
        vec3 w2 = gerstnerWave(vec2(-0.7, 0.8), 0.25, 7.0, pos.xz, uTime * 1.5);
        vec3 w3 = gerstnerWave(vec2(0.2, -1.0), 0.15, 3.5, pos.xz, uTime * 2.0);

        pos.x += w1.x + w2.x;
        pos.y += w1.y + w2.y + w3.y;
        pos.z += w1.z + w2.z;

        // Approximate normal from wave derivative
        vec3 waveNormal = normalize(vec3(-(w1.x + w2.x) * 0.4, 1.0, -(w1.z + w2.z) * 0.4));

        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPosition = worldPos.xyz;
        vNormal = normalize((modelMatrix * vec4(waveNormal, 0.0)).xyz);

        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform vec3 uAmbientColor;
      uniform vec3 uFogColor;
      uniform float uFogDensity;
      uniform float uTime;
      uniform vec3 uWaterShallow;
      uniform vec3 uWaterDeep;

      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying vec2 vUv;

      void main() {
        vec3 N = normalize(vNormal);
        vec3 L = normalize(uSunDir);
        vec3 V = normalize(cameraPosition - vWorldPosition);

        // Fresnel approximation
        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 4.0);
        fresnel = clamp(fresnel, 0.25, 0.95);

        // Specular highlight (Sun glint on waves)
        vec3 H = normalize(L + V);
        float NdotH = max(dot(N, H), 0.0);
        float sunSpecular = pow(NdotH, 128.0) * 2.2;

        // Water base color transition
        vec3 waterColor = mix(uWaterDeep, uWaterShallow, 0.35 + sin(uTime * 0.5) * 0.05);

        // Combine sky reflection + water absorption
        vec3 skyReflect = mix(uFogColor, uSunColor, 0.35);
        vec3 color = mix(waterColor, skyReflect, fresnel * 0.7);
        color += uSunColor * sunSpecular;

        // Fog
        float dist = length(cameraPosition - vWorldPosition);
        float fogFactor = 1.0 - exp(-dist * uFogDensity * 0.85);
        color = mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));

        gl_FragColor = vec4(color, 0.88);
      }
    `,
  });
}
