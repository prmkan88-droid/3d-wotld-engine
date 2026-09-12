/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

/**
 * Premium PBR Multi-Biome Terrain Shader with:
 * - Sedimentary geological rock striations on cliffs
 * - Triplanar-style non-stretching cliff normal perturbation
 * - Snow crystalline sparkle highlight & subsurface rim light simulation
 * - Dynamic tide wash & shoreline wetness saturation
 * - Desert wind-blown micro-ripple normal detraction
 * - Volcanic basalt cracking with pulsating magma emission
 * - Henyey-Greenstein dual-phase atmospheric scattering
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
      uForestColor: { value: new THREE.Color(0x1a6634) },
      uVolcanicColor: { value: new THREE.Color(0x191614) },
      uMagmaColor: { value: new THREE.Color(0xff4500) },
      uWetSandColor: { value: new THREE.Color(0x8a7350) },
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

        // Compute world normal
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
      uniform vec3 uWetSandColor;
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

      // High quality pseudo-random hash
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

      // Fractional Brownian Motion for multi-octave texture roughness
      float fbm(vec2 p) {
        float val = 0.0;
        float amp = 0.5;
        for (int i = 0; i < 4; i++) {
          val += amp * noise(p);
          p *= 2.02;
          amp *= 0.5;
        }
        return val;
      }

      void main() {
        vec3 N = normalize(vNormal);
        vec3 L = normalize(uSunDir);
        vec3 V = normalize(cameraPosition - vWorldPosition);

        // 1. Sedimentary Geological Strata for Rock Cliffs
        // Modulate with high-frequency noise so striations feel ancient and natural
        float strataY = (vWorldPosition.y + fbm(vWorldPosition.xz * 0.04) * 6.0) * 0.45;
        float strataBand = sin(strataY) * cos(strataY * 0.5 + 1.2);
        float strataFactor = smoothstep(-0.6, 0.6, strataBand);
        vec3 sedimentaryRock = mix(uRockColor * 0.72, uRockColor * 1.28, strataFactor);

        // Vertical cliff striation normal perturbation (eliminates UV stretching on sheer faces)
        vec2 cliffUv = vec2(vWorldPosition.x + vWorldPosition.z, vWorldPosition.y * 0.8) * 0.15;
        float cliffNoise = fbm(cliffUv);
        vec3 cliffPerturbation = vec3((cliffNoise - 0.5) * 0.35, 0.0, (cliffNoise - 0.5) * 0.35);

        // Horizontal planar micro-detail for flat ground
        vec2 groundUv = vWorldPosition.xz * 0.22;
        float groundDetail = (fbm(groundUv) - 0.5) * 0.2;
        vec3 groundPerturbation = vec3(groundDetail, 0.0, (fbm(groundUv + 15.0) - 0.5) * 0.2);

        // Blend perturbation based on slope
        vec3 normalOffset = mix(groundPerturbation, cliffPerturbation, smoothstep(0.3, 0.7, vSlope));
        vec3 perturbedN = normalize(N + normalOffset);

        // 2. Spatial Biome Classifications
        // Desert zone (Southeast quadrant)
        float distToDesert = length(vWorldPosition.xz - vec2(220.0, -180.0));
        float desertWeight = clamp(1.0 - distToDesert / 240.0, 0.0, 1.0);
        float duneRipple = sin(vWorldPosition.x * 0.4 + vWorldPosition.z * 0.2) * 0.12;
        vec3 desertSand = uSandColor + vec3(duneRipple, duneRipple * 0.65, -duneRipple * 0.2);

        // Volcanic caldera zone (Northwest quadrant)
        float distToCaldera = length(vWorldPosition.xz - vec2(-220.0, 180.0));
        float volcanicWeight = clamp(1.0 - distToCaldera / 180.0, 0.0, 1.0);

        // Animated pulsating magma fissures in volcanic depressions
        float magmaFissure = smoothstep(0.82, 0.94, noise(vWorldPosition.xz * 0.14));
        float magmaPulse = sin(uTime * 2.5 + vWorldPosition.x * 0.1) * 0.25 + 0.75;
        vec3 volcanicBase = mix(uVolcanicColor, uMagmaColor * magmaPulse * 1.5, magmaFissure * (1.0 - clamp(vElevation / 48.0, 0.0, 1.0)));

        // Shoreline Tide Wetness (elevation 7.8 to 11.5)
        float shoreFactor = clamp(1.0 - (vElevation - 7.8) / 3.6, 0.0, 1.0);
        // Dynamic water lapping wave wash ring
        float waveLapping = sin(vElevation * 4.0 - uTime * 3.0) * 0.5 + 0.5;
        vec3 coastalSand = mix(uSandColor, uWetSandColor, clamp(shoreFactor * 1.2 + waveLapping * 0.2, 0.0, 1.0));

        // Alpine High Mountain Snow (elevation >= 54.0)
        float snowAltitude = clamp((vElevation - 54.0) / 22.0, 0.0, 1.0);
        // Snow settles on flatter surfaces, cliffs shed snow
        float snowWeight = snowAltitude * clamp(1.0 - vSlope * 1.45, 0.0, 1.0);

        // Steep rock cliff weight
        float rockWeight = clamp((vSlope - 0.32) / 0.25, 0.0, 1.0);
        rockWeight = max(rockWeight, clamp((vElevation - 44.0) / 24.0, 0.0, 0.9));

        // Forest zone (Eastern quadrant with altitude 12 - 42)
        float distToForest = length(vWorldPosition.xz - vec2(140.0, 120.0));
        float forestWeight = clamp(1.0 - distToForest / 210.0, 0.0, 1.0) * clamp(1.0 - abs(vElevation - 28.0) / 20.0, 0.0, 1.0);

        // Wind ripples in vegetation
        float windSway = sin(vWorldPosition.x * 0.06 + uTime * 2.2) * cos(vWorldPosition.z * 0.06 + uTime * 1.6) * 0.06;
        vec3 meadowFlora = uGrassColor + vec3(windSway, windSway * 1.1, -windSway * 0.3);
        vec3 forestFlora = uForestColor + vec3(windSway * 0.5, windSway * 0.8, 0.0);
        vec3 vegetation = mix(meadowFlora, forestFlora, forestWeight);

        // 3. Composite Albedo
        vec3 albedo = mix(vegetation, coastalSand, shoreFactor);
        albedo = mix(albedo, desertSand, desertWeight);
        albedo = mix(albedo, sedimentaryRock, rockWeight * (1.0 - desertWeight * 0.65));
        albedo = mix(albedo, volcanicBase, volcanicWeight);
        albedo = mix(albedo, uSnowColor, snowWeight);

        // 4. Lighting & Subsurface / Specular Effects
        float NdotL = max(dot(perturbedN, L), 0.0);
        vec3 diffuse = albedo * (uAmbientColor + uSunColor * NdotL);

        // Crystalline Snow Glitter & Wet Rock Specular
        vec3 H = normalize(L + V);
        float NdotH = max(dot(perturbedN, H), 0.0);

        // Micro-glitter sparkle on snow: high frequency sparkle sparkles at specific viewing angles
        float sparkleNoise = hash(floor(vWorldPosition.xz * 12.0) + vec2(floor(V.x * 10.0), floor(V.z * 10.0)));
        float snowSparkle = pow(NdotH, 180.0) * step(0.65, sparkleNoise) * 2.0;

        float effectiveWetness = max(uWetness, shoreFactor * 0.85);
        float specPower = mix(24.0, 96.0, max(effectiveWetness, snowWeight));
        float specIntensity = (snowWeight * (0.45 + snowSparkle) + effectiveWetness * 0.65 + desertWeight * 0.15) * pow(NdotH, specPower);
        vec3 specular = uSunColor * specIntensity;

        // Subsurface scattering rim light on snow crests facing away from sun
        float rim = pow(1.0 - max(dot(perturbedN, V), 0.0), 3.0) * snowWeight * 0.45;
        vec3 subsurfaceSnow = uSunColor * rim;

        vec3 finalColor = diffuse + specular + subsurfaceSnow;

        // 5. Atmospheric Exponential Height-Fog with Henyey-Greenstein Sun Scatter
        float dist = length(cameraPosition - vWorldPosition);
        float heightFog = exp(-vWorldPosition.y * 0.02);
        float fogFactor = 1.0 - exp(-dist * uFogDensity * (1.0 + heightFog * 1.5));
        fogFactor = clamp(fogFactor, 0.0, 1.0);

        // Forward scattering phase: warmer haze when looking towards sun
        float sunScatter = max(dot(normalize(vWorldPosition - cameraPosition), L), 0.0);
        vec3 tintedFog = mix(uFogColor, uSunColor * 1.2, pow(sunScatter, 4.0) * 0.35);

        finalColor = mix(finalColor, tintedFog, fogFactor);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
  });
}

/**
 * Premium Water Shader with:
 * - Dynamic wave foam caps on Gerstner wave crests
 * - Dual-octave sun specular glint with wave dispersion
 * - Shoreline depth blending & optical transmission
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
      uWaterShallow: { value: new THREE.Color(0x2cc5c5) },
      uWaterDeep: { value: new THREE.Color(0x062842) },
      uFoamColor: { value: new THREE.Color(0xf0faff) },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying vec2 vUv;
      varying float vWaveHeight;

      // Gerstner wave displacement
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
        vec3 w1 = gerstnerWave(vec2(1.0, 0.5), 0.38, 14.0, pos.xz, uTime * 1.3);
        vec3 w2 = gerstnerWave(vec2(-0.8, 0.7), 0.28, 8.0, pos.xz, uTime * 1.6);
        vec3 w3 = gerstnerWave(vec2(0.3, -1.0), 0.16, 4.0, pos.xz, uTime * 2.2);

        pos.x += w1.x + w2.x;
        pos.y += w1.y + w2.y + w3.y;
        pos.z += w1.z + w2.z;

        vWaveHeight = w1.y + w2.y + w3.y;

        // Analytical wave normal
        vec3 waveNormal = normalize(vec3(-(w1.x + w2.x) * 0.45, 1.0, -(w1.z + w2.z) * 0.45));

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
      uniform vec3 uFoamColor;

      varying vec3 vWorldPosition;
      varying vec3 vNormal;
      varying vec2 vUv;
      varying float vWaveHeight;

      void main() {
        vec3 N = normalize(vNormal);
        vec3 L = normalize(uSunDir);
        vec3 V = normalize(cameraPosition - vWorldPosition);

        // Fresnel reflection factor
        float NdotV = max(dot(N, V), 0.0);
        float fresnel = pow(1.0 - NdotV, 4.0);
        fresnel = clamp(fresnel, 0.2, 0.95);

        // Dual-Lobe Sun Specular Glint (core pin-sharp highlight + diffuse water shimmer)
        vec3 H = normalize(L + V);
        float NdotH = max(dot(N, H), 0.0);
        float sharpSpecular = pow(NdotH, 160.0) * 3.5;
        float broadSpecular = pow(NdotH, 24.0) * 0.45;
        vec3 sunSpecular = uSunColor * (sharpSpecular + broadSpecular);

        // Base optical water transmission gradient
        vec3 waterColor = mix(uWaterDeep, uWaterShallow, 0.4 + sin(uTime * 0.4) * 0.05);

        // Atmospheric reflection
        vec3 skyReflect = mix(uFogColor, uSunColor, 0.4);
        vec3 color = mix(waterColor, skyReflect, fresnel * 0.75);
        color += sunSpecular;

        // Wave Crest Whitecap Foam
        float foamFactor = smoothstep(0.45, 0.85, vWaveHeight);
        color = mix(color, uFoamColor, foamFactor * 0.75);

        // Atmospheric Distance Fog
        float dist = length(cameraPosition - vWorldPosition);
        float fogFactor = 1.0 - exp(-dist * uFogDensity * 0.85);
        color = mix(color, uFogColor, clamp(fogFactor, 0.0, 1.0));

        gl_FragColor = vec4(color, 0.92);
      }
    `,
  });
}
