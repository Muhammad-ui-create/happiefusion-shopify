"""
Headless Blender: re-export the original Happie can GLB with:
1. Draco compression (~85% smaller, fast load)
2. The label/front ROTATED to face the +Z direction (default front)
   so AR placement on Android Scene Viewer and iOS Quick Look both show
   the label side toward the user.
"""
import bpy
import math
import os

GLB_IN  = r"C:\Claude Code\happiefusion-shopify\assets\happie-can-3d-original.glb.bak"
GLB_OUT = r"C:\Claude Code\happiefusion-shopify\assets\happie-can-3d.glb"

bpy.ops.wm.read_factory_settings(use_empty=True)
print(f"Importing: {GLB_IN}")
bpy.ops.import_scene.gltf(filepath=GLB_IN)

# ── Rotate all mesh objects 180° around Z so the FRONT label faces the camera ──
# (was previously showing the BACK / nutrition panel in AR)
for obj in bpy.context.scene.objects:
    if obj.type == 'MESH':
        # 180° rotation around vertical (Z) axis
        obj.rotation_euler[2] += math.radians(180)
        # Apply the rotation so it bakes into the geometry
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.select_all(action='DESELECT')
        obj.select_set(True)
        bpy.ops.object.transform_apply(rotation=True)
        print(f"  Rotated {obj.name} 180° on Z, applied")

# ── Downscale large textures to keep file size small ──
for img in bpy.data.images:
    if img.size[0] > 1024:
        print(f"  Image {img.name}: {img.size[0]}x{img.size[1]} -> 1024 max")
        img.scale(1024, min(1024, img.size[1]))

# ── Export with Draco compression + JPEG textures ──
bpy.ops.object.select_all(action='SELECT')
print(f"Exporting compressed: {GLB_OUT}")
bpy.ops.export_scene.gltf(
    filepath=GLB_OUT,
    export_format='GLB',
    use_selection=False,
    export_apply=True,
    export_materials='EXPORT',
    export_image_format='JPEG',
    export_jpeg_quality=85,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=10,
    export_draco_position_quantization=11,
    export_draco_normal_quantization=8,
    export_draco_texcoord_quantization=10,
    export_draco_color_quantization=8,
    export_draco_generic_quantization=12,
)
print("✓ Done")
