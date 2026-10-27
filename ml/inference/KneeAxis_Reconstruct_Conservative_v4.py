"""KneeAxis geometry hotfix 3.1: MRI mask -> physical LPS mm STL/OBJ.

Research-only. NEVER deletes or reassigns prediction voxels. Ambiguous
marching-cubes topology may be resolved with a near-identity scalar-field
perturbation (sigma=0.25 voxels); the original discrete labels are preserved.
The independent verifier remains mandatory and can still reject faulty meshes.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
import trimesh
from scipy.ndimage import gaussian_filter, generate_binary_structure, label as connected_labels
from skimage.measure import marching_cubes

LABELS = {1:'femur',2:'femoral_cartilage',3:'tibia',4:'medial_tibial_cartilage',5:'lateral_tibial_cartilage'}
NOTICE='Research-only MRI geometry: not suitable for clinical or surgical decisions.'


def sha256_file(file):
    h=hashlib.sha256()
    with open(file,'rb') as stream:
        for b in iter(lambda:stream.read(4*1024*1024),b''):
            h.update(b)
    return h.hexdigest()


def affine_from_image(image):
    a=np.eye(4,dtype=np.float64)
    a[:3,:3]=np.asarray(image.GetDirection(),dtype=float).reshape(3,3) @ np.diag(image.GetSpacing())
    a[:3,3]=np.asarray(image.GetOrigin(),dtype=float)
    return a


def occupied_center_bounds(mask_zyx, affine):
    """True LPS bounds of *occupied* voxel centers (NOT index bbox corners).

    For oblique orientations an index-space bounding box contains empty
    corners; transforming those eight corners can overestimate actual bounds
    by tens of mm on sparse anatomical segmentations.
    """
    m=np.asarray(affine[:3,:3],dtype=np.float64)
    orig=np.asarray(affine[:3,3],dtype=np.float64)
    low=np.full(3,np.inf)
    high=np.full(3,-np.inf)
    for z in range(mask_zyx.shape[0]):
        ys,xs=np.nonzero(mask_zyx[z])
        if len(xs)==0: continue
        xyz=np.stack((xs,ys,np.full_like(xs,z)),axis=1).astype(np.float64)
        physical=xyz @ m.T+orig
        low=np.minimum(low,physical.min(axis=0))
        high=np.maximum(high,physical.max(axis=0))
    if not np.isfinite(low).all(): raise ValueError('Cannot calculate bounds on an empty mask')
    return np.array((low,high))


def bounds_comparison(mesh_bounds, mask, affine):
    expected=occupied_center_bounds(mask,affine)
    # Marching cubes surfaces occur up to one half voxel step away from
    # occupied centers in LPS coordinates. Sum handles oblique directions.
    half_support=0.5*np.sum(np.abs(affine[:3,:3]),axis=1)
    offsets=np.abs(np.asarray(mesh_bounds)-expected)
    excess=np.maximum(0,offsets-half_support[None,:])
    return float(np.max(offsets)),float(np.max(excess)),expected,half_support


def make_mesh(mask_zyx,affine):
    if mask_zyx.ndim!=3 or not mask_zyx.any():raise ValueError('Empty or invalid 3D binary mask')
    padded=np.pad(mask_zyx.astype(np.uint8),1,constant_values=0)
    # First produce exactly the unmodified binary-mask marching-cubes mesh.
    # A near-identity 3D Gaussian field can resolve degenerate ties at
    # diagonally connected voxel corners without reclassifying voxel centers.
    method_used='binary_0.5';sigma_used=0.0
    last=None
    for sigma in (0.0, 0.25, 0.30):
        field=padded.astype(np.float32)
        if sigma:
            field=gaussian_filter(field,sigma=sigma,mode='constant',cval=0)
            if not np.array_equal(field>=0.5,padded.astype(bool)):
                raise RuntimeError('Subvoxel topology perturbation changed binary center labels; rejecting')
        zyx,faces,_,_=marching_cubes(field,level=.5,allow_degenerate=False,method='lewiner')
        xyz=zyx[:,[2,1,0]].astype(np.float64)-1.0
        physical=xyz @ affine[:3,:3].T + affine[:3,3]
        faces=np.asarray(faces,dtype=np.int64)
        if np.linalg.det(affine[:3,:3])<0:faces=faces[:,[0,2,1]]
        mesh=trimesh.Trimesh(vertices=physical,faces=faces,process=True)
        mesh.remove_unreferenced_vertices()
        mesh.fix_normals()
        last=mesh
        method_used='binary_0.5' if sigma==0 else 'subvoxel_tie_resolution'
        sigma_used=sigma
        if mesh.is_watertight:break
    return last,method_used,sigma_used


def reconstruct_arrays(arr,affine,spacing,out,case_id,*,source_sha256=None):
    out=Path(out);out.mkdir(parents=True,exist_ok=True)
    meshdir=out/'meshes';meshdir.mkdir(exist_ok=True)
    spacing=np.asarray(spacing,dtype=float)
    affine=np.asarray(affine,dtype=float)
    if arr.ndim!=3 or affine.shape!=(4,4) or not np.isfinite(affine).all() or np.any(spacing<=0):
        raise ValueError('Expected a 3D segmentation with finite valid LPS geometry')
    ids=set(int(x) for x in np.unique(arr))
    if not ids.issubset({0,*LABELS}):raise ValueError(f'Unexpected labels {ids}')
    summaries=[];manifests=[]
    for lbl,name in LABELS.items():
        mask=arr==lbl
        voxels=int(mask.sum())
        if not voxels:
            summaries.append({'structure':name,'status':'FAIL','issues':['Predicted class is absent'], 'original_voxels':0})
            continue
        labels,ncomponents=connected_labels(mask,generate_binary_structure(3,1))
        counts=np.bincount(labels[mask],minlength=ncomponents+1)[1:]
        fraction_outside=round(100.0*(voxels-int(counts.max()))/voxels,2)
        del labels
        touches=[side for side,face in [('z_min',mask[0]),('z_max',mask[-1]),('y_min',mask[:,0,:]),('y_max',mask[:,-1,:]),('x_min',mask[:,:,0]),('x_max',mask[:,:,-1])] if face.any()]
        mesh,method,sigma=make_mesh(mask,affine)
        raw_stl=meshdir/f'{name}_raw.stl';raw_obj=meshdir/f'{name}_raw.obj'
        mesh.export(raw_stl);mesh.export(raw_obj)
        raw_offset,violation,center_bounds,half_support=bounds_comparison(mesh.bounds,mask,affine)
        watertight=bool(mesh.is_watertight)
        volume=float(abs(mesh.volume)) if watertight else None
        voxel_volume=float(voxels*np.prod(spacing))
        rel=abs(volume/voxel_volume-1.0) if volume is not None else None
        problems=[];warnings=[]
        if not watertight:problems.append('Open/nonmanifold STL surface after topology resolution')
        if violation>2.0:problems.append(f'Physical occupied-voxel bounding mismatch after half-voxel allowance: {violation:.3f} mm')
        if rel is not None and rel>0.16:problems.append(f'Voxel-to-mesh volume mismatch: {100*rel:.2f}% exceeds 16%')
        if rel is not None and rel>0.05:warnings.append(f'Mesh/voxel volume differs {100*rel:.2f}%; do not use for clinical measurement')
        if fraction_outside>5:warnings.append(f'{fraction_outside:.2f}% of input class lies outside its largest 6-connected component; inspect segmentation artifacts')
        if touches:warnings.append('Source segmentation touches MRI image edge: '+', '.join(touches))
        if sigma:warnings.append(f'Marching-cubes field used sigma={sigma} voxel near-identity tie-breaking; discrete label voxels unchanged')
        record={'structure':name,'status':'FAIL' if problems else ('WARN' if warnings else 'PASS'),
                'issues':problems,'warnings':warnings,'faces':int(len(mesh.faces)),
                'watertight':watertight,'is_winding_consistent':bool(mesh.is_winding_consistent),
                'max_bbox_offset_mm':round(raw_offset,4),'bbox_excess_beyond_voxel_halfstep_mm':round(violation,4),
                'original_voxels':voxels,'input_labels_modified':False,'preserved_voxels':voxels,'preserved_percent':100.,
                'six_connected_components':int(ncomponents),'outside_largest_component_percent':fraction_outside,
                'voxel_volume_mm3':round(voxel_volume,4),'mesh_volume_mm3':round(volume,4) if volume is not None else None,
                'volume_difference_percent':round(100*rel,3) if rel is not None else None,
                'meshing_method':method,'meshing_scalar_sigma_vox':sigma,
                'mask_center_bounds_mm':center_bounds.tolist(),
                'voxel_halfstep_support_mm':half_support.tolist(),'mesh_bounds_mm':mesh.bounds.tolist()}
        summaries.append(record)
        manifests.append({'name':name,'label':lbl,'stl':f'meshes/{name}_raw.stl',
                          'stl_raw':f'meshes/{name}_raw.stl','obj':f'meshes/{name}_raw.obj',
                          'obj_raw':f'meshes/{name}_raw.obj',
                          'volume_mm3':record['mesh_volume_mm3'],
                          'surface_area_mm2':round(float(mesh.area),4),'watertight':watertight,
                          'stl_sha256':sha256_file(raw_stl)})
        print(f'{name:<26} {record["status"]:<4} watertight={watertight} '+
              f'bbox_excess={violation:.3f}mm vol_err={record["volume_difference_percent"]}%% '+
              f'components={ncomponents} sigma={sigma}',flush=True)
    passed=len(manifests)==5 and all(x['status']!='FAIL' for x in summaries)
    manifest={'case_id':case_id,'total_structures':len(manifests),'meshes':manifests,
              'source_segmentation_sha256':source_sha256,'geometry_convention':'SimpleITK LPS millimeters',
              'smoothing_iterations':0,'mask_components_removed':0,
              'meshing_note':'Raw label mask unchanged; subvoxel scalar-field tie resolution on topology failure',
              'notice':NOTICE}
    report={'kind':'KneeAxis v3.1 source geometry QA','case_id':case_id,'passed':passed,
            'source_segmentation_sha256':source_sha256,'structures':summaries,
            'clinical_validation':False,'anatomical_accuracy_certified':False,'notice':NOTICE}
    for where,content in [(out/'mesh_qa.json',report),(out/'mesh_manifest.json',manifest)]:
        where.write_text(json.dumps(content,indent=2)+'\n',encoding='utf-8')
    (out/'qa').mkdir(exist_ok=True)
    (out/'qa'/'mesh_qa.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    return report


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--segmentation',required=True)
    parser.add_argument('--output',required=True)
    parser.add_argument('--case-id',required=True)
    args=parser.parse_args()
    import SimpleITK as sitk
    image=sitk.ReadImage(args.segmentation)
    if image.GetDimension()!=3:raise ValueError('MRI segmentation must be 3D')
    report=reconstruct_arrays(sitk.GetArrayFromImage(image),affine_from_image(image),
                              image.GetSpacing(),args.output,args.case_id,
                              source_sha256=sha256_file(args.segmentation))
    print('SOURCE-GEOMETRY QA:', 'PASS/WARN' if report['passed'] else 'FAIL')
    return 0 if report['passed'] else 2

if __name__=='__main__':
    try:sys.exit(main())
    except Exception as exc:
        print(f'Reconstruction failed: {type(exc).__name__}: {exc}',file=sys.stderr)
        sys.exit(2)
