/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Sun,
  Moon,
  CloudRain,
  Compass,
  Video,
  Eye,
  Sliders,
  Maximize2,
  Minimize2,
  Gauge,
  Play,
  Pause,
  ChevronRight,
  CloudFog,
  Wind,
  Layers,
  Zap,
  Info,
  Send,
  Loader2,
  RotateCcw,
  MapPin,
  Mountain,
  Trees,
  Flame,
  Droplets,
  Bird,
  Rabbit,
  Crosshair,
  FastForward,
  Navigation,
  X,
  Volume2,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { WorldEngine } from '../engine/WorldEngine';
import {
  EngineStats,
  WeatherType,
  ColorGradingPreset,
  CutscenePresetId,
  CameraMode,
  QualityPreset,
  PointOfInterest,
  BiomeType,
  BiomeParameters,
  StaticVantagePoint,
} from '../types';
import { EXTENDED_CUTSCENE_PRESETS, STATIC_VANTAGE_POINTS } from '../engine/cinematicDirector';

interface HUDProps {
  engine: WorldEngine | null;
  stats: EngineStats | null;
}

export const HUD: React.FC<HUDProps> = ({ engine, stats }) => {
  // Tab panels: null (closed), 'director', 'pois', 'biomes', 'environment', 'weather', 'postprocess', 'stats', 'ai'
  const [activeTab, setActiveTab] = useState<
    'director' | 'pois' | 'biomes' | 'environment' | 'weather' | 'postprocess' | 'stats' | 'ai' | null
  >(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hudVisible, setHudVisible] = useState(true);

  // Selected POI for detail inspection card
  const [selectedPOI, setSelectedPOI] = useState<PointOfInterest | null>(null);

  // AI Director state
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [directorMessage, setDirectorMessage] = useState<string | null>(
    'Cinematic Director active. Automated trajectory interpolation & responsive environment initialized.'
  );

  // Local mirror state for fast reactive sliders
  const [timeOfDay, setTimeOfDay] = useState(engine?.settings.timeOfDay ?? 11.0);
  const [isDayCycle, setIsDayCycle] = useState(engine?.settings.isCycleActive ?? true);
  const [currentWeather, setCurrentWeather] = useState<WeatherType>(engine?.settings.weather ?? 'clear');
  const [currentGrade, setCurrentGrade] = useState<ColorGradingPreset>(engine?.settings.colorGrading ?? 'cinematic-warm');
  const [cameraMode, setCameraMode] = useState<CameraMode>(engine?.cinematicDirector.mode ?? 'cutscene');
  const [currentCutscene, setCurrentCutscene] = useState<CutscenePresetId>('mountain_crest');
  const [currentVantage, setCurrentVantage] = useState<string>('vantage_summit');
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [motionBlur, setMotionBlur] = useState(engine?.settings.motionBlurIntensity ?? 0.35);
  const [bloom, setBloom] = useState(engine?.settings.bloomIntensity ?? 0.75);
  const [volumetricRays, setVolumetricRays] = useState(engine?.settings.volumetricRays ?? true);
  const [occlusionCull, setOcclusionCull] = useState(engine?.settings.occlusionCulling ?? true);
  const [quality, setQuality] = useState<QualityPreset>('high-100fps');

  // Camera Anti-Clipping & Terrain Collision Avoidance
  const [antiClippingEnabled, setAntiClippingEnabled] = useState(true);
  const [minGroundClearance, setMinGroundClearance] = useState(3.2);
  const [cliffRepulsion, setCliffRepulsion] = useState(1.4);

  // Biome Generation Parameters state
  const [biomeParams, setBiomeParams] = useState<BiomeParameters>({
    seed: 428309,
    heightScale: 1.0,
    roughness: 1.0,
    biomeScale: 1.0,
    moistureOffset: 0.0,
    temperatureOffset: 0.0,
    mountainSteepness: 1.15,
    valleyDepth: 1.0,
    primaryBiome: 'diverse',
  });

  // Environmental Elements state
  const [envSettings, setEnvSettings] = useState({
    reactiveFoliage: true,
    wildlifeFlocks: true,
    groundWildlife: true,
    ambientParticles: true,
  });

  // Virtual touch controls for mobile
  const [touchActive, setTouchActive] = useState(false);
  const touchStartPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!engine) return;
    const interval = setInterval(() => {
      setTimeOfDay(engine.settings.timeOfDay);
    }, 250);

    // Register POI selection callback
    engine.onSelectPOI = (poi) => {
      setSelectedPOI(poi);
    };

    return () => clearInterval(interval);
  }, [engine]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Weather change
  const handleWeatherChange = (w: WeatherType) => {
    if (!engine) return;
    setCurrentWeather(w);
    engine.settings.weather = w;
  };

  // Time change
  const handleTimeChange = (t: number) => {
    if (!engine) return;
    setTimeOfDay(t);
    engine.settings.timeOfDay = t;
  };

  // Cutscene change
  const handlePlayCutscene = (id: CutscenePresetId) => {
    if (!engine) return;
    setCurrentCutscene(id);
    setCameraMode('cutscene');
    engine.cinematicDirector.playCutscene(id);
    const preset = EXTENDED_CUTSCENE_PRESETS.find((p) => p.id === id);
    if (preset) {
      handleWeatherChange(preset.recommendedWeather);
      handleTimeChange(preset.recommendedTime);
    }
  };

  // Static vantage point change
  const handleSelectVantage = (vantageId: string) => {
    if (!engine) return;
    setCurrentVantage(vantageId);
    setCameraMode('static');
    engine.cinematicDirector.setVantagePoint(vantageId);
  };

  // Camera Mode change
  const handleCameraModeChange = (mode: CameraMode) => {
    if (!engine) return;
    setCameraMode(mode);
    engine.cinematicDirector.setMode(mode);
  };

  // Quality preset change
  const handleQualityChange = (q: QualityPreset) => {
    if (!engine) return;
    setQuality(q);
    engine.setQualityPreset(q);
  };

  // Fly camera to a POI landmark
  const handleFlyToPOI = (poiId: string) => {
    if (!engine) return;
    engine.flyToPOI(poiId);
    const found = engine.poiManager.pois.find((p) => p.id === poiId);
    if (found) setSelectedPOI(found);
  };

  // Regenerate Procedural Landscape with updated biome parameters
  const handleApplyBiomeParams = (updated: Partial<BiomeParameters>) => {
    if (!engine) return;
    const next = { ...biomeParams, ...updated };
    setBiomeParams(next);
    engine.regenerateProceduralWorld(next);
  };

  // Randomize seed
  const handleRandomizeSeed = () => {
    const newSeed = Math.floor(Math.random() * 900000) + 100000;
    handleApplyBiomeParams({ seed: newSeed });
  };

  // Trigger Wildlife Scatter Action
  const handleScatterWildlife = () => {
    if (!engine) return;
    engine.environmentalElements.triggerMassWildlifeScatter();
  };

  // Call Gemini AI Director
  const handleDirectWorld = async (promptText?: string) => {
    const query = promptText || aiPrompt;
    if (!query.trim() || !engine) return;

    setIsAiLoading(true);
    try {
      const res = await fetch('/api/gemini/biome-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: query,
          currentParams: {
            timeOfDay: engine.settings.timeOfDay,
            weather: engine.settings.weather,
            colorGrading: engine.settings.colorGrading,
          },
        }),
      });

      const data = await res.json();
      if (data.success && data.params) {
        const p = data.params;
        setDirectorMessage(p.directorMessage || 'Cutscene choreography and environment updated.');

        if (typeof p.timeOfDay === 'number') handleTimeChange(p.timeOfDay);
        if (p.weather) handleWeatherChange(p.weather as WeatherType);
        if (p.colorGrading) {
          setCurrentGrade(p.colorGrading as ColorGradingPreset);
          engine.settings.colorGrading = p.colorGrading as ColorGradingPreset;
        }
        if (typeof p.fogDensity === 'number') engine.settings.fogDensity = p.fogDensity;
        if (typeof p.bloomIntensity === 'number') {
          setBloom(p.bloomIntensity);
          engine.settings.bloomIntensity = p.bloomIntensity;
        }
        if (typeof p.motionBlur === 'number') {
          setMotionBlur(p.motionBlur);
          engine.settings.motionBlurIntensity = p.motionBlur;
        }
        if (p.cameraTourPreset) {
          handlePlayCutscene(p.cameraTourPreset as CutscenePresetId);
        }
      }
    } catch (err) {
      console.error('AI Directing error:', err);
    } finally {
      setIsAiLoading(false);
      setAiPrompt('');
    }
  };

  // Mobile virtual joystick handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (cameraMode === 'cutscene') return;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    setTouchActive(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!engine || cameraMode === 'cutscene' || !touchActive) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartPos.current.x;
    const dy = touch.clientY - touchStartPos.current.y;

    if (touch.clientX < window.innerWidth * 0.5) {
      engine.cinematicDirector.touchMoveDelta.x = Math.max(-1, Math.min(1, dx * 0.05));
      engine.cinematicDirector.touchMoveDelta.y = Math.max(-1, Math.min(1, -dy * 0.05));
    } else {
      engine.cinematicDirector.touchLookDelta.x = dx * 0.8;
      engine.cinematicDirector.touchLookDelta.y = dy * 0.8;
      touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    }
  };

  const handleTouchEnd = () => {
    if (engine) {
      engine.cinematicDirector.touchMoveDelta = { x: 0, y: 0 };
      engine.cinematicDirector.touchLookDelta = { x: 0, y: 0 };
    }
    setTouchActive(false);
  };

  // Formatting helpers
  const formatTime = (t: number) => {
    const hours = Math.floor(t);
    const mins = Math.floor((t - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const currentCutsceneInfo = EXTENDED_CUTSCENE_PRESETS.find((p) => p.id === currentCutscene);

  const getBiomeColorClass = (biome: BiomeType) => {
    switch (biome) {
      case 'alpine':
        return 'text-sky-300 bg-sky-950/70 border-sky-500/40';
      case 'forest':
        return 'text-emerald-300 bg-emerald-950/70 border-emerald-500/40';
      case 'desert':
        return 'text-amber-300 bg-amber-950/70 border-amber-500/40';
      case 'volcanic':
        return 'text-rose-300 bg-rose-950/70 border-rose-500/40';
      case 'meadow':
        return 'text-teal-300 bg-teal-950/70 border-teal-500/40';
    }
  };

  return (
    <div
      id="hud-root-layer"
      className="fixed inset-0 pointer-events-none select-none overflow-hidden z-20 flex flex-col justify-between"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Header & Telemetry Bar (p-[8px], m-[4px]) */}
      <header
        id="hud-top-bar"
        className="pointer-events-auto flex items-center justify-between m-[4px] p-[8px] bg-neutral-950/85 backdrop-blur-md rounded-[12px] border border-neutral-800/80 text-neutral-100 shadow-2xl transition-all"
      >
        <div className="flex items-center gap-[8px]">
          {/* Logo / Engine badge */}
          <div className="flex items-center gap-[6px] px-[8px] py-[4px] bg-emerald-950/60 border border-emerald-500/40 rounded-[8px]">
            <Compass className="w-[16px] h-[16px] text-emerald-400" />
            <span className="text-[13px] font-bold tracking-wider text-emerald-300">
              AETHERIA 3D
            </span>
          </div>

          {/* Real-time 100 FPS Telemetry Pill */}
          <div className="flex items-center gap-[6px] px-[8px] py-[4px] bg-neutral-900/90 rounded-[8px] border border-neutral-700/60">
            <Gauge className="w-[14px] h-[14px] text-cyan-400" />
            <div className="flex items-baseline gap-[4px]">
              <span
                className={`text-[13px] font-black ${
                  (stats?.fps ?? 100) >= 90
                    ? 'text-cyan-400'
                    : (stats?.fps ?? 100) >= 60
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {stats?.fps ?? 100}
              </span>
              <span className="text-[10px] text-neutral-400">FPS</span>
              <span className="text-[11px] text-neutral-500 hidden sm:inline">
                ({stats?.frameTimeMs ?? 10.0}ms)
              </span>
            </div>
          </div>

          {/* Active Camera Readout */}
          <div className="hidden lg:flex items-center gap-[6px] px-[8px] py-[4px] bg-neutral-900/90 rounded-[8px] border border-neutral-800 text-[11px] text-neutral-300">
            <Video className="w-[12px] h-[12px] text-emerald-400" />
            <span className="truncate max-w-[180px]">
              {engine?.cinematicDirector.currentKeyframeText || currentCutsceneInfo?.name}
            </span>
          </div>
        </div>

        {/* Top Right Quick Controls */}
        <div className="flex items-center gap-[6px]">
          {/* Weather pill */}
          <button
            onClick={() => setActiveTab(activeTab === 'weather' ? null : 'weather')}
            className="flex items-center gap-[6px] px-[8px] py-[4px] bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/60 rounded-[8px] text-[12px] text-neutral-200 transition-colors"
          >
            <Sun className="w-[13px] h-[13px] text-amber-400" />
            <span>{formatTime(timeOfDay)}</span>
            <span className="text-neutral-400 capitalize hidden sm:inline">({currentWeather})</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-[6px] bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/60 rounded-[8px] text-neutral-300 transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className="w-[15px] h-[15px]" />
            ) : (
              <Maximize2 className="w-[15px] h-[15px]" />
            )}
          </button>
        </div>
      </header>

      {/* Floating Contextual Landmark POI Modal / Overlay Card */}
      {selectedPOI && (
        <div
          id="poi-context-card"
          className="pointer-events-auto absolute top-[68px] right-[8px] w-[340px] max-w-[calc(100vw-16px)] p-[12px] bg-neutral-950/90 backdrop-blur-xl rounded-[14px] border border-neutral-700/80 text-neutral-100 shadow-2xl transition-all z-30"
        >
          <div className="flex items-start justify-between gap-[8px] mb-[6px]">
            <div className="flex items-center gap-[6px]">
              <span
                className={`px-[8px] py-[2px] rounded-[6px] text-[10px] font-black uppercase tracking-wider border ${getBiomeColorClass(
                  selectedPOI.biome
                )}`}
              >
                {selectedPOI.biome} Biome
              </span>
              {selectedPOI.custom && (
                <span className="px-[6px] py-[2px] rounded-[6px] text-[9px] font-bold bg-purple-950/70 border border-purple-500/40 text-purple-300">
                  Custom
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setSelectedPOI(null);
                if (engine) engine.poiManager.selectPOI(null);
              }}
              className="p-[4px] text-neutral-400 hover:text-neutral-100 bg-neutral-900 rounded-[6px]"
            >
              <X className="w-[14px] h-[14px]" />
            </button>
          </div>

          <h3 className="text-[16px] font-bold text-neutral-50 mb-[2px]">
            {selectedPOI.name}
          </h3>
          <p className="text-[11px] text-neutral-400 mb-[8px] leading-snug">
            {selectedPOI.tagline}
          </p>

          {/* Environmental Telemetry Metrics */}
          <div className="grid grid-cols-2 gap-[6px] p-[8px] bg-neutral-900/90 rounded-[8px] border border-neutral-800 mb-[8px] text-[11px]">
            <div>
              <span className="text-neutral-400 text-[10px] block">Altitude</span>
              <span className="font-bold text-cyan-300">
                {selectedPOI.altitudeMeters.toLocaleString()} m
              </span>
            </div>
            <div>
              <span className="text-neutral-400 text-[10px] block">Temperature</span>
              <span className="font-bold text-amber-300">
                {selectedPOI.temperatureC > 0 ? `+${selectedPOI.temperatureC}` : selectedPOI.temperatureC} °C
              </span>
            </div>
            <div>
              <span className="text-neutral-400 text-[10px] block">Coordinates</span>
              <span className="font-mono text-[10px] text-neutral-300">
                [{Math.round(selectedPOI.pos[0])}, {Math.round(selectedPOI.pos[2])}]
              </span>
            </div>
            <div>
              <span className="text-neutral-400 text-[10px] block">Atmosphere</span>
              <span className="text-[10px] font-semibold text-emerald-300 capitalize">
                {currentWeather}
              </span>
            </div>
          </div>

          {/* Geological Description & Lore */}
          <p className="text-[11px] text-neutral-300 mb-[6px] leading-relaxed">
            {selectedPOI.description}
          </p>
          <div className="p-[8px] bg-neutral-900/60 rounded-[8px] border-l-2 border-emerald-500 mb-[10px] text-[10px] italic text-neutral-400">
            "{selectedPOI.lore}"
          </div>

          {/* Action Button: Fly Camera Here */}
          <button
            onClick={() => handleFlyToPOI(selectedPOI.id)}
            className="w-full py-[8px] px-[12px] bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-[8px] text-[12px] flex items-center justify-center gap-[6px] transition-colors shadow-lg"
          >
            <Video className="w-[14px] h-[14px]" />
            <span>Fly Camera Here (Cinematic Approach)</span>
          </button>
        </div>
      )}

      {/* Middle Interactive Zone & Openable Control Panels */}
      <div id="hud-main-workspace" className="pointer-events-auto flex flex-1 items-start gap-[8px] m-[4px] relative">
        {/* Left Vertical Dock Icon Menu */}
        <nav
          id="hud-left-dock"
          className="flex flex-col gap-[4px] p-[4px] bg-neutral-950/85 backdrop-blur-md rounded-[12px] border border-neutral-800/80 shadow-2xl"
        >
          {/* 1. Cinematic Director */}
          <button
            onClick={() => setActiveTab(activeTab === 'director' ? null : 'director')}
            className={`p-[8px] rounded-[8px] transition-colors flex items-center justify-center ${
              activeTab === 'director'
                ? 'bg-emerald-500 text-neutral-950 shadow-md'
                : 'text-neutral-300 hover:bg-neutral-800'
            }`}
            title="Cinematic Director & Camera Modes"
          >
            <Video className="w-[16px] h-[16px]" />
          </button>

          {/* 2. Points of Interest (POI) Map */}
          <button
            onClick={() => setActiveTab(activeTab === 'pois' ? null : 'pois')}
            className={`p-[8px] rounded-[8px] transition-colors flex items-center justify-center ${
              activeTab === 'pois'
                ? 'bg-emerald-500 text-neutral-950 shadow-md'
                : 'text-neutral-300 hover:bg-neutral-800'
            }`}
            title="Points of Interest & Landmarks"
          >
            <MapPin className="w-[16px] h-[16px]" />
          </button>

          {/* 3. Procedural Biomes Generator */}
          <button
            onClick={() => setActiveTab(activeTab === 'biomes' ? null : 'biomes')}
            className={`p-[8px] rounded-[8px] transition-colors flex items-center justify-center ${
              activeTab === 'biomes'
                ? 'bg-emerald-500 text-neutral-950 shadow-md'
                : 'text-neutral-300 hover:bg-neutral-800'
            }`}
            title="Procedural Biome Generation"
          >
            <Mountain className="w-[16px] h-[16px]" />
          </button>

          {/* 4. Interactive Environmental Life */}
          <button
            onClick={() => setActiveTab(activeTab === 'environment' ? null : 'environment')}
            className={`p-[8px] rounded-[8px] transition-colors flex items-center justify-center ${
              activeTab === 'environment'
                ? 'bg-emerald-500 text-neutral-950 shadow-md'
                : 'text-neutral-300 hover:bg-neutral-800'
            }`}
            title="Interactive Environmental Elements & Wildlife"
          >
            <Bird className="w-[16px] h-[16px]" />
          </button>

          {/* 5. Atmosphere & Weather */}
          <button
            onClick={() => setActiveTab(activeTab === 'weather' ? null : 'weather')}
            className={`p-[8px] rounded-[8px] transition-colors flex items-center justify-center ${
              activeTab === 'weather'
                ? 'bg-emerald-500 text-neutral-950 shadow-md'
                : 'text-neutral-300 hover:bg-neutral-800'
            }`}
            title="Weather Systems & Time of Day"
          >
            <CloudRain className="w-[16px] h-[16px]" />
          </button>

          {/* 6. Post-Processing Stack */}
          <button
            onClick={() => setActiveTab(activeTab === 'postprocess' ? null : 'postprocess')}
            className={`p-[8px] rounded-[8px] transition-colors flex items-center justify-center ${
              activeTab === 'postprocess'
                ? 'bg-emerald-500 text-neutral-950 shadow-md'
                : 'text-neutral-300 hover:bg-neutral-800'
            }`}
            title="Post-Processing & Color Grading"
          >
            <Sliders className="w-[16px] h-[16px]" />
          </button>

          {/* 7. Performance Telemetry (100 FPS) */}
          <button
            onClick={() => setActiveTab(activeTab === 'stats' ? null : 'stats')}
            className={`p-[8px] rounded-[8px] transition-colors flex items-center justify-center ${
              activeTab === 'stats'
                ? 'bg-emerald-500 text-neutral-950 shadow-md'
                : 'text-neutral-300 hover:bg-neutral-800'
            }`}
            title="Engine Telemetry & LOD Profiler"
          >
            <Gauge className="w-[16px] h-[16px]" />
          </button>

          {/* 8. AI Director */}
          <button
            onClick={() => setActiveTab(activeTab === 'ai' ? null : 'ai')}
            className={`p-[8px] rounded-[8px] transition-colors flex items-center justify-center ${
              activeTab === 'ai'
                ? 'bg-purple-500 text-neutral-950 shadow-md'
                : 'text-neutral-300 hover:bg-neutral-800'
            }`}
            title="Gemini AI Atmosphere Director"
          >
            <Sparkles className="w-[16px] h-[16px] text-purple-400" />
          </button>
        </nav>

        {/* ========================================================================= */}
        {/* TAB 1: CINEMATIC DIRECTOR MODULE */}
        {/* ========================================================================= */}
        {activeTab === 'director' && (
          <div
            id="panel-cinematic-director"
            className="w-[340px] max-w-[calc(100vw-60px)] p-[12px] bg-neutral-950/90 backdrop-blur-xl rounded-[14px] border border-neutral-800 text-neutral-100 shadow-2xl max-h-[78vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-[8px]">
              <div className="flex items-center gap-[6px]">
                <Video className="w-[16px] h-[16px] text-emerald-400" />
                <h2 className="text-[14px] font-bold">Cinematic Director</h2>
              </div>
              <button
                onClick={() => setActiveTab(null)}
                className="p-[4px] text-neutral-400 hover:text-neutral-100"
              >
                <X className="w-[14px] h-[14px]" />
              </button>
            </div>

            {/* Camera Mode Switcher (Cutscene, Free Flight, Static Vantage, First-Person) */}
            <div className="mb-[10px]">
              <span className="text-[11px] text-neutral-400 mb-[4px] block font-semibold">
                Camera Operating Mode
              </span>
              <div className="grid grid-cols-2 gap-[4px]">
                <button
                  onClick={() => handleCameraModeChange('cutscene')}
                  className={`py-[6px] px-[8px] rounded-[6px] text-[11px] font-bold transition-all ${
                    cameraMode === 'cutscene'
                      ? 'bg-emerald-500 text-neutral-950'
                      : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  Automated Fly-Through
                </button>
                <button
                  onClick={() => handleCameraModeChange('free')}
                  className={`py-[6px] px-[8px] rounded-[6px] text-[11px] font-bold transition-all ${
                    cameraMode === 'free'
                      ? 'bg-emerald-500 text-neutral-950'
                      : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  Free Flight (6-DOF)
                </button>
                <button
                  onClick={() => handleCameraModeChange('static')}
                  className={`py-[6px] px-[8px] rounded-[6px] text-[11px] font-bold transition-all ${
                    cameraMode === 'static'
                      ? 'bg-emerald-500 text-neutral-950'
                      : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  Static Vantage Points
                </button>
                <button
                  onClick={() => handleCameraModeChange('firstPerson')}
                  className={`py-[6px] px-[8px] rounded-[6px] text-[11px] font-bold transition-all ${
                    cameraMode === 'firstPerson'
                      ? 'bg-emerald-500 text-neutral-950'
                      : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  Ground Inspection Walk
                </button>
              </div>
            </div>

            {/* Camera Terrain & Texture Anti-Clipping System */}
            <div className="mb-[10px] p-[8px] bg-neutral-900/90 rounded-[8px] border border-emerald-900/50 shadow-inner">
              <div className="flex items-center justify-between mb-[6px]">
                <div className="flex items-center gap-[6px]">
                  {antiClippingEnabled ? (
                    <ShieldCheck className="w-[14px] h-[14px] text-emerald-400" />
                  ) : (
                    <ShieldAlert className="w-[14px] h-[14px] text-amber-400" />
                  )}
                  <span className="text-[11px] font-bold text-neutral-200">
                    Anti-Clipping Protection
                  </span>
                </div>
                <button
                  onClick={() => {
                    const nextVal = !antiClippingEnabled;
                    setAntiClippingEnabled(nextVal);
                    if (engine) {
                      engine.cinematicDirector.collisionSystem.settings.enabled = nextVal;
                    }
                  }}
                  className={`px-[8px] py-[3px] rounded-[6px] text-[10px] font-bold transition-all ${
                    antiClippingEnabled
                      ? 'bg-emerald-500 text-neutral-950 shadow-sm'
                      : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                  }`}
                >
                  {antiClippingEnabled ? 'Protected (Active)' : 'Bypassed'}
                </button>
              </div>

              {antiClippingEnabled && (
                <div className="space-y-[6px] pt-[4px] border-t border-neutral-800/80">
                  <div>
                    <div className="flex justify-between text-[10px] text-neutral-400 mb-[2px]">
                      <span>Ground Elevation Clearance</span>
                      <span className="text-emerald-400 font-mono font-semibold">{minGroundClearance.toFixed(1)} m</span>
                    </div>
                    <input
                      type="range"
                      min="1.5"
                      max="6.0"
                      step="0.1"
                      value={minGroundClearance}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setMinGroundClearance(val);
                        if (engine) {
                          engine.cinematicDirector.collisionSystem.settings.minGroundClearance = val;
                        }
                      }}
                      className="w-full accent-emerald-400 h-[4px]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] text-neutral-400 mb-[2px]">
                      <span>Cliff Wall Repulsion Force</span>
                      <span className="text-emerald-400 font-mono font-semibold">{cliffRepulsion.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3.0"
                      step="0.1"
                      value={cliffRepulsion}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setCliffRepulsion(val);
                        if (engine) {
                          engine.cinematicDirector.collisionSystem.settings.cliffRepulsion = val;
                        }
                      }}
                      className="w-full accent-emerald-400 h-[4px]"
                    />
                  </div>

                  <p className="text-[9px] text-neutral-400 leading-tight">
                    Multi-probe radial sampling prevents camera from penetrating rock faces, mountains, and water surface.
                  </p>
                </div>
              )}
            </div>

            {/* If in Cutscene Mode: Trajectory Presets */}
            {cameraMode === 'cutscene' && (
              <div className="mb-[10px]">
                <div className="flex items-center justify-between mb-[4px]">
                  <span className="text-[11px] text-neutral-400 font-semibold">
                    Fly-Through Trajectories
                  </span>
                  <div className="flex items-center gap-[4px]">
                    <button
                      onClick={() => {
                        if (engine) {
                          engine.cinematicDirector.isPaused = !engine.cinematicDirector.isPaused;
                        }
                      }}
                      className="px-[6px] py-[2px] bg-neutral-900 hover:bg-neutral-800 text-[10px] rounded-[4px] text-neutral-300"
                    >
                      Pause/Play
                    </button>
                  </div>
                </div>

                <div className="space-y-[4px]">
                  {EXTENDED_CUTSCENE_PRESETS.map((cs) => (
                    <button
                      key={cs.id}
                      onClick={() => handlePlayCutscene(cs.id)}
                      className={`w-full text-left p-[8px] rounded-[8px] border transition-all ${
                        currentCutscene === cs.id
                          ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-200'
                          : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-bold">{cs.name}</span>
                        <span className="text-[10px] text-neutral-400">{cs.durationSec}s</span>
                      </div>
                      <p className="text-[10px] text-neutral-400 truncate mt-[2px]">
                        {cs.tagline}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Trajectory Speed Control */}
                <div className="mt-[8px] p-[8px] bg-neutral-900/80 rounded-[8px] border border-neutral-800">
                  <div className="flex items-center justify-between text-[11px] mb-[4px]">
                    <span className="text-neutral-400">Fly-Through Speed</span>
                    <span className="font-bold text-emerald-400">{playbackSpeed}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.5"
                    step="0.25"
                    value={playbackSpeed}
                    onChange={(e) => {
                      const spd = parseFloat(e.target.value);
                      setPlaybackSpeed(spd);
                      if (engine) engine.cinematicDirector.playbackSpeed = spd;
                    }}
                    className="w-full accent-emerald-400"
                  />
                </div>
              </div>
            )}

            {/* If in Static Vantage Mode: Scenic Tripods Selector */}
            {cameraMode === 'static' && (
              <div className="mb-[10px]">
                <span className="text-[11px] text-neutral-400 mb-[4px] block font-semibold">
                  Select Panoramic Vantage Point
                </span>
                <div className="space-y-[4px]">
                  {STATIC_VANTAGE_POINTS.map((vp) => (
                    <button
                      key={vp.id}
                      onClick={() => handleSelectVantage(vp.id)}
                      className={`w-full text-left p-[8px] rounded-[8px] border transition-all ${
                        currentVantage === vp.id
                          ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-200'
                          : 'bg-neutral-900/80 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-bold">{vp.name}</span>
                        <span className="text-[9px] uppercase font-bold text-neutral-400">
                          {vp.biome}
                        </span>
                      </div>
                      <p className="text-[10px] text-neutral-400 line-clamp-2 mt-[2px]">
                        {vp.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* If in Free Flight Mode: Controls Guide */}
            {cameraMode === 'free' && (
              <div className="p-[8px] bg-neutral-900/80 rounded-[8px] border border-neutral-800 text-[11px] text-neutral-300 space-y-[4px]">
                <div className="font-bold text-emerald-400">6-DOF Drone Flight Controls</div>
                <div>• Move: <span className="text-neutral-100 font-mono">WASD / Arrows</span></div>
                <div>• Altitude: <span className="text-neutral-100 font-mono">E / Space (Up), Q / C (Down)</span></div>
                <div>• Boost Thrusters: <span className="text-neutral-100 font-mono">Shift</span> (110 units/s)</div>
                <div>• Mobile: Drag left side to thrust, right side to steer.</div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: POINTS OF INTEREST (POI) & MAP SURVEYING */}
        {/* ========================================================================= */}
        {activeTab === 'pois' && (
          <div
            id="panel-poi-surveying"
            className="w-[340px] max-w-[calc(100vw-60px)] p-[12px] bg-neutral-950/90 backdrop-blur-xl rounded-[14px] border border-neutral-800 text-neutral-100 shadow-2xl max-h-[78vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-[8px]">
              <div className="flex items-center gap-[6px]">
                <MapPin className="w-[16px] h-[16px] text-cyan-400" />
                <h2 className="text-[14px] font-bold">Points of Interest</h2>
              </div>
              <button
                onClick={() => setActiveTab(null)}
                className="p-[4px] text-neutral-400 hover:text-neutral-100"
              >
                <X className="w-[14px] h-[14px]" />
              </button>
            </div>

            <p className="text-[11px] text-neutral-400 mb-[8px]">
              Tap any 3D holographic beacon in the scene or pick a landmark below to inspect contextual geology and fly the camera there.
            </p>

            <div className="space-y-[6px]">
              {engine?.poiManager.pois.map((poi) => (
                <div
                  key={poi.id}
                  className="p-[8px] bg-neutral-900/85 hover:bg-neutral-850 rounded-[8px] border border-neutral-800 flex flex-col gap-[6px]"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-[6px]">
                        <span className="text-[12px] font-bold text-neutral-100">
                          {poi.name}
                        </span>
                        <span
                          className={`text-[9px] px-[6px] py-[1px] rounded-[4px] font-bold uppercase border ${getBiomeColorClass(
                            poi.biome
                          )}`}
                        >
                          {poi.biome}
                        </span>
                      </div>
                      <span className="text-[10px] text-neutral-400">
                        {poi.altitudeMeters}m altitude • {poi.temperatureC}°C
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-[6px]">
                    <button
                      onClick={() => handleFlyToPOI(poi.id)}
                      className="flex-1 py-[4px] px-[8px] bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-[6px] text-[10px] flex items-center justify-center gap-[4px] transition-colors"
                    >
                      <Video className="w-[12px] h-[12px]" />
                      <span>Fly Camera Here</span>
                    </button>
                    <button
                      onClick={() => setSelectedPOI(poi)}
                      className="py-[4px] px-[8px] bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold rounded-[6px] text-[10px]"
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Waypoint Dropper */}
            <div className="mt-[10px] p-[8px] bg-neutral-900/70 rounded-[8px] border border-neutral-800">
              <span className="text-[11px] text-neutral-300 font-semibold block mb-[4px]">
                Deploy Surveying Marker at Camera
              </span>
              <button
                onClick={() => {
                  if (engine) {
                    const pos = engine.camera.position;
                    const newPoi = engine.poiManager.addCustomPOI(pos.x, pos.z);
                    setSelectedPOI(newPoi);
                  }
                }}
                className="w-full py-[6px] px-[8px] bg-cyan-600 hover:bg-cyan-500 text-neutral-950 font-bold rounded-[6px] text-[11px] flex items-center justify-center gap-[6px]"
              >
                <Crosshair className="w-[13px] h-[13px]" />
                <span>Drop Holographic Marker Here</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PROCEDURAL BIOMES GENERATION */}
        {/* ========================================================================= */}
        {activeTab === 'biomes' && (
          <div
            id="panel-procedural-biomes"
            className="w-[340px] max-w-[calc(100vw-60px)] p-[12px] bg-neutral-950/90 backdrop-blur-xl rounded-[14px] border border-neutral-800 text-neutral-100 shadow-2xl max-h-[78vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-[8px]">
              <div className="flex items-center gap-[6px]">
                <Mountain className="w-[16px] h-[16px] text-emerald-400" />
                <h2 className="text-[14px] font-bold">Procedural Biome Generation</h2>
              </div>
              <button
                onClick={() => setActiveTab(null)}
                className="p-[4px] text-neutral-400 hover:text-neutral-100"
              >
                <X className="w-[14px] h-[14px]" />
              </button>
            </div>

            <p className="text-[11px] text-neutral-400 mb-[8px]">
              Multi-octave noise fractals sculpting alpine ridges, conifer forests, arid barchan dunes, and volcanic basalt calderas in real time.
            </p>

            {/* Dominant Biome Preset Selection */}
            <div className="mb-[10px]">
              <span className="text-[11px] text-neutral-400 font-semibold block mb-[4px]">
                Dominant Biome Distribution
              </span>
              <div className="grid grid-cols-3 gap-[4px] text-[10px]">
                {(['diverse', 'alpine', 'forest', 'desert', 'meadow', 'volcanic'] as const).map((b) => (
                  <button
                    key={b}
                    onClick={() => handleApplyBiomeParams({ primaryBiome: b })}
                    className={`py-[5px] px-[6px] rounded-[6px] font-bold capitalize transition-all ${
                      biomeParams.primaryBiome === b
                        ? 'bg-emerald-500 text-neutral-950'
                        : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders for Procedural Parameters */}
            <div className="space-y-[8px] text-[11px]">
              {/* Mountain Ruggedness */}
              <div>
                <div className="flex items-center justify-between mb-[2px]">
                  <span className="text-neutral-300">Alpine Ruggedness / Crags</span>
                  <span className="font-mono text-cyan-400">{biomeParams.mountainSteepness.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={biomeParams.mountainSteepness}
                  onChange={(e) => handleApplyBiomeParams({ mountainSteepness: parseFloat(e.target.value) })}
                  className="w-full accent-cyan-400"
                />
              </div>

              {/* Terrain Elevation Scale */}
              <div>
                <div className="flex items-center justify-between mb-[2px]">
                  <span className="text-neutral-300">Elevation Height Scale</span>
                  <span className="font-mono text-emerald-400">{biomeParams.heightScale.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="1.8"
                  step="0.05"
                  value={biomeParams.heightScale}
                  onChange={(e) => handleApplyBiomeParams({ heightScale: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-400"
                />
              </div>

              {/* Surface Micro Roughness */}
              <div>
                <div className="flex items-center justify-between mb-[2px]">
                  <span className="text-neutral-300">Micro Texture Roughness</span>
                  <span className="font-mono text-amber-400">{biomeParams.roughness.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="1.8"
                  step="0.05"
                  value={biomeParams.roughness}
                  onChange={(e) => handleApplyBiomeParams({ roughness: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400"
                />
              </div>

              {/* Moisture Bias (Arid vs Lush) */}
              <div>
                <div className="flex items-center justify-between mb-[2px]">
                  <span className="text-neutral-300">Moisture Bias (Arid ↔ Wet)</span>
                  <span className="font-mono text-blue-400">{biomeParams.moistureOffset > 0 ? `+${biomeParams.moistureOffset.toFixed(2)}` : biomeParams.moistureOffset.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="-0.4"
                  max="0.4"
                  step="0.05"
                  value={biomeParams.moistureOffset}
                  onChange={(e) => handleApplyBiomeParams({ moistureOffset: parseFloat(e.target.value) })}
                  className="w-full accent-blue-400"
                />
              </div>
            </div>

            {/* Seed Controller & Regenerate Button */}
            <div className="mt-[12px] p-[8px] bg-neutral-900/80 rounded-[8px] border border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-neutral-400 block">World Generator Seed</span>
                <span className="text-[12px] font-mono font-bold text-neutral-200">
                  {biomeParams.seed}
                </span>
              </div>
              <button
                onClick={handleRandomizeSeed}
                className="py-[6px] px-[10px] bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-[6px] text-[11px] flex items-center gap-[4px] transition-colors"
              >
                <RotateCcw className="w-[12px] h-[12px]" />
                <span>New Seed</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: INTERACTIVE ENVIRONMENTAL ELEMENTS & WILDLIFE */}
        {/* ========================================================================= */}
        {activeTab === 'environment' && (
          <div
            id="panel-environmental-elements"
            className="w-[340px] max-w-[calc(100vw-60px)] p-[12px] bg-neutral-950/90 backdrop-blur-xl rounded-[14px] border border-neutral-800 text-neutral-100 shadow-2xl max-h-[78vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-[8px]">
              <div className="flex items-center gap-[6px]">
                <Bird className="w-[16px] h-[16px] text-emerald-400" />
                <h2 className="text-[14px] font-bold">Interactive Environment</h2>
              </div>
              <button
                onClick={() => setActiveTab(null)}
                className="p-[4px] text-neutral-400 hover:text-neutral-100"
              >
                <X className="w-[14px] h-[14px]" />
              </button>
            </div>

            <p className="text-[11px] text-neutral-400 mb-[8px]">
              Dynamic physical environmental interactions engineered for 100 FPS mobile gaming using batched instancing and vertex shaders.
            </p>

            <div className="space-y-[6px]">
              {/* 1. Reactive Foliage */}
              <div className="flex items-center justify-between p-[8px] bg-neutral-900/80 rounded-[8px] border border-neutral-800 text-[11px]">
                <div>
                  <span className="font-semibold block text-neutral-200">Reactive Grass & Shrubs</span>
                  <span className="text-[10px] text-neutral-400">Parts away radially when player moves through</span>
                </div>
                <button
                  onClick={() => {
                    const next = !envSettings.reactiveFoliage;
                    setEnvSettings({ ...envSettings, reactiveFoliage: next });
                    if (engine) engine.environmentalElements.settings.reactiveFoliage = next;
                  }}
                  className={`px-[8px] py-[3px] rounded-[6px] text-[10px] font-bold ${
                    envSettings.reactiveFoliage ? 'bg-emerald-500 text-neutral-950' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {envSettings.reactiveFoliage ? 'Active' : 'Off'}
                </button>
              </div>

              {/* 2. Soaring Bird Flocks */}
              <div className="flex items-center justify-between p-[8px] bg-neutral-900/80 rounded-[8px] border border-neutral-800 text-[11px]">
                <div>
                  <span className="font-semibold block text-neutral-200">Alpine Hawk Flocks</span>
                  <span className="text-[10px] text-neutral-400">Circling thermals that scatter upon approach</span>
                </div>
                <button
                  onClick={() => {
                    const next = !envSettings.wildlifeFlocks;
                    setEnvSettings({ ...envSettings, wildlifeFlocks: next });
                    if (engine) engine.environmentalElements.settings.wildlifeFlocks = next;
                  }}
                  className={`px-[8px] py-[3px] rounded-[6px] text-[10px] font-bold ${
                    envSettings.wildlifeFlocks ? 'bg-emerald-500 text-neutral-950' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {envSettings.wildlifeFlocks ? 'Active' : 'Off'}
                </button>
              </div>

              {/* 3. Ground Wildlife (Grazing / Scattering) */}
              <div className="flex items-center justify-between p-[8px] bg-neutral-900/80 rounded-[8px] border border-neutral-800 text-[11px]">
                <div>
                  <span className="font-semibold block text-neutral-200">Ground Wildlife (Deer & Hares)</span>
                  <span className="text-[10px] text-neutral-400">Grazing fauna that bolt when approached</span>
                </div>
                <button
                  onClick={() => {
                    const next = !envSettings.groundWildlife;
                    setEnvSettings({ ...envSettings, groundWildlife: next });
                    if (engine) engine.environmentalElements.settings.groundWildlife = next;
                  }}
                  className={`px-[8px] py-[3px] rounded-[6px] text-[10px] font-bold ${
                    envSettings.groundWildlife ? 'bg-emerald-500 text-neutral-950' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {envSettings.groundWildlife ? 'Active' : 'Off'}
                </button>
              </div>

              {/* 4. Subtle Physics Particles */}
              <div className="flex items-center justify-between p-[8px] bg-neutral-900/80 rounded-[8px] border border-neutral-800 text-[11px]">
                <div>
                  <span className="font-semibold block text-neutral-200">Leaves & Cliff Scree Physics</span>
                  <span className="text-[10px] text-neutral-400">Drifting autumn foliage and tumbling pebbles</span>
                </div>
                <button
                  onClick={() => {
                    const next = !envSettings.ambientParticles;
                    setEnvSettings({ ...envSettings, ambientParticles: next });
                    if (engine) engine.environmentalElements.settings.ambientParticles = next;
                  }}
                  className={`px-[8px] py-[3px] rounded-[6px] text-[10px] font-bold ${
                    envSettings.ambientParticles ? 'bg-emerald-500 text-neutral-950' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {envSettings.ambientParticles ? 'Active' : 'Off'}
                </button>
              </div>
            </div>

            {/* Action Trigger: Scatter All Wildlife Now */}
            <div className="mt-[10px]">
              <button
                onClick={handleScatterWildlife}
                className="w-full py-[8px] px-[10px] bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-[8px] text-[11px] flex items-center justify-center gap-[6px] transition-colors shadow-md"
              >
                <Zap className="w-[14px] h-[14px]" />
                <span>Simulate Startle Event (Scatter Wildlife Now)</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: WEATHER & DAY-NIGHT CYCLE */}
        {/* ========================================================================= */}
        {activeTab === 'weather' && (
          <div
            id="panel-weather"
            className="w-[340px] max-w-[calc(100vw-60px)] p-[12px] bg-neutral-950/90 backdrop-blur-xl rounded-[14px] border border-neutral-800 text-neutral-100 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-[8px]">
              <div className="flex items-center gap-[6px]">
                <Sun className="w-[16px] h-[16px] text-amber-400" />
                <h2 className="text-[14px] font-bold">Atmosphere & Weather</h2>
              </div>
              <button
                onClick={() => setActiveTab(null)}
                className="p-[4px] text-neutral-400 hover:text-neutral-100"
              >
                <X className="w-[14px] h-[14px]" />
              </button>
            </div>

            {/* Weather selector pills */}
            <div className="grid grid-cols-3 gap-[4px] mb-[10px] text-[11px]">
              {(['clear', 'sunset', 'storm', 'fog', 'aurora', 'sandstorm'] as WeatherType[]).map((w) => (
                <button
                  key={w}
                  onClick={() => handleWeatherChange(w)}
                  className={`py-[6px] px-[8px] rounded-[6px] font-semibold capitalize transition-all ${
                    currentWeather === w
                      ? 'bg-amber-400 text-neutral-950 font-bold'
                      : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>

            {/* Time of Day Slider */}
            <div className="mb-[10px] p-[8px] bg-neutral-900/80 rounded-[8px] border border-neutral-800">
              <div className="flex items-center justify-between text-[11px] mb-[4px]">
                <span className="text-neutral-400">Sun & Moon Position</span>
                <span className="font-bold text-amber-300">{formatTime(timeOfDay)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                step="0.1"
                value={timeOfDay}
                onChange={(e) => handleTimeChange(parseFloat(e.target.value))}
                className="w-full accent-amber-400"
              />
              <div className="flex items-center justify-between mt-[6px] text-[11px]">
                <span className="text-neutral-400">Auto Day/Night Cycle</span>
                <button
                  onClick={() => {
                    if (engine) {
                      const next = !isDayCycle;
                      setIsDayCycle(next);
                      engine.settings.isCycleActive = next;
                    }
                  }}
                  className={`px-[8px] py-[3px] rounded-[6px] text-[10px] font-bold ${
                    isDayCycle ? 'bg-amber-400 text-neutral-950' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {isDayCycle ? 'Running' : 'Paused'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: POST-PROCESSING & COLOR GRADING */}
        {/* ========================================================================= */}
        {activeTab === 'postprocess' && (
          <div
            id="panel-postprocess"
            className="w-[340px] max-w-[calc(100vw-60px)] p-[12px] bg-neutral-950/90 backdrop-blur-xl rounded-[14px] border border-neutral-800 text-neutral-100 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-[8px]">
              <div className="flex items-center gap-[6px]">
                <Sliders className="w-[16px] h-[16px] text-cyan-400" />
                <h2 className="text-[14px] font-bold">Post-Processing Stack</h2>
              </div>
              <button
                onClick={() => setActiveTab(null)}
                className="p-[4px] text-neutral-400 hover:text-neutral-100"
              >
                <X className="w-[14px] h-[14px]" />
              </button>
            </div>

            {/* Cinematic Color Grading Presets */}
            <div className="mb-[10px]">
              <span className="text-[11px] text-neutral-400 mb-[4px] block font-semibold">
                Color Grading Lookup (LUT)
              </span>
              <div className="grid grid-cols-3 gap-[4px] text-[10px]">
                {(['natural', 'cinematic-warm', 'nordic-cool', 'moody-noir', 'cyber-neon', 'vibrant'] as ColorGradingPreset[]).map(
                  (grade) => (
                    <button
                      key={grade}
                      onClick={() => {
                        setCurrentGrade(grade);
                        if (engine) engine.settings.colorGrading = grade;
                      }}
                      className={`py-[5px] px-[6px] rounded-[6px] font-semibold capitalize transition-all ${
                        currentGrade === grade
                          ? 'bg-cyan-400 text-neutral-950 font-bold'
                          : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      {grade.replace('-', ' ')}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Motion Blur & Bloom sliders */}
            <div className="space-y-[8px] text-[11px]">
              <div>
                <div className="flex items-center justify-between mb-[2px]">
                  <span className="text-neutral-300">Camera Velocity Motion Blur</span>
                  <span className="font-mono text-cyan-400">{Math.round(motionBlur * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.8"
                  step="0.05"
                  value={motionBlur}
                  onChange={(e) => {
                    const mb = parseFloat(e.target.value);
                    setMotionBlur(mb);
                    if (engine) engine.settings.motionBlurIntensity = mb;
                  }}
                  className="w-full accent-cyan-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-[2px]">
                  <span className="text-neutral-300">HDR Bloom Intensity</span>
                  <span className="font-mono text-cyan-400">{Math.round(bloom * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={bloom}
                  onChange={(e) => {
                    const bl = parseFloat(e.target.value);
                    setBloom(bl);
                    if (engine) engine.settings.bloomIntensity = bl;
                  }}
                  className="w-full accent-cyan-400"
                />
              </div>

              {/* Volumetric light rays toggle */}
              <div className="flex items-center justify-between p-[8px] bg-neutral-900/80 rounded-[8px] border border-neutral-800">
                <span className="text-neutral-300">Volumetric Sun Crepuscular Rays</span>
                <button
                  onClick={() => {
                    const next = !volumetricRays;
                    setVolumetricRays(next);
                    if (engine) engine.settings.volumetricRays = next;
                  }}
                  className={`px-[8px] py-[3px] rounded-[6px] text-[10px] font-bold ${
                    volumetricRays ? 'bg-cyan-400 text-neutral-950' : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {volumetricRays ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: ENGINE TELEMETRY & 100 FPS PROFILER */}
        {/* ========================================================================= */}
        {activeTab === 'stats' && (
          <div
            id="panel-telemetry-stats"
            className="w-[340px] max-w-[calc(100vw-60px)] p-[12px] bg-neutral-950/90 backdrop-blur-xl rounded-[14px] border border-neutral-800 text-neutral-100 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-[8px]">
              <div className="flex items-center gap-[6px]">
                <Gauge className="w-[16px] h-[16px] text-cyan-400" />
                <h2 className="text-[14px] font-bold">100 FPS Performance Telemetry</h2>
              </div>
              <button
                onClick={() => setActiveTab(null)}
                className="p-[4px] text-neutral-400 hover:text-neutral-100"
              >
                <X className="w-[14px] h-[14px]" />
              </button>
            </div>

            {/* Quality Preset Toggle */}
            <div className="mb-[8px]">
              <span className="text-[10px] text-neutral-400 block mb-[4px] font-semibold">
                Device Performance Profile
              </span>
              <div className="grid grid-cols-3 gap-[4px] text-[10px]">
                {(['mobile-perf', 'high-100fps', 'ultra-120fps'] as QualityPreset[]).map((q) => (
                  <button
                    key={q}
                    onClick={() => handleQualityChange(q)}
                    className={`py-[4px] px-[6px] rounded-[6px] font-bold transition-all ${
                      quality === q
                        ? 'bg-cyan-400 text-neutral-950'
                        : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                    }`}
                  >
                    {q === 'mobile-perf' ? '60 FPS' : q === 'high-100fps' ? '100 FPS' : '120 FPS'}
                  </button>
                ))}
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-[6px] my-[8px] text-[11px]">
              <div className="p-[8px] bg-neutral-900/80 rounded-[8px] border border-neutral-800">
                <span className="text-neutral-400 text-[10px] block">Current FPS</span>
                <div className="text-[16px] font-black text-cyan-400">
                  {stats?.fps ?? 100} / {stats?.targetFps ?? 100}
                </div>
              </div>
              <div className="p-[8px] bg-neutral-900/80 rounded-[8px] border border-neutral-800">
                <span className="text-neutral-400 text-[10px] block">Frame Latency</span>
                <div className="text-[16px] font-black text-emerald-400">
                  {stats?.frameTimeMs ?? 10.0} ms
                </div>
              </div>
              <div className="p-[8px] bg-neutral-900/80 rounded-[8px] border border-neutral-800">
                <span className="text-neutral-400 text-[10px] block">LOD Chunks (Vis/Culled)</span>
                <div className="text-[13px] font-semibold text-neutral-200">
                  {stats?.renderedChunks ?? 45} / {stats?.culledChunks ?? 36}
                </div>
              </div>
              <div className="p-[8px] bg-neutral-900/80 rounded-[8px] border border-neutral-800">
                <span className="text-neutral-400 text-[10px] block">Active Triangles</span>
                <div className="text-[13px] font-semibold text-neutral-200">
                  {(stats?.triangles ?? 28000).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Occlusion Culling Toggle */}
            <div className="flex items-center justify-between p-[8px] bg-neutral-900/80 rounded-[8px] border border-neutral-800 text-[11px]">
              <span className="text-neutral-300">Occlusion & Frustum Culling</span>
              <button
                onClick={() => {
                  if (engine) {
                    const next = !occlusionCull;
                    setOcclusionCull(next);
                    engine.settings.occlusionCulling = next;
                  }
                }}
                className={`px-[8px] py-[3px] rounded-[6px] text-[10px] font-bold ${
                  occlusionCull ? 'bg-emerald-500 text-neutral-950' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {occlusionCull ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            <div className="mt-[6px] text-[9px] text-neutral-500 truncate">
              GPU: {stats?.gpuRenderer}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 8: GEMINI AI ATMOSPHERE DIRECTOR */}
        {/* ========================================================================= */}
        {activeTab === 'ai' && (
          <div
            id="panel-ai-director"
            className="w-[340px] max-w-[calc(100vw-60px)] p-[12px] bg-neutral-950/90 backdrop-blur-xl rounded-[14px] border border-neutral-800 text-neutral-100 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-[8px]">
              <div className="flex items-center gap-[6px]">
                <Sparkles className="w-[16px] h-[16px] text-purple-400" />
                <h2 className="text-[14px] font-bold">AI World Director</h2>
              </div>
              <button
                onClick={() => setActiveTab(null)}
                className="p-[4px] text-neutral-400 hover:text-neutral-100"
              >
                <X className="w-[14px] h-[14px]" />
              </button>
            </div>

            <p className="text-[11px] text-neutral-400 mb-[8px]">
              Prompt Gemini to dynamically orchestrate weather, lighting, time, and cinematic camera choreography.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleDirectWorld();
              }}
              className="flex gap-[4px] mb-[8px]"
            >
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. dramatic sunset over snowy crests..."
                className="flex-1 bg-neutral-900 border border-neutral-700/80 rounded-[8px] px-[8px] py-[6px] text-[12px] text-neutral-100 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={isAiLoading || !aiPrompt.trim()}
                className="px-[10px] py-[6px] bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-[8px] flex items-center justify-center transition-colors"
              >
                {isAiLoading ? (
                  <Loader2 className="w-[14px] h-[14px] animate-spin" />
                ) : (
                  <Send className="w-[14px] h-[14px]" />
                )}
              </button>
            </form>

            {/* Director's Live Broadcast Status */}
            {directorMessage && (
              <div className="p-[8px] bg-purple-950/40 border border-purple-800/40 rounded-[8px] text-[11px] text-purple-200">
                {directorMessage}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Cutscene Director Banner (min 10px from bottom edge as mandated) */}
      <footer
        id="hud-bottom-bar"
        className="pointer-events-auto mx-[4px] mb-[10px] p-[8px] bg-neutral-950/85 backdrop-blur-md rounded-[12px] border border-neutral-800 text-neutral-100 flex items-center justify-between gap-[8px] shadow-2xl transition-all"
      >
        <div className="flex items-center gap-[8px] min-w-0">
          <div className="p-[6px] bg-emerald-500/20 text-emerald-400 rounded-[8px] shrink-0">
            <Video className="w-[14px] h-[14px]" />
          </div>
          <div className="min-w-0">
            <div className="text-[12px] font-bold text-neutral-100 truncate">
              {currentCutsceneInfo?.name}
            </div>
            <div className="text-[10px] text-neutral-400 truncate">
              {currentCutsceneInfo?.tagline}
            </div>
          </div>
        </div>

        {/* Quick Cutscene Switcher Pills */}
        <div className="flex items-center gap-[4px] shrink-0 overflow-x-auto">
          {EXTENDED_CUTSCENE_PRESETS.slice(0, 4).map((cs) => (
            <button
              key={cs.id}
              onClick={() => handlePlayCutscene(cs.id)}
              className={`px-[8px] py-[4px] rounded-[6px] text-[10px] font-semibold whitespace-nowrap transition-all ${
                currentCutscene === cs.id && cameraMode === 'cutscene'
                  ? 'bg-emerald-500 text-neutral-950'
                  : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              {cs.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
};
