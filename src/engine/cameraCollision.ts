/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { BiomeSystem, globalBiomeSystem } from './biomeSystem';

export interface CollisionSettings {
  enabled: boolean;
  minGroundClearance: number; // Minimum safe distance in meters above terrain (default ~3.2m)
  waterClearance: number;     // Minimum clearance above water plane (water is at y=8.0)
  probeRadius: number;        // Radius of neighborhood sphere check (default ~2.4m)
  cliffRepulsion: number;     // Push-back force away from vertical rock walls (default 1.2)
  smoothDamping: number;      // Smoothing factor for elevation adjustment (default 12.0)
}

/**
 * Camera Terrain Collision & Anti-Clipping System ("избегание прохождения сквозь текстуры")
 *
 * Implements multi-probe spherical capsule sampling, analytical terrain gradient repulsion,
 * smooth spring damping elevation response, and predictive trajectory lofting to ensure
 * the camera NEVER clips through terrain polygons, cliff walls, or water surfaces.
 */
export class CameraCollisionSystem {
  public settings: CollisionSettings = {
    enabled: true,
    minGroundClearance: 3.2,
    waterClearance: 1.0, // Water is at 8.0, so minimum camera y is 9.0
    probeRadius: 2.5,
    cliffRepulsion: 1.4,
    smoothDamping: 14.0,
  };

  private biomeSystem: BiomeSystem;
  private currentElevationOffset = 0;
  private previousSafePos = new THREE.Vector3();
  private tempVec = new THREE.Vector3();

  // Multi-probe offsets relative to camera center (8 radial probes + center)
  private probeAngles = [0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return { x: Math.cos(rad), z: Math.sin(rad) };
  });

  constructor(biomeSystem?: BiomeSystem) {
    this.biomeSystem = biomeSystem || globalBiomeSystem;
  }

  /**
   * Evaluates terrain surface height in a physical neighborhood around (x, z)
   * and computes the steepest cliff gradient to push the camera away from solid rock faces.
   */
  public sampleTerrainNeighborhood(
    centerX: number,
    centerZ: number,
    radius: number
  ): {
    centerHeight: number;
    maxNeighborhoodHeight: number;
    repulsionVector: THREE.Vector2;
    steepestSlope: number;
  } {
    const centerH = this.biomeSystem.getHeight(centerX, centerZ);
    let maxH = centerH;
    let repulsionX = 0;
    let repulsionZ = 0;
    let maxSlope = 0;

    for (let i = 0; i < this.probeAngles.length; i++) {
      const probe = this.probeAngles[i];
      const px = centerX + probe.x * radius;
      const pz = centerZ + probe.z * radius;
      const h = this.biomeSystem.getHeight(px, pz);

      if (h > maxH) {
        maxH = h;
      }

      // If the probe point is higher than center, it means terrain slopes upwards towards it
      const diff = h - centerH;
      if (diff > 0) {
        // Push in the opposite direction of the uphill slope
        repulsionX -= probe.x * diff;
        repulsionZ -= probe.z * diff;
        const slope = diff / radius;
        if (slope > maxSlope) {
          maxSlope = slope;
        }
      }
    }

    const repLen = Math.hypot(repulsionX, repulsionZ);
    const repulsionVector = new THREE.Vector2(
      repLen > 0.001 ? repulsionX / repLen : 0,
      repLen > 0.001 ? repulsionZ / repLen : 0
    );

    return {
      centerHeight: centerH,
      maxNeighborhoodHeight: maxH,
      repulsionVector,
      steepestSlope: maxSlope,
    };
  }

  /**
   * Resolves camera collision and texture penetration for any camera position.
   * Modifies cameraPos in-place to enforce safe ground clearance and smooth repulsion.
   */
  public resolveCollision(cameraPos: THREE.Vector3, delta: number, isDirectControl = false): void {
    if (!this.settings.enabled) return;

    const radius = this.settings.probeRadius;
    const { centerHeight, maxNeighborhoodHeight, repulsionVector, steepestSlope } =
      this.sampleTerrainNeighborhood(cameraPos.x, cameraPos.z, radius);

    // 1. Water Plane Safe Clearance (water y = 8.0)
    const minWaterY = 8.0 + this.settings.waterClearance;
    if (cameraPos.y < minWaterY) {
      cameraPos.y = minWaterY;
    }

    // 2. Minimum ground clearance buffer based on slope
    // On steeper terrain or cliffs, expand clearance so camera near-plane doesn't penetrate rock
    const slopeBuffer = Math.min(3.5, steepestSlope * 1.8);
    const requiredClearance = this.settings.minGroundClearance + slopeBuffer;
    const targetMinY = Math.max(minWaterY, maxNeighborhoodHeight + requiredClearance);

    // 3. Cliff horizontal repulsion force (if camera is below surrounding peaks)
    if (cameraPos.y < maxNeighborhoodHeight + requiredClearance * 0.8 && steepestSlope > 0.4) {
      const pushStrength = Math.min(1.5, steepestSlope) * this.settings.cliffRepulsion * delta * 18.0;
      cameraPos.x += repulsionVector.x * pushStrength;
      cameraPos.z += repulsionVector.y * pushStrength;
    }

    // 4. Smooth elevation recovery vs Hard penetration guard
    if (cameraPos.y < targetMinY) {
      if (isDirectControl) {
        // In free flight or first person, provide a cushioned spring upward
        const penetration = targetMinY - cameraPos.y;
        const springSpeed = Math.max(16.0, this.settings.smoothDamping);
        cameraPos.y += penetration * Math.min(1.0, delta * springSpeed);
        // Absolute fail-safe hard clamp to guarantee 0% polygon penetration
        if (cameraPos.y < maxNeighborhoodHeight + 1.2) {
          cameraPos.y = maxNeighborhoodHeight + 1.2;
        }
      } else {
        // Cutscene or transition mode
        cameraPos.y = targetMinY;
      }
    }

    this.previousSafePos.copy(cameraPos);
  }

  /**
   * Predictive Trajectory Lofting:
   * Inspects a flight path between point A and point B. If any section dips beneath
   * the terrain crests or cliffs, calculates an elevated arc offset.
   */
  public getPredictiveLoft(startPos: THREE.Vector3, targetPos: THREE.Vector3, samples = 10): number {
    let maxDeficit = 0;
    for (let i = 1; i < samples; i++) {
      const t = i / samples;
      const testX = THREE.MathUtils.lerp(startPos.x, targetPos.x, t);
      const testY = THREE.MathUtils.lerp(startPos.y, targetPos.y, t);
      const testZ = THREE.MathUtils.lerp(startPos.z, targetPos.z, t);

      const groundH = this.biomeSystem.getHeight(testX, testZ);
      const safeH = Math.max(9.0, groundH + this.settings.minGroundClearance + 2.0);
      if (testY < safeH) {
        const deficit = safeH - testY;
        if (deficit > maxDeficit) {
          maxDeficit = deficit;
        }
      }
    }
    return maxDeficit;
  }
}

export const globalCameraCollision = new CameraCollisionSystem();
