/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { getTerrainHeight } from './biomeSystem';

export interface ChunkNode {
  chunkX: number;
  chunkZ: number;
  centerX: number;
  centerZ: number;
  boundingSphere: THREE.Sphere;
  boundingBox: THREE.Box3;
  meshLOD0: THREE.Mesh;
  meshLOD1: THREE.Mesh;
  meshLOD2: THREE.Mesh;
  meshLOD3: THREE.Mesh;
  currentLOD: number; // 0, 1, 2, 3
  isVisible: boolean;
}

export class TerrainLODManager {
  public group: THREE.Group;
  private chunks: ChunkNode[] = [];
  private frustum: THREE.Frustum = new THREE.Frustum();
  private projScreenMatrix: THREE.Matrix4 = new THREE.Matrix4();

  // Grid dimensions
  private readonly chunkSize = 110;
  private readonly gridRadius = 4; // (2 * 4 + 1) = 9x9 = 81 chunks total
  
  // LOD Distance thresholds (world units)
  private lod0Dist = 130;
  private lod1Dist = 260;
  private lod2Dist = 420;
  private maxVisibleDist = 650;

  constructor(material: THREE.Material) {
    this.group = new THREE.Group();
    this.initTerrainGrid(material);
  }

  private generateChunkGeometry(
    cx: number,
    cz: number,
    size: number,
    segments: number
  ): THREE.BufferGeometry {
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2); // Orient horizontally

    const pos = geo.attributes.position as THREE.BufferAttribute;
    const count = pos.count;

    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < count; i++) {
      const localX = pos.getX(i);
      const localZ = pos.getZ(i);
      const worldX = cx + localX;
      const worldZ = cz + localZ;

      const y = getTerrainHeight(worldX, worldZ);
      pos.setY(i, y);

      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    return geo;
  }

  private initTerrainGrid(material: THREE.Material) {
    const r = this.gridRadius;

    for (let gx = -r; gx <= r; gx++) {
      for (let gz = -r; gz <= r; gz++) {
        const centerX = gx * this.chunkSize;
        const centerZ = gz * this.chunkSize;

        // Build 4 LOD variants for each chunk
        const geoLOD0 = this.generateChunkGeometry(centerX, centerZ, this.chunkSize, 40); // 40x40 = 3,200 tris
        const geoLOD1 = this.generateChunkGeometry(centerX, centerZ, this.chunkSize, 20); // 20x20 = 800 tris
        const geoLOD2 = this.generateChunkGeometry(centerX, centerZ, this.chunkSize, 10); // 10x10 = 200 tris
        const geoLOD3 = this.generateChunkGeometry(centerX, centerZ, this.chunkSize, 4);  // 4x4 = 32 tris

        const mesh0 = new THREE.Mesh(geoLOD0, material);
        const mesh1 = new THREE.Mesh(geoLOD1, material);
        const mesh2 = new THREE.Mesh(geoLOD2, material);
        const mesh3 = new THREE.Mesh(geoLOD3, material);

        mesh0.position.set(centerX, 0, centerZ);
        mesh1.position.set(centerX, 0, centerZ);
        mesh2.position.set(centerX, 0, centerZ);
        mesh3.position.set(centerX, 0, centerZ);

        mesh0.castShadow = true;
        mesh0.receiveShadow = true;
        mesh1.receiveShadow = true;
        mesh2.receiveShadow = true;
        mesh3.receiveShadow = true;

        // Hide all initially
        mesh0.visible = false;
        mesh1.visible = false;
        mesh2.visible = false;
        mesh3.visible = false;

        const chunkGroup = new THREE.Group();
        chunkGroup.add(mesh0, mesh1, mesh2, mesh3);
        this.group.add(chunkGroup);

        const sphere = new THREE.Sphere(
          new THREE.Vector3(centerX, 25, centerZ),
          this.chunkSize * 0.85
        );
        const box = new THREE.Box3().setFromObject(mesh0);

        this.chunks.push({
          chunkX: gx,
          chunkZ: gz,
          centerX,
          centerZ,
          boundingSphere: sphere,
          boundingBox: box,
          meshLOD0: mesh0,
          meshLOD1: mesh1,
          meshLOD2: mesh2,
          meshLOD3: mesh3,
          currentLOD: 0,
          isVisible: true,
        });
      }
    }
  }

  public update(
    camera: THREE.Camera,
    lodBias = 1.0,
    enableOcclusionCulling = true
  ): {
    totalChunks: number;
    renderedChunks: number;
    culledChunks: number;
    triangles: number;
    lodCounts: [number, number, number, number];
  } {
    // Update frustum for camera
    this.projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

    const camPos = camera.position;
    let renderedChunks = 0;
    let culledChunks = 0;
    let totalTriangles = 0;
    const lodCounts: [number, number, number, number] = [0, 0, 0, 0];

    const d0 = this.lod0Dist * lodBias;
    const d1 = this.lod1Dist * lodBias;
    const d2 = this.lod2Dist * lodBias;
    const maxDist = this.maxVisibleDist * Math.max(1.0, lodBias);

    for (const chunk of this.chunks) {
      const dx = chunk.centerX - camPos.x;
      const dz = chunk.centerZ - camPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      // 1. Distance culling (far clip / horizon fog)
      if (dist > maxDist) {
        this.hideChunk(chunk);
        culledChunks++;
        continue;
      }

      // 2. Frustum & Occlusion Culling
      if (enableOcclusionCulling && !this.frustum.intersectsSphere(chunk.boundingSphere)) {
        this.hideChunk(chunk);
        culledChunks++;
        continue;
      }

      // Chunk is visible - Determine LOD based on camera distance
      renderedChunks++;
      chunk.isVisible = true;

      let targetLOD = 0;
      if (dist > d2) {
        targetLOD = 3;
        totalTriangles += 32;
      } else if (dist > d1) {
        targetLOD = 2;
        totalTriangles += 200;
      } else if (dist > d0) {
        targetLOD = 1;
        totalTriangles += 800;
      } else {
        targetLOD = 0;
        totalTriangles += 3200;
      }

      lodCounts[targetLOD]++;
      this.setChunkLOD(chunk, targetLOD);
    }

    return {
      totalChunks: this.chunks.length,
      renderedChunks,
      culledChunks,
      triangles: totalTriangles,
      lodCounts,
    };
  }

  private hideChunk(chunk: ChunkNode) {
    chunk.isVisible = false;
    chunk.meshLOD0.visible = false;
    chunk.meshLOD1.visible = false;
    chunk.meshLOD2.visible = false;
    chunk.meshLOD3.visible = false;
  }

  private setChunkLOD(chunk: ChunkNode, lod: number) {
    chunk.currentLOD = lod;
    chunk.meshLOD0.visible = lod === 0;
    chunk.meshLOD1.visible = lod === 1;
    chunk.meshLOD2.visible = lod === 2;
    chunk.meshLOD3.visible = lod === 3;
  }

  public updateGeometryHeights() {
    for (const chunk of this.chunks) {
      const meshes = [chunk.meshLOD0, chunk.meshLOD1, chunk.meshLOD2, chunk.meshLOD3];
      for (const mesh of meshes) {
        const geo = mesh.geometry;
        const pos = geo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          const localX = pos.getX(i);
          const localZ = pos.getZ(i);
          const worldX = chunk.centerX + localX;
          const worldZ = chunk.centerZ + localZ;
          pos.setY(i, getTerrainHeight(worldX, worldZ));
        }
        pos.needsUpdate = true;
        geo.computeVertexNormals();
        geo.computeBoundingBox();
        geo.computeBoundingSphere();
      }
      chunk.boundingBox.setFromObject(chunk.meshLOD0);
    }
  }
}
