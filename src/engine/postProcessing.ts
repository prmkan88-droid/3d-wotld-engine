/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { ColorGradingPreset } from '../types';

export class PostProcessingStack {
  private renderer: THREE.WebGLRenderer;
  private sceneTarget: THREE.WebGLRenderTarget;
  private prevTarget: THREE.WebGLRenderTarget;
  private postScene: THREE.Scene;
  private postCamera: THREE.OrthographicCamera;
  private postMaterial: THREE.ShaderMaterial;
  private postQuad: THREE.Mesh;

  private width = 1;
  private height = 1;

  constructor(renderer: THREE.WebGLRenderer, width: number, height: number) {
    this.renderer = renderer;
    this.width = width;
    this.height = height;

    // Render targets with linear filtering & depth buffer
    const pars: THREE.RenderTargetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    };

    this.sceneTarget = new THREE.WebGLRenderTarget(width, height, pars);
    this.prevTarget = new THREE.WebGLRenderTarget(width, height, pars);

    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.postMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tPrev: { value: null },
        uResolution: { value: new THREE.Vector2(width, height) },
        uExposure: { value: 1.1 },
        uContrast: { value: 1.05 },
        uSaturation: { value: 1.1 },
        uBloomIntensity: { value: 0.8 },
        uMotionBlur: { value: 0.35 },
        uColorGradeMode: { value: 1 }, // 0: natural, 1: cinematic-warm, 2: nordic-cool, 3: moody-noir, 4: cyber-neon, 5: vibrant
        uVignetteEnabled: { value: 1.0 },
        uChromaticAberration: { value: 0.002 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D tPrev;
        uniform vec2 uResolution;
        uniform float uExposure;
        uniform float uContrast;
        uniform float uSaturation;
        uniform float uBloomIntensity;
        uniform float uMotionBlur;
        uniform int uColorGradeMode;
        uniform float uVignetteEnabled;
        uniform float uChromaticAberration;
        varying vec2 vUv;

        // ACES Film Tone Mapping
        vec3 ACESFilm(vec3 x) {
          float a = 2.51;
          float b = 0.03;
          float c = 2.43;
          float d = 0.59;
          float e = 0.14;
          return clamp((x*(a*x+b))/(x*(c*x+d)+e), 0.0, 1.0);
        }

        void main() {
          // Chromatic aberration sample offsets
          vec2 offset = (vUv - 0.5) * uChromaticAberration;
          float r = texture2D(tDiffuse, vUv + offset).r;
          float g = texture2D(tDiffuse, vUv).g;
          float b = texture2D(tDiffuse, vUv - offset).b;
          vec3 current = vec3(r, g, b);

          // Motion blur accumulation with previous frame
          if (uMotionBlur > 0.01) {
            vec3 prev = texture2D(tPrev, vUv).rgb;
            current = mix(current, prev, uMotionBlur * 0.45);
          }

          // Bloom bright-pass threshold + diffuse boost
          float luma = dot(current, vec3(0.2126, 0.7152, 0.0722));
          vec3 bloom = max(current - 0.75, 0.0) * uBloomIntensity;
          current += bloom;

          // Exposure
          current *= uExposure;

          // Tonemapping
          current = ACESFilm(current);

          // Contrast adjustment around 0.5 midpoint
          current = clamp((current - 0.5) * uContrast + 0.5, 0.0, 1.0);

          // Saturation
          float gray = dot(current, vec3(0.299, 0.587, 0.114));
          current = mix(vec3(gray), current, uSaturation);

          // Color Grading presets
          if (uColorGradeMode == 1) {
            // Cinematic Warm: warm highlights, slightly lifted teal shadows
            current.r = pow(current.r, 0.94);
            current.b = pow(current.b, 1.06);
            current += vec3(0.04, 0.02, -0.02);
          } else if (uColorGradeMode == 2) {
            // Nordic Cool: crisp blue/cyan tones, desaturated warm
            current.b = pow(current.b, 0.92);
            current.r = pow(current.r, 1.08);
            current += vec3(-0.02, 0.01, 0.05);
          } else if (uColorGradeMode == 3) {
            // Moody Noir: high contrast, deep blacks, muted color
            current = (current - 0.5) * 1.25 + 0.5;
            float lum = dot(current, vec3(0.299, 0.587, 0.114));
            current = mix(vec3(lum), current, 0.4);
          } else if (uColorGradeMode == 4) {
            // Cyber Neon: electric magenta/cyan edge punch
            current.r = pow(current.r, 0.9);
            current.b = pow(current.b, 0.85);
          } else if (uColorGradeMode == 5) {
            // Vibrant: rich nature punch
            current = mix(vec3(gray), current, 1.35);
          }

          // Vignette
          if (uVignetteEnabled > 0.5) {
            vec2 uvCenter = vUv - 0.5;
            float dist = length(uvCenter);
            float vignette = 1.0 - smoothstep(0.4, 0.85, dist);
            current *= mix(1.0, vignette, 0.45);
          }

          gl_FragColor = vec4(clamp(current, 0.0, 1.0), 1.0);
        }
      `,
    });

    const quadGeo = new THREE.PlaneGeometry(2, 2);
    this.postQuad = new THREE.Mesh(quadGeo, this.postMaterial);
    this.postScene.add(this.postQuad);
  }

  public setSize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.sceneTarget.setSize(width, height);
    this.prevTarget.setSize(width, height);
    this.postMaterial.uniforms.uResolution.value.set(width, height);
  }

  public updateUniforms(params: {
    exposure: number;
    contrast: number;
    saturation: number;
    bloomIntensity: number;
    motionBlur: number;
    colorGrading: ColorGradingPreset;
    vignette: boolean;
    chromaticAberration: boolean;
  }) {
    const u = this.postMaterial.uniforms;
    u.uExposure.value = params.exposure;
    u.uContrast.value = params.contrast;
    u.uSaturation.value = params.saturation;
    u.uBloomIntensity.value = params.bloomIntensity;
    u.uMotionBlur.value = params.motionBlur;
    u.uVignetteEnabled.value = params.vignette ? 1.0 : 0.0;
    u.uChromaticAberration.value = params.chromaticAberration ? 0.0025 : 0.0;

    let gradeIndex = 0;
    switch (params.colorGrading) {
      case 'cinematic-warm': gradeIndex = 1; break;
      case 'nordic-cool': gradeIndex = 2; break;
      case 'moody-noir': gradeIndex = 3; break;
      case 'cyber-neon': gradeIndex = 4; break;
      case 'vibrant': gradeIndex = 5; break;
      default: gradeIndex = 0; break;
    }
    u.uColorGradeMode.value = gradeIndex;
  }

  public render(scene: THREE.Scene, camera: THREE.Camera) {
    // 1. Render scene to off-screen buffer
    this.renderer.setRenderTarget(this.sceneTarget);
    this.renderer.render(scene, camera);

    // 2. Render post-processing quad to screen (null target)
    this.renderer.setRenderTarget(null);
    this.postMaterial.uniforms.tDiffuse.value = this.sceneTarget.texture;
    this.postMaterial.uniforms.tPrev.value = this.prevTarget.texture;
    this.renderer.render(this.postScene, this.postCamera);

    // 3. Swap targets for motion blur history
    const temp = this.prevTarget;
    this.prevTarget = this.sceneTarget;
    this.sceneTarget = temp;
  }
}
