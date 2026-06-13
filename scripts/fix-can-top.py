"""
Headless Blender: realistic aluminum can top — v3 (visible pull tab).
- Slight concave annulus from rim down to flat platform
- Flat platform at center (where tab sits) — visible
- Real oval pull-tab lever with finger hole
- Teardrop pour opening etched into platform
"""
import bpy
import bmesh
import math
import os
from mathutils import Vector

GLB_IN  = r"C:\Claude Code\happiefusion-shopify\assets\happie-can-3d-original.glb.bak"
GLB_OUT = r"C:\Claude Code\happiefusion-shopify\assets\happie-can-3d.glb"

# ── Clean scene ────────────────────────────────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)
print(f"Importing: {GLB_IN}")
bpy.ops.import_scene.gltf(filepath=GLB_IN)

# Remove any existing PullTab from the original model
for obj in list(bpy.context.scene.objects):
    if obj.type == 'MESH' and 'tab' in obj.name.lower():
        bpy.data.objects.remove(obj, do_unlink=True)

def bbox_vol(o):
    bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
    xs=[v.x for v in bb]; ys=[v.y for v in bb]; zs=[v.z for v in bb]
    return (max(xs)-min(xs))*(max(ys)-min(ys))*(max(zs)-min(zs))

can = max((o for o in bpy.context.scene.objects if o.type=='MESH'), key=bbox_vol)
print(f"Main can: {can.name}")

# Top metrics
vw = [can.matrix_world @ v.co for v in can.data.vertices]
max_z = max(v.z for v in vw)
tv = [v for v in vw if v.z > max_z - 0.005]
if tv:
    cx = sum(v.x for v in tv)/len(tv); cy = sum(v.y for v in tv)/len(tv)
    r  = max(math.hypot(v.x-cx, v.y-cy) for v in tv)
else:
    bb=[can.matrix_world @ Vector(c) for c in can.bound_box]
    cx=sum(v.x for v in bb)/len(bb); cy=sum(v.y for v in bb)/len(bb)
    r=max(abs(v.x-cx) for v in bb)
print(f"top=({cx:.4f},{cy:.4f},{max_z:.4f}) r={r:.4f}")

# ── Materials ──────────────────────────────────────────────────────
def alum(name, color, rough):
    m = bpy.data.materials.new(name=name); m.use_nodes=True
    n = m.node_tree.nodes; l = m.node_tree.links; n.clear()
    o = n.new('ShaderNodeOutputMaterial')
    b = n.new('ShaderNodeBsdfPrincipled')
    b.inputs['Base Color'].default_value = (*color, 1.0)
    b.inputs['Metallic'].default_value = 1.0
    b.inputs['Roughness'].default_value = rough
    l.new(b.outputs['BSDF'], o.inputs['Surface'])
    return m

mat_bright = alum("AlumBright", (0.88, 0.88, 0.91), 0.22)
mat_mid    = alum("AlumMid",    (0.78, 0.78, 0.81), 0.32)
mat_dark   = alum("AlumDark",   (0.55, 0.55, 0.58), 0.42)

# ── Z-axis layout (top-down) ───────────────────────────────────────
# rim_z   : highest point, the rolled aluminum edge
# slope_z : where the inward slope ends (~ 0.025r below rim)
# plat_z  : flat platform (where tab sits) — slightly lower than slope
# tab_z   : top surface of the pull tab lever itself
rim_z   = max_z + r*0.005
slope_z = max_z - r*0.012
plat_z  = max_z - r*0.020
tab_z   = plat_z + r*0.012

# ── 1. RIM — rolled aluminum edge ──────────────────────────────────
print("Rim...")
bpy.ops.mesh.primitive_torus_add(
    location=(cx, cy, rim_z),
    major_radius=r*0.99,
    minor_radius=r*0.022,
    major_segments=80, minor_segments=14
)
rim = bpy.context.active_object; rim.name="Top_Rim"
rim.data.materials.append(mat_bright)

# ── 2. CONCAVE ANNULUS — outer slope from rim down to platform ─────
# Built as a flat annulus first, then we lower the inner edge
print("Concave annulus...")
bpy.ops.mesh.primitive_circle_add(
    location=(cx, cy, slope_z),
    radius=r*0.97,
    vertices=80, fill_type='NGON'
)
annulus = bpy.context.active_object; annulus.name="Top_Annulus"
annulus.data.materials.append(mat_bright)

# Inset to create a ring shape; only ONE inset
bm = bmesh.new(); bm.from_mesh(annulus.data)
faces = list(bm.faces)
result = bmesh.ops.inset_individual(bm, faces=faces, thickness=r*0.42)
inner_face = result['faces'][0]
# Lower the inner ring slightly to create the concave slope
for v in inner_face.verts:
    v.co.z -= r*0.008
# DELETE the inner face to leave the platform area OPEN
bmesh.ops.delete(bm, geom=[inner_face], context='FACES')
bm.to_mesh(annulus.data); bm.free()

# ── 3. FLAT PLATFORM — the visible inner area where tab sits ───────
print("Platform...")
bpy.ops.mesh.primitive_cylinder_add(
    location=(cx, cy, plat_z),
    radius=r*0.55,
    depth=r*0.006,
    vertices=64
)
plat = bpy.context.active_object; plat.name="Top_Platform"
plat.data.materials.append(mat_mid)

# ── 4. POUR OPENING — etched teardrop on platform ──────────────────
print("Pour opening...")
pour_x = cx + r*0.20
bpy.ops.mesh.primitive_cylinder_add(
    location=(pour_x, cy, plat_z + r*0.004),
    radius=r*0.22, depth=r*0.005,
    vertices=40
)
pour = bpy.context.active_object; pour.name="Top_PourOpening"
pour.scale = (1.0, 0.55, 1.0)
bpy.ops.object.transform_apply(scale=True)
pour.data.materials.append(mat_dark)

# Score line — embossed teardrop outline
bpy.ops.mesh.primitive_torus_add(
    location=(pour_x, cy, plat_z + r*0.007),
    major_radius=r*0.22,
    minor_radius=r*0.0035,
    major_segments=48, minor_segments=8
)
score = bpy.context.active_object; score.name="Top_ScoreLine"
score.scale = (1.0, 0.55, 1.0)
bpy.ops.object.transform_apply(scale=True)
score.data.materials.append(mat_dark)

# ── 5. PULL TAB LEVER — oval with finger hole ──────────────────────
print("Pull tab lever...")
tab_x = cx + r*0.05  # offset slightly toward pour opening
# Outer tab shape — flat oval, BIG and CLEAR
bpy.ops.mesh.primitive_cylinder_add(
    location=(tab_x, cy, tab_z),
    radius=r*0.42,
    depth=r*0.018,
    vertices=64
)
tab = bpy.context.active_object; tab.name="Top_PullTab"
tab.scale = (1.0, 0.42, 1.0)   # stadium — long thin oval
bpy.ops.object.transform_apply(scale=True)
tab.data.materials.append(mat_bright)

# Finger hole — cut a smaller oval out
bpy.ops.mesh.primitive_cylinder_add(
    location=(tab_x + r*0.10, cy, tab_z),
    radius=r*0.18,
    depth=r*0.05,
    vertices=40
)
hole = bpy.context.active_object; hole.name="HoleCut"
hole.scale = (1.0, 0.55, 1.0)
bpy.ops.object.transform_apply(scale=True)

bpy.context.view_layer.objects.active = tab
bm = tab.modifiers.new(name="HoleBool", type='BOOLEAN')
bm.operation = 'DIFFERENCE'; bm.object = hole
bpy.ops.object.modifier_apply(modifier="HoleBool")
bpy.data.objects.remove(hole, do_unlink=True)

# ── 6. RIVET — pivot point ─────────────────────────────────────────
print("Rivet...")
rivet_x = tab_x - r*0.30
# Rivet cylinder base
bpy.ops.mesh.primitive_cylinder_add(
    location=(rivet_x, cy, tab_z + r*0.012),
    radius=r*0.06, depth=r*0.014,
    vertices=24
)
rv = bpy.context.active_object; rv.name="Top_Rivet"
rv.data.materials.append(mat_dark)

# Rivet dome top
bpy.ops.mesh.primitive_uv_sphere_add(
    location=(rivet_x, cy, tab_z + r*0.022),
    radius=r*0.055,
    segments=20, ring_count=10
)
rvd = bpy.context.active_object; rvd.name="Top_RivetDome"
rvd.scale = (1,1,0.5)
bpy.ops.object.transform_apply(scale=True)
rvd.data.materials.append(mat_dark)

# ── Parent all under can ───────────────────────────────────────────
parts = [rim, annulus, plat, pour, score, tab, rv, rvd]
for p in parts:
    p.parent = can

# Smooth shade
for p in parts:
    bpy.ops.object.select_all(action='DESELECT')
    p.select_set(True); bpy.context.view_layer.objects.active = p
    bpy.ops.object.shade_smooth()

# ── Export ─────────────────────────────────────────────────────────
bpy.ops.object.select_all(action='SELECT')
print(f"Export: {GLB_OUT}")
bpy.ops.export_scene.gltf(
    filepath=GLB_OUT,
    export_format='GLB',
    use_selection=False,
    export_apply=True,
    export_materials='EXPORT',
    export_image_format='AUTO'
)
print("✓ Done")
