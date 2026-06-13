"""
Headless Blender script: Adds a realistic aluminum top to the Happie can GLB.
- Detects the top of the can
- Indents the top edge slightly (concave)
- Adds a pull tab (small rectangle with hole)
- Applies aluminum material
Usage:
  blender --background --python fix-can-top.py
"""
import bpy
import bmesh
import math
import os
from mathutils import Vector

# ── Paths ──────────────────────────────────────────────────────────
GLB_IN  = r"C:\Claude Code\happiefusion-shopify\assets\happie-can-3d.glb"
GLB_OUT = r"C:\Claude Code\happiefusion-shopify\assets\happie-can-3d.glb"

# ── 1. Clean scene ─────────────────────────────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)

# ── 2. Import the existing can GLB ─────────────────────────────────
print(f"Importing: {GLB_IN}")
bpy.ops.import_scene.gltf(filepath=GLB_IN)

# Get all imported meshes
can_objects = [o for o in bpy.context.scene.objects if o.type == 'MESH']
print(f"Imported {len(can_objects)} mesh(es): {[o.name for o in can_objects]}")

if not can_objects:
    raise RuntimeError("No mesh imported from GLB")

# Pick the main can body (largest mesh by bbox)
def bbox_volume(obj):
    bb = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    xs = [v.x for v in bb]; ys = [v.y for v in bb]; zs = [v.z for v in bb]
    return (max(xs)-min(xs)) * (max(ys)-min(ys)) * (max(zs)-min(zs))

can = max(can_objects, key=bbox_volume)
print(f"Main can mesh: {can.name}")

# ── 3. Get the top Z and radius of the can ─────────────────────────
world_verts = [can.matrix_world @ v.co for v in can.data.vertices]
max_z = max(v.z for v in world_verts)
min_z = min(v.z for v in world_verts)
top_verts = [v for v in world_verts if v.z > max_z - 0.005]

if top_verts:
    cx = sum(v.x for v in top_verts) / len(top_verts)
    cy = sum(v.y for v in top_verts) / len(top_verts)
    # Estimate radius
    radius = max(math.hypot(v.x - cx, v.y - cy) for v in top_verts)
else:
    # Fallback to overall bbox
    bb = [can.matrix_world @ Vector(c) for c in can.bound_box]
    cx = sum(v.x for v in bb) / len(bb)
    cy = sum(v.y for v in bb) / len(bb)
    radius = max(abs(v.x - cx) for v in bb)

print(f"Top center: ({cx:.4f}, {cy:.4f}, {max_z:.4f}), radius: {radius:.4f}")

# ── 4. Aluminum material ───────────────────────────────────────────
alum_mat = bpy.data.materials.new(name="AluminumTop")
alum_mat.use_nodes = True
nodes = alum_mat.node_tree.nodes
links = alum_mat.node_tree.links
nodes.clear()

out = nodes.new(type='ShaderNodeOutputMaterial')
bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
bsdf.inputs['Base Color'].default_value = (0.85, 0.85, 0.88, 1.0)
bsdf.inputs['Metallic'].default_value = 1.0
bsdf.inputs['Roughness'].default_value = 0.28
links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])

# Darker aluminum for the tab depression
tab_mat = bpy.data.materials.new(name="AluminumTab")
tab_mat.use_nodes = True
tn = tab_mat.node_tree.nodes
tl = tab_mat.node_tree.links
tn.clear()
to = tn.new(type='ShaderNodeOutputMaterial')
tb = tn.new(type='ShaderNodeBsdfPrincipled')
tb.inputs['Base Color'].default_value = (0.78, 0.78, 0.80, 1.0)
tb.inputs['Metallic'].default_value = 1.0
tb.inputs['Roughness'].default_value = 0.35
tl.new(tb.outputs['BSDF'], to.inputs['Surface'])

# ── 5. Build the can top assembly (rim + recessed top + pull tab) ──
# Rim — thin torus around the top edge
print("Adding rim...")
bpy.ops.mesh.primitive_torus_add(
    location=(cx, cy, max_z),
    major_radius=radius * 0.99,
    minor_radius=radius * 0.018,
    major_segments=64,
    minor_segments=12
)
rim = bpy.context.active_object
rim.name = "Can_Rim"
rim.data.materials.append(alum_mat)

# Recessed top — slightly below the rim
print("Adding recessed top surface...")
recess_z = max_z - radius * 0.04
bpy.ops.mesh.primitive_cylinder_add(
    location=(cx, cy, recess_z),
    radius=radius * 0.96,
    depth=radius * 0.05,
    vertices=64
)
top = bpy.context.active_object
top.name = "Can_Top"
top.data.materials.append(alum_mat)

# Tab platform — slight oval indent on the recessed top
print("Adding pull-tab assembly...")
tab_z = recess_z + radius * 0.025
tab_offset_x = radius * 0.30  # offset from center
# The actual pull tab (small flat ring shape)
bpy.ops.mesh.primitive_torus_add(
    location=(cx + tab_offset_x, cy, tab_z + radius * 0.005),
    major_radius=radius * 0.22,
    minor_radius=radius * 0.018,
    major_segments=32,
    minor_segments=8
)
tab = bpy.context.active_object
tab.name = "Can_Tab"
tab.data.materials.append(tab_mat)

# Rivet at the tab pivot (small cylinder)
bpy.ops.mesh.primitive_cylinder_add(
    location=(cx - radius * 0.05, cy, tab_z + radius * 0.01),
    radius=radius * 0.04,
    depth=radius * 0.02,
    vertices=24
)
rivet = bpy.context.active_object
rivet.name = "Can_Rivet"
rivet.data.materials.append(tab_mat)

# Score line (pour opening teardrop shape) — small flat indent
bpy.ops.mesh.primitive_cylinder_add(
    location=(cx + tab_offset_x * 1.05, cy, tab_z),
    radius=radius * 0.18,
    depth=radius * 0.005,
    vertices=24
)
pour = bpy.context.active_object
pour.name = "Can_PourOpening"
pour.data.materials.append(tab_mat)
# Slightly squash for teardrop look
pour.scale = (1.0, 0.6, 1.0)
bpy.ops.object.transform_apply(scale=True)

# ── 6. Group everything as children of the can ─────────────────────
top_parts = [rim, top, tab, rivet, pour]
for obj in top_parts:
    obj.parent = can

# ── 7. Export combined GLB ─────────────────────────────────────────
# Select everything for export
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
