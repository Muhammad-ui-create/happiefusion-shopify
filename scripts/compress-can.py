"""
Headless Blender: re-export the original Happie can GLB with Draco compression
for ~50-80% smaller file size = faster load.
Also reduces texture resolution if images are very large.
"""
import bpy
import os

GLB_IN  = r"C:\Claude Code\happiefusion-shopify\assets\happie-can-3d-original.glb.bak"
GLB_OUT = r"C:\Claude Code\happiefusion-shopify\assets\happie-can-3d.glb"

# Clean scene
bpy.ops.wm.read_factory_settings(use_empty=True)
print(f"Importing: {GLB_IN}")
bpy.ops.import_scene.gltf(filepath=GLB_IN)

# Optional: downscale very large textures to reduce file size
for img in bpy.data.images:
    if img.size[0] > 1024:
        print(f"  Image {img.name}: {img.size[0]}x{img.size[1]} -> 1024 max")
        img.scale(1024, min(1024, img.size[1]))

# Export with Draco compression
bpy.ops.object.select_all(action='SELECT')
print(f"Exporting compressed: {GLB_OUT}")
bpy.ops.export_scene.gltf(
    filepath=GLB_OUT,
    export_format='GLB',
    use_selection=False,
    export_apply=True,
    export_materials='EXPORT',
    export_image_format='JPEG',     # smaller than PNG
    export_jpeg_quality=85,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=10,  # max compression
    export_draco_position_quantization=11,
    export_draco_normal_quantization=8,
    export_draco_texcoord_quantization=10,
    export_draco_color_quantization=8,
    export_draco_generic_quantization=12,
)
print("✓ Done")
