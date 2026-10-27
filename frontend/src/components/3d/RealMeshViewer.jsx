import { useEffect, useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as THREE from 'three';
import { researchMeshBlob } from '@/services/livePipelineApi';

const STRUCTURES = {
  femur: { label: 'Femur', color: '#e7bd77' },
  femoral_cartilage: { label: 'Femoral cartilage', color: '#2dd4bf' },
  tibia: { label: 'Tibia', color: '#80bbf5' },
  medial_tibial_cartilage: { label: 'Medial tibial cartilage', color: '#ab9aff' },
  lateral_tibial_cartilage: { label: 'Lateral tibial cartilage', color: '#f9a8d4' },
};
const loader = new STLLoader();

function LoadedMeshes({ geometries, visible }) {
  return <group>
    {geometries.map(({ name, geometry }) => visible[name] === false ? null : (
      <mesh key={name} geometry={geometry}>
        <meshStandardMaterial color={STRUCTURES[name]?.color || '#ffffff'} side={THREE.DoubleSide} roughness={0.68} metalness={0.03} />
      </mesh>
    ))}
  </group>;
}

export default function RealMeshViewer({ meshes = [] }) {
  const [geometries, setGeometries] = useState([]);
  const [visible, setVisible] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const signature = useMemo(() => meshes.map(m => `${m.name}|${m.stl}`).join(','), [meshes]);

  useEffect(() => {
    let canceled = false;
    const made = [];
    setGeometries([]); setError('');
    if (!meshes.length) return () => {};
    setLoading(true);
    (async () => {
      const all = [];
      // Sequential mesh loads reduce peak RAM requirements on a laptop.
      for (const m of meshes) {
        if (!m.stl) continue;
        const data = await researchMeshBlob(m.stl);
        const g = loader.parse(data);
        // Reconstruction surfaces are in LPS millimeters. Map superior Z to Three.js vertical Y.
        g.rotateX(-Math.PI / 2);
        g.computeBoundingBox();
        made.push(g);
        all.push({ name: m.name, geometry: g });
      }
      if (!all.length) throw new Error('No STL files are available.');
      const bounds = new THREE.Box3();
      for (const { geometry } of all) bounds.union(geometry.boundingBox);
      const center = bounds.getCenter(new THREE.Vector3());
      // Apply a common translation and unit scale; never center each structure independently.
      for (const { geometry } of all) {
        geometry.translate(-center.x, -center.y, -center.z);
        geometry.scale(0.02, 0.02, 0.02);
        geometry.computeVertexNormals();
      }
      if (!canceled) setGeometries(all);
    })().catch(e => { if (!canceled) setError(e.message); }).finally(() => {
      if (!canceled) setLoading(false);
    });
    return () => {
      canceled = true;
      // Geometry disposal for previous fetches; only after scene unmount on next render.
      setTimeout(() => made.forEach(g => g.dispose()), 0);
    };
  }, [signature]);

  return <div className="space-y-3">
    <div className="rounded-xl border border-slate-700 bg-slate-950 relative h-[510px] overflow-hidden">
      {loading && <p className="absolute z-10 top-3 left-3 text-sm text-white bg-black/70 p-2 rounded">Loading actual MRI-derived STL meshes...</p>}
      {error && <p className="absolute z-10 top-3 left-3 text-sm text-red-200 bg-red-950/80 p-2 rounded">{error}</p>}
      <Canvas camera={{ position: [3.8, 3.0, 4.9], fov: 45, near: 0.01, far: 200 }}>
        <ambientLight intensity={1.3} />
        <directionalLight position={[4, 8, 6]} intensity={2.4} />
        <directionalLight position={[-5, -2, -4]} intensity={0.9} />
        <gridHelper args={[12, 24, '#334155', '#1e293b']} position={[0, -2, 0]} />
        <LoadedMeshes geometries={geometries} visible={visible} />
        <OrbitControls enableDamping minDistance={0.3} maxDistance={40} makeDefault />
      </Canvas>
    </div>
    <div className="flex gap-3 flex-wrap">
      {meshes.map(m => <label key={m.name} className="text-xs flex gap-1.5 items-center cursor-pointer">
        <input type="checkbox" checked={visible[m.name] !== false} onChange={e => setVisible(p => ({ ...p, [m.name]: e.target.checked }))} />
        <span style={{ color: STRUCTURES[m.name]?.color || '#64748b' }}>●</span>
        {STRUCTURES[m.name]?.label || m.name}
      </label>)}
    </div>
    <p className="text-xs text-slate-500">Rotation/zoom is exploratory only. Each mesh retains its original relative location in MRI physical coordinates (mm) before common display centering/scaling.</p>
  </div>;
}
