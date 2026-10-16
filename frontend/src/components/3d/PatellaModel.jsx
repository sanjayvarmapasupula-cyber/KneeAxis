import { useRef } from 'react';
import { useViewerStore } from '@/store/useAppStore';

export default function PatellaModel({
  opacity = 1,
  wireframe = false,
  color = '#78D89E',
  selected = false,
  onClick,
}) {
  const groupRef = useRef(null);
  const { showPatella } = useViewerStore();

  if (!showPatella) return null;

  const matColor = selected ? '#A7F3D0' : color;

  return (
    <group ref={groupRef} position={[0, 1.35, 1.15]} rotation={[-0.15, 0, 0]} onClick={onClick}>
      {/* Patella Body (Sesamoid shield) */}
      <mesh scale={[1.1, 1.25, 0.55]}>
        <sphereGeometry args={[0.42, 28, 24]} />
        <meshStandardMaterial
          color={matColor}
          roughness={0.35}
          metalness={0.1}
          wireframe={wireframe}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>

      {/* Inferior Apex (pointing downward toward patellar tendon) */}
      <mesh position={[0, -0.42, -0.05]} rotation={[0.1, 0, 0]}>
        <coneGeometry args={[0.22, 0.35, 16]} />
        <meshStandardMaterial
          color={matColor}
          roughness={0.4}
          wireframe={wireframe}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
    </group>
  );
}
