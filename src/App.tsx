/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { WorldEngine } from './engine/WorldEngine';
import { EngineStats } from './types';
import { HUD } from './components/HUD';

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<WorldEngine | null>(null);
  const [engine, setEngine] = useState<WorldEngine | null>(null);
  const [stats, setStats] = useState<EngineStats | null>(null);

  useEffect(() => {
    if (!canvasContainerRef.current) return;

    // Initialize 3D Engine
    const world = new WorldEngine(canvasContainerRef.current);
    engineRef.current = world;
    setEngine(world);

    // Subscribe to engine telemetry (FPS, frame time, triangles, culling)
    world.onStatsUpdate = (newStats: EngineStats) => {
      setStats(newStats);
    };

    return () => {
      world.destroy();
      engineRef.current = null;
      setEngine(null);
    };
  }, []);

  return (
    <div
      id="aetheria-app-container"
      className="relative w-screen h-screen overflow-hidden bg-neutral-950 select-none m-0 p-0 border-0"
    >
      {/* Background 3D Canvas Layer with 0px edge margin */}
      <div
        id="world-canvas-container"
        ref={canvasContainerRef}
        className="fixed inset-0 w-full h-full m-0 p-0 border-0 z-0 bg-neutral-950"
      />

      {/* Interactive HUD Overlay Layer */}
      <HUD engine={engine} stats={stats} />
    </div>
  );
}
