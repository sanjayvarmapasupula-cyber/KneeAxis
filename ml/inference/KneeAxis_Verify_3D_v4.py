"""Independent disk-reloaded STL geometry check, KneeAxis hotfix 3.1.

Checks actual occupied voxel centers in physical MRI (LPS mm) coordinates,
not corners of an axis-aligned index bounding box. Does not make meshes
watertight, hide topology failures, or certify anatomy for surgical use.
"""
from pathlib import Path
import argparse,hashlib,json,sys
import numpy as np
import trimesh

LABELS={1:'femur',2:'femoral_cartilage',3:'tibia',4:'medial_tibial_cartilage',5:'lateral_tibial_cartilage'}


def hash_file(path):
    h=hashlib.sha256()
    with Path(path).open('rb') as stream:
        for chunk in iter(lambda:stream.read(4*1024*1024),b''):
            h.update(chunk)
    return h.hexdigest()


def physical_center_bounds(mask, a, origin):
    low=np.full(3,np.inf);high=np.full(3,-np.inf)
    for z in range(mask.shape[0]):
        yy,xx=np.nonzero(mask[z])
        if not len(xx):continue
        coords=np.column_stack((xx,yy,np.full_like(xx,z))).astype(np.float64)
        pos=coords@a.T+origin
        low=np.minimum(low,np.min(pos,axis=0));high=np.maximum(high,np.max(pos,axis=0))
    return np.stack((low,high))


def verify_arrays(ar, affine, image_spacing, output, *, segmentation_sha256=None):
    out=Path(output)
    manifest=json.loads((out/'mesh_manifest.json').read_text(encoding='utf-8'))
    src_sha=manifest.get('source_segmentation_sha256')
    errors_global=[]
    if segmentation_sha256 and src_sha!=segmentation_sha256:
        errors_global.append('Source MRI segmentation hash does not match the mesh manifest')
    a=np.asarray(affine[:3,:3],dtype=np.float64)
    origin=np.asarray(affine[:3,3],dtype=np.float64)
    support=.5*np.sum(np.abs(a),axis=1)
    items={s['name']:s for s in manifest.get('meshes',[])}
    results=[]
    for k,name in LABELS.items():
        errors=[];warn=[];bbox_off=None;excess=None;vol_ratio=None;watertight=False;faces=0
        source=ar==k
        ent=items.get(name)
        if not source.any():errors.append('Predicted source class is empty')
        if ent is None:errors.append('Mesh missing in manifest')
        else:
            rel=Path(ent.get('stl',''))
            if rel.is_absolute() or '..' in rel.parts or not str(rel).endswith('.stl'):
                errors.append('Unsafe STL manifest path')
            else:
                path=out/rel
                if not path.is_file():errors.append('STL file does not exist')
                else:
                    if ent.get('stl_sha256')!=hash_file(path):errors.append('STL hash mismatch; file modified after generation')
                    mesh=trimesh.load(str(path),force='mesh',process=True)
                    mesh.merge_vertices()
                    faces=len(mesh.faces)
                    watertight=bool(mesh.is_watertight)
                    if not watertight:errors.append('STL is not watertight after vertex welding')
                    if not np.isfinite(mesh.vertices).all():errors.append('STL includes non-finite coordinates')
                    if faces<100:errors.append('STL unusually small: fewer than 100 triangles')
                    if source.any() and faces:
                        centers=physical_center_bounds(source,a,origin)
                        bbox_off=float(np.max(np.abs(mesh.bounds-centers)))
                        excess=float(np.max(np.maximum(0,np.abs(mesh.bounds-centers)-support[None,:])))
                        if excess>2.0:errors.append(f'Mesh physical bounds violation {excess:.3f} mm after half-voxel allowance')
                        if watertight:
                            voxvol=float(source.sum())*float(np.prod(image_spacing))
                            vol_ratio=float(abs(mesh.volume)/voxvol)
                            if not 0.84<=vol_ratio<=1.16:errors.append(f'Mesh volume ratio {vol_ratio:.4f} outside [0.84,1.16]')
                            elif not 0.95<=vol_ratio<=1.05:warn.append(f'Mesh volume differs from predicted voxel volume by {100*abs(vol_ratio-1):.2f}%')
        row={'structure':name,'status':'FAIL' if errors else ('WARN' if warn else 'PASS'),
             'watertight':watertight,'faces':faces,
             'max_bbox_offset_mm':round(bbox_off,4) if bbox_off is not None else None,
             'bbox_excess_beyond_voxel_halfstep_mm':round(excess,4) if excess is not None else None,
             'mesh_to_original_voxel_volume_ratio':round(vol_ratio,5) if vol_ratio is not None else None,
             'issues':errors,'warnings':warn}
        results.append(row)
        print(f'{name:<26} {row["status"]:<4} watertight={watertight} '
              f'bbox_excess={row["bbox_excess_beyond_voxel_halfstep_mm"]}mm '
              f'volume_ratio={row["mesh_to_original_voxel_volume_ratio"]}',flush=True)
    passed=len(results)==5 and not errors_global and all(r['status']!='FAIL' for r in results)
    audit={'kind':'KneeAxis independently reloaded STL geometry QA v3.1',
           'passed':passed,'geometry_qc_only':True,'anatomical_accuracy_certified':False,
           'source_segmentation_sha256':src_sha,'global_errors':errors_global,
           'structures':results,
           'warning':'A geometrically valid mesh may include model false positives and is NOT clinical-quality anatomy.'}
    (out/'independent_mesh_check.json').write_text(json.dumps(audit,indent=2)+'\n',encoding='utf-8')
    print('INDEPENDENT 3D GEOMETRY QA:', 'PASS' if passed else 'FAIL')
    return audit


def run(segmentation,output):
    import SimpleITK as sitk
    img=sitk.ReadImage(segmentation)
    aff=np.eye(4)
    aff[:3,:3]=np.asarray(img.GetDirection(),dtype=float).reshape(3,3)@np.diag(img.GetSpacing())
    aff[:3,3]=img.GetOrigin()
    result=verify_arrays(sitk.GetArrayFromImage(img),aff,np.array(img.GetSpacing()),output,
                         segmentation_sha256=hash_file(segmentation))
    return 0 if result['passed'] else 2

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--segmentation',required=True)
    parser.add_argument('--output',required=True)
    args=parser.parse_args()
    try:sys.exit(run(args.segmentation,args.output))
    except Exception as exc:
        print(f'Independent QA error: {type(exc).__name__}: {exc}',file=sys.stderr)
        sys.exit(2)
