/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { PointOfInterest, BiomeType } from '../types';
import { globalBiomeSystem } from './biomeSystem';

export const DEFAULT_POIS: PointOfInterest[] = [
  {
    id: 'poi_zenith_crest',
    name: 'Zenith Peak Crags',
    tagline: 'Perpetual glacial spire dominating the northern skyline',
    biome: 'alpine',
    pos: [-240, 118, -260],
    altitudeMeters: 3140,
    temperatureC: -14.2,
    description: 'Towering granite horn sculpted by ancient glacial retreat. Heavy thermal winds sweep across the knife-edge arêtes.',
    lore: 'Local folklore speaks of the Sky Watchers who carved celestial alignments into the glacial basalt thousands of years ago.',
    iconType: 'peak',
  },
  {
    id: 'poi_emerald_taiga',
    name: 'Whispering Pine Hollow',
    tagline: 'Dense conifer forest blanketed in deep moss and ancient ferns',
    biome: 'forest',
    pos: [140, 48, 120],
    altitudeMeters: 1420,
    temperatureC: 11.5,
    description: 'Lush subalpine woodlands rich in aromatic pine resin, sheltered from highland winds by surrounding ridges.',
    lore: 'The ancient roots intertwine with subterranean water veins, sustaining bioluminescent flora that glows softly in twilight.',
    iconType: 'forest',
  },
  {
    id: 'poi_dune_expanse',
    name: 'Solstice Sand Drifts',
    tagline: 'Sweeping wind-carved desert dunes with heat shimmer ripples',
    biome: 'desert',
    pos: [220, 32, -180],
    altitudeMeters: 890,
    temperatureC: 34.8,
    description: 'Arid expanse of fine silica sand drifting in rhythmic crescent barchans across sun-baked sandstone terraces.',
    lore: 'Nomadic traders navigated these shifting dunes by memorizing the harmonic hum of the sand as wind whistles over the ridges.',
    iconType: 'desert',
  },
  {
    id: 'poi_fjord_mirror',
    name: 'Sapphire Fjord Basin',
    tagline: 'Crystal clear alpine lake mirroring sky reflections and mountain walls',
    biome: 'meadow',
    pos: [-25, 12, 10],
    altitudeMeters: 620,
    temperatureC: 16.4,
    description: 'Deep glacial meltwater fjord fed by high mountain waterfalls. Shorelines are lined with flowering clover and water lilies.',
    lore: 'The water is so mineral-pure that it reflects the aurora borealis with zero optical distortion, earning it the name Mirror of the Gods.',
    iconType: 'water',
  },
  {
    id: 'poi_obsidian_caldera',
    name: 'Obsidian Caldera Rift',
    tagline: 'Geothermal volcanic crater with glowing basalt columns',
    biome: 'volcanic',
    pos: [-220, 68, 180],
    altitudeMeters: 1980,
    temperatureC: 48.0,
    description: 'Extinct volcanic caldera with basaltic fissures. Geothermal steam plumes rise intermittently from deep underground fractures.',
    lore: 'Volcanic glass blades found here were prized by ancient artisans for their razor edges and mystical heat-retention properties.',
    iconType: 'volcano',
  },
];

export class POIManager {
  public group: THREE.Group;
  public pois: PointOfInterest[] = [];
  private markerMeshes: Map<string, {
    root: THREE.Group;
    beacon: THREE.Mesh;
    ring: THREE.Mesh;
    pillar: THREE.Mesh;
    poi: PointOfInterest;
  }> = new Map();

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouseVec: THREE.Vector2 = new THREE.Vector2();

  public onSelectPOI?: (poi: PointOfInterest) => void;
  public selectedPOIId: string | null = null;

  constructor() {
    this.group = new THREE.Group();
    this.pois = [...DEFAULT_POIS];
    this.rebuildMarkers();
  }

  public rebuildMarkers() {
    // Clear old objects
    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
    this.markerMeshes.clear();

    for (const poi of this.pois) {
      this.createMarkerObject(poi);
    }
  }

  private createMarkerObject(poi: PointOfInterest) {
    const markerGroup = new THREE.Group();
    markerGroup.position.set(poi.pos[0], poi.pos[1], poi.pos[2]);

    // Choose color scheme based on biome
    let primaryColor = 0x38bdf8; // Sky blue
    let glowColor = 0x0284c7;

    switch (poi.biome) {
      case 'alpine':
        primaryColor = 0xe0f2fe;
        glowColor = 0x38bdf8;
        break;
      case 'forest':
        primaryColor = 0x4ade80;
        glowColor = 0x16a34a;
        break;
      case 'desert':
        primaryColor = 0xfbbf24;
        glowColor = 0xd97706;
        break;
      case 'volcanic':
        primaryColor = 0xf87171;
        glowColor = 0xdc2626;
        break;
      case 'meadow':
        primaryColor = 0x2dd4bf;
        glowColor = 0x0d9488;
        break;
    }

    // 1. Floating Diamond / Octahedron Beacon
    const diamondGeo = new THREE.OctahedronGeometry(2.4, 0);
    const diamondMat = new THREE.MeshBasicMaterial({
      color: primaryColor,
      wireframe: false,
    });
    const beacon = new THREE.Mesh(diamondGeo, diamondMat);
    beacon.position.y = 8.0;
    markerGroup.add(beacon);

    // Inner glowing core
    const coreGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    beacon.add(coreMesh);

    // 2. Pulsing Holographic Ring
    const ringGeo = new THREE.TorusGeometry(3.6, 0.25, 8, 32);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: primaryColor,
      transparent: true,
      opacity: 0.7,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 8.0;
    markerGroup.add(ring);

    // 3. Vertical Light Beam Pillar
    const pillarGeo = new THREE.CylinderGeometry(0.3, 1.2, 16, 16, 1, true);
    const pillarMat = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const pillar = new THREE.Mesh(pillarGeo, pillarMat);
    pillar.position.y = 8.0;
    markerGroup.add(pillar);

    // 4. Ground pulse disc
    const discGeo = new THREE.RingGeometry(1.0, 4.5, 24);
    discGeo.rotateX(-Math.PI / 2);
    const discMat = new THREE.MeshBasicMaterial({
      color: primaryColor,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.y = 0.2;
    markerGroup.add(disc);

    // Metadata attachment for raycaster picking
    markerGroup.userData = { poiId: poi.id, poi };
    beacon.userData = { poiId: poi.id, poi };

    this.group.add(markerGroup);
    this.markerMeshes.set(poi.id, {
      root: markerGroup,
      beacon,
      ring,
      pillar,
      poi,
    });
  }

  public update(time: number, camera: THREE.Camera) {
    for (const [id, marker] of this.markerMeshes.entries()) {
      const isSelected = id === this.selectedPOIId;
      const baseScale = isSelected ? 1.4 : 1.0;

      // Animate floating diamond rotation and bobbing
      marker.beacon.rotation.y = time * 1.5;
      marker.beacon.rotation.z = Math.sin(time * 2.0) * 0.15;
      marker.beacon.position.y = 8.0 + Math.sin(time * 2.5 + marker.root.position.x) * 1.2;

      // Animate ring rotation & pulsation
      marker.ring.rotation.z = -time * 1.2;
      const pulse = 1.0 + Math.sin(time * 3.0) * 0.18;
      marker.ring.scale.set(baseScale * pulse, baseScale * pulse, baseScale * pulse);

      // Scale up if selected
      marker.beacon.scale.set(baseScale, baseScale, baseScale);
    }
  }

  /**
   * Raycast from screen coordinate (0-1) to detect marker selection
   */
  public handleRaycast(
    screenX: number,
    screenY: number,
    camera: THREE.Camera
  ): PointOfInterest | null {
    this.mouseVec.x = screenX;
    this.mouseVec.y = screenY;

    this.raycaster.setFromCamera(this.mouseVec, camera);
    const intersects = this.raycaster.intersectObjects(this.group.children, true);

    if (intersects.length > 0) {
      let current: THREE.Object3D | null = intersects[0].object;
      while (current) {
        if (current.userData && current.userData.poi) {
          const poi = current.userData.poi as PointOfInterest;
          this.selectPOI(poi.id);
          return poi;
        }
        current = current.parent;
      }
    }
    return null;
  }

  public selectPOI(id: string | null) {
    this.selectedPOIId = id;
    if (!id) return;
    const found = this.pois.find((p) => p.id === id);
    if (found && this.onSelectPOI) {
      this.onSelectPOI(found);
    }
  }

  /**
   * Add a custom point of interest created by clicking on landscape
   */
  public addCustomPOI(
    x: number,
    z: number,
    customName?: string
  ): PointOfInterest {
    const evalData = globalBiomeSystem.evaluate(x, z);
    const height = evalData.height;

    const id = `custom_${Date.now()}`;
    const name = customName || `Waypoint ${this.pois.length + 1}`;

    const newPoi: PointOfInterest = {
      id,
      name,
      tagline: `User marked surveying coordinate in the ${evalData.biome} biome`,
      biome: evalData.biome,
      pos: [x, height + 1.5, z],
      altitudeMeters: Math.round(height * 28 + 450),
      temperatureC: evalData.temperature,
      description: `Discovered surveying landmark at [${Math.round(x)}, ${Math.round(z)}]. Geological composition reflects primary ${evalData.biome} characteristics with ${Math.round(evalData.moisture * 100)}% moisture.`,
      lore: 'Recorded into the expedition map telemetry log.',
      iconType: evalData.biome === 'alpine' ? 'peak' : evalData.biome === 'forest' ? 'forest' : 'ruins',
      custom: true,
    };

    this.pois.push(newPoi);
    this.createMarkerObject(newPoi);
    this.selectPOI(newPoi.id);

    return newPoi;
  }

  public removeCustomPOI(id: string) {
    const idx = this.pois.findIndex((p) => p.id === id);
    if (idx !== -1) {
      this.pois.splice(idx, 1);
      const meshData = this.markerMeshes.get(id);
      if (meshData) {
        this.group.remove(meshData.root);
        this.markerMeshes.delete(id);
      }
      if (this.selectedPOIId === id) {
        this.selectedPOIId = null;
      }
    }
  }
}
