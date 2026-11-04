"""Export WSDLab.blend to a web-ready .glb without modifying the .blend file.

Usage:
  blender -b WSDLab.blend --python blender/export_glb.py -- web/public/models/lab.glb
"""
import sys
import bpy

# Typos in the source model that the web app's object lookup should not have to know about.
RENAMES = {
    "Storaae Rack 4": "Storage Rack 4",
}

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
out_path = argv[0] if argv else "lab.glb"

for old, new in RENAMES.items():
    obj = bpy.data.objects.get(old)
    if obj:
        obj.name = new

bpy.ops.export_scene.gltf(
    filepath=out_path,
    export_format="GLB",
    use_selection=False,
    export_cameras=False,
    export_lights=False,  # lighting is set up in three.js
    export_apply=True,
    export_yup=True,
)

meshes = sum(1 for o in bpy.data.objects if o.type == "MESH")
print(f"[export_glb] wrote {out_path} ({meshes} meshes)")
