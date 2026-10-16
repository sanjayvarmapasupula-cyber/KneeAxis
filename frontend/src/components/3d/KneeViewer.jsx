import { useRef, useEffect, Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import FemurModel from './FemurModel';
import TibiaModel from './TibiaModel';
import PatellaModel from './PatellaModel';
import AnatomicalAxis from './AnatomicalAxis';
import JointLine from './JointLine';
import ResectionPlane from './ResectionPlane';
import { useViewerStore } from '@/store/useAppStore';
import {
  RotateCcw,
  Maximize2,
  Camera,
  Box,
} from 'lucide-react';

// Camera controller component inside Canvas
function CameraController() {
  const { camera } = useThree();
  const { cameraPreset, setCameraPreset } = useViewerStore();

  useEffect(() => {
    if (!cameraPreset) return;

    const distance = 8.5;
    const target = new THREE.Vector3(0, 0.6, 0);

    switch (cameraPreset) {
      case 'anterior':
        camera.position.set(0, 0.6, distance);
        break;
      case 'posterior':
        camera.position.set(0, 0.6, -distance);
        break;
      case 'medial':
        camera.position.set(-distance, 0.6, 0);
        break;
      case 'lateral':
        camera.position.set(distance, 0.6, 0);
        break;
      case 'superior':
        camera.position.set(0, distance + 1, 0.1);
        break;
      case 'inferior':
        camera.position.set(0, -distance - 1, 0.1);
        break;
      case 'isometric':
      default:
        camera.position.set(5.5, 4.5, 6.0);
        break;
    }

    camera.lookAt(target);
    // Reset preset trigger once applied
    setCameraPreset(null);
  }, [cameraPreset, camera, setCameraPreset]);

  return null;
}

export default function KneeViewer({
  showResection = false,
  distalFemoralCutMm = 9,
  tibialCutMm = 10,
  femoralValgusDeg = 5,
  tibialSlopeDeg = 3,
  onSelectBone,
}) {
  const {
    opacity,
    wireframe,
    selectedBone,
    setSelectedBone,
    setCameraPreset,
    resetViewer,
  } = useViewerStore();

  const containerRef = useRef(null);

  const handleBoneClick = (bone) => {
    const next = selectedBone === bone ? null : bone;
    setSelectedBone(next);
    if (onSelectBone) onSelectBone(next);
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  const handleScreenshot = () => {
    const canvas = containerRef.current?.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `knee-3d-reconstruction-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[540px] rounded-xl overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-slate-800 shadow-xl select-none"
    >
      {/* 3D WebGL Canvas */}
      <Canvas
        camera={{ position: [5.5, 4.5, 6.0], fov: 45 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
      >
        <CameraController />
        <ambientLight intensity={0.8} />
        <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow />
        <directionalLight position={[-10, -10, -10]} intensity={0.5} />
        <directionalLight position={[0, 0, 10]} intensity={0.6} />

        <Suspense fallback={null}>
          <group position={[0, 0, 0]}>
            {/* Distal Femur */}
            <FemurModel
              opacity={opacity}
              wireframe={wireframe}
              selected={selectedBone === 'Femur'}
              onClick={() => handleBoneClick('Femur')}
            />

            {/* Proximal Tibia & Fibula */}
            <TibiaModel
              opacity={opacity}
              wireframe={wireframe}
              selected={selectedBone === 'Tibia'}
              onClick={() => handleBoneClick('Tibia')}
            />

            {/* Patella */}
            <PatellaModel
              opacity={opacity}
              wireframe={wireframe}
              selected={selectedBone === 'Patella'}
              onClick={() => handleBoneClick('Patella')}
            />

            {/* Anatomical & Mechanical Axes */}
            <AnatomicalAxis />

            {/* Joint Line Indicator */}
            <JointLine />

            {/* Resection Planes (if enabled) */}
            <ResectionPlane
              show={showResection}
              distalFemoralCutMm={distalFemoralCutMm}
              tibialCutMm={tibialCutMm}
              femoralValgusDeg={femoralValgusDeg}
              tibialSlopeDeg={tibialSlopeDeg}
            />
          </group>

          {/* Subdued clinical coordinate floor grid */}
          <gridHelper args={[14, 28, '#1e293b', '#0f172a']} position={[0, -4.5, 0]} />
        </Suspense>

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={3}
          maxDistance={20}
          target={[0, 0.6, 0]}
        />
      </Canvas>

      {/* Floating View Presets (Top Left) */}
      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 rounded-lg bg-slate-900/80 p-1.5 backdrop-blur-md border border-slate-700/60 shadow-lg">
        <span className="px-2 py-1 text-[11px] font-semibold text-slate-400 self-center">View:</span>
        {['anterior', 'posterior', 'medial', 'lateral', 'isometric'].map((preset) => (
          <button
            key={preset}
            onClick={() => setCameraPreset(preset)}
            className="rounded px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-blue-600 hover:text-white transition-colors capitalize cursor-pointer"
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Action Tools (Top Right) */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg bg-slate-900/80 p-1.5 backdrop-blur-md border border-slate-700/60 shadow-lg">
        <button
          onClick={handleScreenshot}
          className="rounded p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          title="Capture Snapshot"
        >
          <Camera className="h-4 w-4" />
        </button>
        <button
          onClick={resetViewer}
          className="rounded p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          title="Reset Camera"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
        <button
          onClick={handleFullscreen}
          className="rounded p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
          title="Toggle Fullscreen"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* Active Selection Badge (Bottom Left) */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-slate-900/85 px-3 py-1.5 backdrop-blur-md border border-slate-700/60 text-xs text-slate-300">
        <Box className="h-3.5 w-3.5 text-blue-400" />
        <span>Selected:</span>
        <span className="font-semibold text-blue-400">
          {selectedBone ? selectedBone : 'None (Click a bone to inspect)'}
        </span>
      </div>

      {/* Orbit Helper Tip (Bottom Right) */}
      <div className="absolute bottom-3 right-3 text-[11px] text-slate-500 font-mono hidden sm:block">
        Left Click + Drag: Rotate | Right Click: Pan | Scroll: Zoom
      </div>
    </div>
  );
}
