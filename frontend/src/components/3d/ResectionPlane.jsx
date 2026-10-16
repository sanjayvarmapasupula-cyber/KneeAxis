import * as THREE from 'three';

export default function ResectionPlane({
  show = false,
  distalFemoralCutMm = 9,
  tibialCutMm = 10,
  femoralValgusDeg = 5,
  tibialSlopeDeg = 3,
}) {
  if (!show) return null;

  // Scale: 1 unit ~ 20mm in our 3D bone coordinate space
  const femoralOffset = 1.35 + (distalFemoralCutMm - 9) * 0.05;
  const tibialOffset = -0.45 - (tibialCutMm - 10) * 0.05;

  const femoralAngleRad = (femoralValgusDeg * Math.PI) / 180;
  const tibialSlopeRad = (tibialSlopeDeg * Math.PI) / 180;

  const planeGeo = new THREE.PlaneGeometry(2.4, 2.0);

  return (
    <group>
      {/* Distal Femoral Resection Plane */}
      <group position={[0, femoralOffset, -0.1]} rotation={[-Math.PI / 2, femoralAngleRad, 0]}>
        <mesh geometry={planeGeo}>
          <meshStandardMaterial
            color="#F59E0B"
            transparent
            opacity={0.45}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <lineSegments>
          <edgesGeometry args={[planeGeo]} />
          <lineBasicMaterial color="#D97706" />
        </lineSegments>
      </group>

      {/* Proximal Tibial Resection Plane */}
      <group position={[0, tibialOffset, 0]} rotation={[-Math.PI / 2 + tibialSlopeRad, 0, 0]}>
        <mesh geometry={planeGeo}>
          <meshStandardMaterial
            color="#3B82F6"
            transparent
            opacity={0.45}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <lineSegments>
          <edgesGeometry args={[planeGeo]} />
          <lineBasicMaterial color="#1D4ED8" />
        </lineSegments>
      </group>
    </group>
  );
}
