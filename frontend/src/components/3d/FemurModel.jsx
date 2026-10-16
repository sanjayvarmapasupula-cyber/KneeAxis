import { useRef } from 'react';
import { useViewerStore } from '@/store/useAppStore';

export default function FemurModel({
  opacity = 1,
  wireframe = false,
  color = '#E8B960',
  selected = false,
  onClick,
}) {
  const groupRef = useRef(null);
  const { showFemur } = useViewerStore();

  if (!showFemur) return null;

  const matColor = selected ? '#FBBF24' : color;

  return (
    <group ref={groupRef} position={[0, 1.8, 0]} onClick={onClick}>
      {/* Femoral Shaft (Diaphysis) */}
      <mesh position={[0, 2.2, -0.05]} rotation={[0.02, 0, -0.04]}>
        <cylinderGeometry args={[0.42, 0.55, 3.8, 32, 4]} />
        <meshStandardMaterial
          color={matColor}
          roughness={0.4}
          metalness={0.1}
          wireframe={wireframe}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>

      {/* Femoral Metaphysis (Flaring downward) */}
      <mesh position={[0, 0.65, 0]}>
        <cylinderGeometry args={[0.55, 0.95, 1.2, 32]} />
        <meshStandardMaterial
          color={matColor}
          roughness={0.4}
          metalness={0.1}
          wireframe={wireframe}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>

      {/* Medial Condyle */}
      <mesh position={[-0.52, 0, -0.22]} rotation={[0.2, -0.1, 0.15]}>
        <sphereGeometry args={[0.58, 32, 24]} />
        <meshStandardMaterial
          color={matColor}
          roughness={0.35}
          metalness={0.1}
          wireframe={wireframe}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>

      {/* Lateral Condyle */}
      <mesh position={[0.52, 0, -0.18]} rotation={[0.2, 0.1, -0.15]}>
        <sphereGeometry args={[0.54, 32, 24]} />
        <meshStandardMaterial
          color={matColor}
          roughness={0.35}
          metalness={0.1}
          wireframe={wireframe}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>

      {/* Anterior Trochlear Groove (Patellar Articulation surface) */}
      <mesh position={[0, 0.25, 0.38]} rotation={[-0.25, 0, 0]}>
        <boxGeometry args={[0.82, 0.7, 0.35]} />
        <meshStandardMaterial
          color={matColor}
          roughness={0.3}
          metalness={0.1}
          wireframe={wireframe}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>

      {/* Medial Epicondyle landmark */}
      <mesh position={[-0.88, 0.1, -0.1]}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshStandardMaterial
          color={selected ? '#EF4444' : '#CA8A04'}
          roughness={0.5}
          wireframe={wireframe}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>

      {/* Lateral Epicondyle landmark */}
      <mesh position={[0.88, 0.1, -0.05]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color={selected ? '#EF4444' : '#CA8A04'}
          roughness={0.5}
          wireframe={wireframe}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
    </group>
  );
}
