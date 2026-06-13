"""
Headless Blender: realistic aluminum can top.
- Domed concave top (curved inward)
- Proper oval pull-tab LEVER with finger hole (not just a flat ring)
- Stamped/scored teardrop pour opening
- Small rivet pivot
- Brushed aluminum material
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

# ── Import original GLB (from backup, not current) ─────────────────
print(f"Importing: {GLB_IN}")
bpy.ops.import_scene.gltf(filepath=GLB_IN)

# Remove any existing PullTab mesh from the original (we'll build our own)
for obj in list(bpy.context.scene.objects):
    if obj.type == 'MESH' and 'tab' in obj.name.lower():
        bpy.data.objects.remove(obj, do_unlink=True)

can_objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
print(f"Imported {len(can_objects)} mesh(es): {[o.name for o in can_objects]}")

def bbox_volume(o):
    bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
    xs=[v.x for v in bb]; ys=[v.y for v in bb]; zs=[v.z for v in bb]
    return (max(xs)-min(xs))*(max(ys)-min(ys))*(max(zs)-min(zs))

can = max(can_objects, key=bbox_volume)
print(f"Main can mesh: {can.name}")

# ── Compute top metrics ────────────────────────────────────────────
verts_w = [can.matrix_world @ v.co for v in can.data.vertices]
max_z = max(v.z for v in verts_w)
top_verts = [v for v in verts_w if v.z > max_z - 0.005]
if top_verts:
    cx = sum(v.x for v in top_verts)/len(top_verts)
    cy = sum(v.y for v in top_verts)/len(top_verts)
    r = max(math.hypot(v.x-cx, v.y-cy) for v in top_verts)
else:
    bb=[can.matrix_world @ Vector(c) for c in can.bound_box]
    cx=sum(v.x for v in bb)/len(bb); cy=sum(v.y for v in bb)/len(bb)
    r=max(abs(v.x-cx) for v in bb)

print(f"Top center=({cx:.4f},{cy:.4f},{max_z:.4f}) radius={r:.4f}")

# ── Aluminum materials ─────────────────────────────────────────────
def make_alum(name, color, rough, metal=1.0):
    m = bpy.data.materials.new(name=name)
    m.use_nodes = True
    n = m.node_tree.nodes; l = m.node_tree.links; n.clear()
    o = n.new('ShaderNodeOutputMaterial')
    b = n.new('ShaderNodeBsdfPrincipled')
    b.inputs['Base Color'].default_value = (*color, 1.0)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    l.new(b.outputs['BSDF'], o.inputs['Surface'])
    return m

alum_bright = make_alum("AluminumBright", (0.88, 0.88, 0.91), 0.22)
alum_mid    = make_alum("AluminumMid",    (0.80, 0.80, 0.83), 0.30)
alum_dark   = make_alum("AluminumDark",   (0.65, 0.65, 0.68), 0.38)

# ── 1. RIM (rolled aluminum edge at the top of the can) ────────────
print("Building rim...")
bpy.ops.mesh.primitive_torus_add(
    location=(cx, cy, max_z + r*0.008),
    major_radius=r*0.985,
    minor_radius=r*0.025,
    major_segments=80, minor_segments=14
)
rim = bpy.context.active_object
rim.name = "Can_Rim"
rim.data.materials.append(alum_bright)

# ── 2. DOMED TOP — concave dome sloping inward toward center ───────
print("Building domed top...")
top_z = max_z - r*0.01      # top edge of dome
dome_depth = r*0.08          # how far down the center sits
bpy.ops.mesh.primitive_circle_add(
    location=(cx, cy, top_z),
    radius=r*0.97,
    vertices=80, fill_type='NGON'
)
dome = bpy.context.active_object
dome.name = "Can_Top"
dome.data.materials.append(alum_bright)

# Inset and lower the center to make a smooth concave dome
mesh = dome.data
bm = bmesh.new(); bm.from_mesh(mesh)
# Recursive insets to create dome rings
ring_face = [f for f in bm.faces][0]
for i in range(6):
    result = bmesh.ops.inset_individual(bm, faces=[ring_face], thickness=r*0.07)
    for f in result['faces']:
        ring_face = f
    # Lower this ring slightly more
    for v in ring_face.verts:
        v.co.z -= dome_depth/6
bm.to_mesh(mesh); bm.free()

# ── 3. INNER PLATFORM — flat area in the dome center where tab sits ─
print("Building tab platform...")
plat_z = top_z - dome_depth*0.92
bpy.ops.mesh.primitive_cylinder_add(
    location=(cx, cy, plat_z),
    radius=r*0.55,
    depth=r*0.006,
    vertices=48
)
plat = bpy.context.active_object
plat.name = "Can_Platform"
plat.data.materials.append(alum_mid)

# ── 4. POUR OPENING — stamped teardrop score line ──────────────────
print("Building pour opening (teardrop)...")
pour_z = plat_z + r*0.005
pour_x = cx + r*0.18
# Use a thin cylinder + deformed by scaling
bpy.ops.mesh.primitive_cylinder_add(
    location=(pour_x, cy, pour_z),
    radius=r*0.20,
    depth=r*0.012,
    vertices=40
)
pour = bpy.context.active_object
pour.name = "Can_PourOpening"
pour.scale = (1.0, 0.55, 1.0)  # squash for oval
bpy.ops.object.transform_apply(scale=True)
# Move slightly into the platform so it looks recessed
pour.location.z -= r*0.003
pour.data.materials.append(alum_dark)

# Score line — thin torus around the pour opening
bpy.ops.mesh.primitive_torus_add(
    location=(pour_x, cy, pour_z + r*0.003),
    major_radius=r*0.20,
    minor_radius=r*0.003,
    major_segments=48, minor_segments=8
)
score = bpy.context.active_object
score.name = "Can_ScoreLine"
score.scale = (1.0, 0.55, 1.0)
bpy.ops.object.transform_apply(scale=True)
score.data.materials.append(alum_dark)

# ── 5. PULL TAB LEVER — proper oval shape with finger hole ─────────
print("Building pull-tab lever...")
tab_z = plat_z + r*0.014
tab_x = cx + r*0.06  # offset from center

# Create the outer tab shape — flat oval
bpy.ops.mesh.primitive_cylinder_add(
    location=(tab_x, cy, tab_z),
    radius=r*0.32,
    depth=r*0.018,
    vertices=48
)
tab_outer = bpy.context.active_object
tab_outer.name = "Can_TabOuter"
tab_outer.scale = (1.0, 0.50, 1.0)   # stadium shape — long thin oval
bpy.ops.object.transform_apply(scale=True)
tab_outer.data.materials.append(alum_bright)

# Finger hole — smaller oval cut out
bpy.ops.mesh.primitive_cylinder_add(
    location=(tab_x + r*0.07, cy, tab_z),
    radius=r*0.14,
    depth=r*0.04,
    vertices=32
)
tab_hole = bpy.context.active_object
tab_hole.name = "Can_TabHole_cut"
tab_hole.scale = (1.0, 0.55, 1.0)
bpy.ops.object.transform_apply(scale=True)

# Boolean SUBTRACT — drill the finger hole through the tab
bpy.context.view_layer.objects.active = tab_outer
bool_mod = tab_outer.modifiers.new(name="HoleBool", type='BOOLEAN')
bool_mod.operation = 'DIFFERENCE'
bool_mod.object = tab_hole
bpy.ops.object.modifier_apply(modifier="HoleBool")
# Remove the cutter
bpy.data.objects.remove(tab_hole, do_unlink=True)

# ── 6. RIVET — the pivot point at one end of the tab ───────────────
print("Building rivet...")
rivet_x = tab_x - r*0.20
bpy.ops.mesh.primitive_cylinder_add(
    location=(rivet_x, cy, tab_z + r*0.012),
    radius=r*0.055,
    depth=r*0.014,
    vertices=24
)
rivet = bpy.context.active_object
rivet.name = "Can_Rivet"
rivet.data.materials.append(alum_dark)

# Tiny rivet dome on top
bpy.ops.mesh.primitive_uv_sphere_add(
    location=(rivet_x, cy, tab_z + r*0.020),
    radius=r*0.048,
    segments=16, ring_count=8
)
rivet_dome = bpy.context.active_object
rivet_dome.name = "Can_RivetDome"
rivet_dome.scale = (1, 1, 0.55)
bpy.ops.object.transform_apply(scale=True)
rivet_dome.data.materials.append(alum_dark)

# ── 7. Parent all the new bits to the can ──────────────────────────
new_parts = [rim, dome, plat, pour, score, tab_outer, rivet, rivet_dome]
for obj in new_parts:
    obj.parent = can

# ── Smooth shading for organic look ────────────────────────────────
for obj in new_parts:
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.ops.object.shade_smooth()

# ── Export ─────────────────────────────────────────────────────────
bpy.ops.object.select_all(action='SELECT')
print(f"Exporting: {GLB_OUT}")
bpy.ops.export_scene.gltf(
    filepath=GLB_OUT,
    export_format='GLB',
    use_selection=False,
    export_apply=True,
    export_materials='EXPORT',
    export_image_format='AUTO'
)
print("✓ Done")
