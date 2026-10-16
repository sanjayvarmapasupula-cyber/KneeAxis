import { useViewerStore } from '@/store/useAppStore';

export default function JointLine() {
  const { showJointLine } = useViewerStore();

  if (!showJointLine) return null;

  return (
    <group position={[0, 0.75, 0]}>
      {/* Transverse Joint Line Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.6, 2.2]} />
        <meshStandardMaterial
          color="#06B6D4"
          transparent
          opacity={0.35}
          side={2} // DoubleSide
          depthWrite={false}
        />
      </mesh>

      {/* Joint Line Axis Indicator */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.02, 0.02, 2.8, 16]} />
        <meshBasicMaterial color="#0891B2" />
      </mesh>
    </group>
  );
}
