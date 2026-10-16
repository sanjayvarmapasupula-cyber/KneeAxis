import { useViewerStore } from '@/store/useAppStore';

export default function AnatomicalAxis() {
  const { showMechanicalAxis, showTEA } = useViewerStore();

  return (
    <group>
      {/* Mechanical Axis (Femoral & Tibial) */}
      {showMechanicalAxis && (
        <group>
          {/* Femoral Mechanical Axis Line */}
          <mesh position={[0, 3.2, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 4.5, 16]} />
            <meshBasicMaterial color="#EF4444" />
          </mesh>

          {/* Tibial Mechanical Axis Line */}
          <mesh position={[0, -2.4, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 4.2, 16]} />
            <meshBasicMaterial color="#3B82F6" />
          </mesh>

          {/* Knee Center Joint Point */}
          <mesh position={[0, 0.8, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshBasicMaterial color="#F59E0B" />
          </mesh>

          {/* Proximal Hip Center Point */}
          <mesh position={[0, 5.4, 0]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshBasicMaterial color="#EF4444" />
          </mesh>

          {/* Distal Ankle Center Point */}
          <mesh position={[0, -4.5, 0]}>
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshBasicMaterial color="#3B82F6" />
          </mesh>
        </group>
      )}

      {/* Transepicondylar Axis (TEA) */}
      {showTEA && (
        <group position={[0, 1.9, -0.1]}>
          <mesh rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.025, 0.025, 2.0, 16]} />
            <meshBasicMaterial color="#10B981" />
          </mesh>

          {/* Medial Landmark */}
          <mesh position={[-0.95, 0, 0]}>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshBasicMaterial color="#10B981" />
          </mesh>

          {/* Lateral Landmark */}
          <mesh position={[0.95, 0, 0]}>
            <sphereGeometry args={[0.07, 16, 16]} />
            <meshBasicMaterial color="#10B981" />
          </mesh>
        </group>
      )}
    </group>
  );
}
