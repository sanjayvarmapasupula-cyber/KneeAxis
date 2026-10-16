import { useRef } from 'react';
import { useViewerStore } from '@/store/useAppStore';

export default function TibiaModel({
  opacity = 1,
  wireframe = false,
  color = '#60A8E8',
  selected = false,
  onClick,
}) {
  const groupRef = useRef(null);
  const { showTibia } = useViewerStore();

  if (!showTibia) return null;

  const matColor = selected ? '#38BDF8' : color;

  return (
    <group ref={groupRef} position={[0, -0.6, 0]} onClick={onClick}>
      {/* Tibial Plateau (Medial & Lateral Articular Surfaces) */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[1.05, 0.85, 0.35, 32]} />
        <meshStandardMaterial
          color={matColor}
          roughness={0.35}
          metalness={0.1}
          wireframe={wireframe}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>

      {/* Intercondylar Eminence (Tibial Spines in center) */}
      <mesh position={[0, 0.35, -0.05]}>
        <coneGeometry args={[0.22, 0.38, 16]} />
        <meshStandardMaterial
          color={matColor}
          roughness={0.4}
          wireframe={wireframe}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>

      {/* Tibial Metaphysis (Flaring down into shaft) */}
      <mesh position={[0, -0.55, 0]}>
        <cylinderGeometry args={[0.85, 0.5, 1.0, 32]} />
        <meshStandardMaterial
          color={matColor}
          roughness={0.4}
          wireframe={wireframe}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>

      {/* Tibial Tuberosity (Anterior insertion of patellar tendon) */}
      <mesh position={[0, -0.4, 0.5]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.4, 0.55, 0.3]} />
        <meshStandardMaterial
          color={matColor}
          roughness={0.45}
          wireframe={wireframe}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>

      {/* Tibial Shaft (Diaphysis extending down) */}
      <mesh position={[0, -2.4, 0]} rotation={[0, 0, 0.02]}>
        <cylinderGeometry args={[0.5, 0.42, 2.8, 32]} />
        <meshStandardMaterial
          color={matColor}
          roughness={0.4}
          metalness={0.1}
          wireframe={wireframe}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>

      {/* Fibular Head (Lateral articulation) */}
      <group position={[1.05, -0.25, -0.2]}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.3, 24, 20]} />
          <meshStandardMaterial
            color="#D87878"
            roughness={0.4}
            metalness={0.1}
            wireframe={wireframe}
            transparent={opacity < 1}
            opacity={opacity}
          />
        </mesh>
        {/* Fibular Shaft */}
        <mesh position={[0.05, -1.8, 0]}>
          <cylinderGeometry args={[0.18, 0.16, 3.2, 16]} />
          <meshStandardMaterial
            color="#D87878"
            roughness={0.4}
            metalness={0.1}
            wireframe={wireframe}
            transparent={opacity < 1}
            opacity={opacity}
          />
        </mesh>
      </group>
    </group>
  );
}
