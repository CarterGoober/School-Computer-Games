"""Export tiny distant-only 3D LODs from the original nature.blend. Never edits its source."""
import bpy,os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT,'over-the-hill/nature.blend'))
keep=[]
for name,ratio in [('oak',.18),('birch',.18),('pine',.38)]:
 source=bpy.data.objects[name+'_low'];obj=source.copy();obj.data=source.data.copy();obj.name=name+'_far';bpy.context.collection.objects.link(obj)
 bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
 modifier=obj.modifiers.new('Distance silhouette reduction','DECIMATE');modifier.ratio=ratio;modifier.use_collapse_triangulate=True
 bpy.ops.object.modifier_apply(modifier=modifier.name)
 keep.append(obj)
for obj in list(bpy.data.objects):
 if obj not in keep:bpy.data.objects.remove(obj,do_unlink=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'over-the-hill/nature-distance.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'over-the-hill/nature-distance.glb'),export_format='GLB',export_yup=True,export_apply=True,export_materials='EXPORT',export_normals=True)
for obj in keep:print(obj.name, sum(len(p.vertices)-2 for p in obj.data.polygons),'triangles')
