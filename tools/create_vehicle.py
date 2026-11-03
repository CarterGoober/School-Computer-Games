"""Original Wren 88 expedition wagon. Blender source and independently animated GLB parts."""
import bpy,math,os
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def mat(name,c,metal=0,rough=.6):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*c,1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough;return m
paint=mat('Deep sage enamel',(.19,.29,.21),.25,.35);cream=mat('Warm ivory roof',(.77,.72,.55),.1,.5);steel=mat('Graphite steel',(.075,.09,.085),.65,.42);rubber=mat('Rubber',(.018,.023,.02),0,.9);silver=mat('Machined alloy',(.4,.43,.4),.8,.28);glass=mat('Smoked blue glass',(.08,.17,.2),.35,.17);amber=mat('Amber indicator',(.8,.29,.035));lamp=mat('Headlight glass',(.85,.82,.58),.3,.15);red=mat('Tail lens',(.55,.035,.018));leather=mat('Canvas',(.3,.23,.12))
parts=[]
def pos(p):return (p[0],-p[2],p[1])
def box(p,size,m,bevel=.035):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos(p));o=bpy.context.object;o.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('Pressed edges','BEVEL');mod.width=bevel;mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name)
 o.data.materials.append(m);parts.append(o);return o

def tube(a,b,r,m,vertices=12):
 a,b=Vector(pos(a)),Vector(pos(b));bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=(b-a).length,location=(a+b)/2);o=bpy.context.object;o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler();o.data.materials.append(m)
 for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
 parts.append(o);return o

def finish(name):
 global parts
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();o=bpy.context.object;o.name=name;bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR');parts=[];return o
# Narrow boxed ladder chassis and raised body leave real tire clearance.
for x in [-.62,.62]:box((x,-.16,0),(.13,.2,4.3),steel)
for z in [-1.75,-.6,.6,1.7]:box((0,-.16,z),(1.36,.12,.12),steel)
box((0,.29,0),(1.98,.32,4.15),paint)
# Closed floor, sill seams, pressed panels and front hood reinforcements.
box((0,.03,-.1),(1.62,.12,3.7),steel)
for x in [-.95,.95]:
 box((x,.28,-.5),(.055,.055,2.1),silver,.008)
 for z in [-1.25,-.45,.35]:box((x,.64,z),(.06,.025,.35),steel,.006)
for x in [-.67,.67]:box((x,.665,1.35),(.04,.025,.95),paint,.008)
box((0,.76,-.7),(1.98,.65,2.65),paint);box((0,1.78,-.65),(2.08,.15,2.91),cream);box((0,.56,1.35),(1.9,.18,1.35),paint)
box((0,1.25,-1.99),(1.64,.68,.045),glass)
box((0,1.23,.67),(1.73,.79,.06),glass)
for x in [-.94,.94]:
 for z in [-1.93,-.82,.61]:box((x,1.22,z),(.095,1.03,.09),paint,.015)
 for z,d in [(-1.38,.9),(-.12,1.14)]:box((x,1.23,z),(.045,.77,d),glass,.01)
 box((x,.62,-.17),(.055,.68,1.17),paint,.02);box((x,.81,-.5),(.07,.045,.24),silver,.01)
 for z in [-1.65,1.65]:
  for j in range(12):
   a=j*math.pi/12;b=(j+1)*math.pi/12
   tube((x*1.1,-.38+math.sin(a)*.65,z+math.cos(a)*.65),(x*1.1,-.38+math.sin(b)*.65,z+math.cos(b)*.65),.075,steel,8)
 box((x*1.18,1.17,.55),(.23,.32,.12),steel);tube((x,1.05,.5),(x*1.18,1.08,.55),.035,silver)
 box((x*1.1,-.23,-.2),(.26,.08,1.6),steel)
 for z in [-.65,.05]:box((x*1.11,-.18,z),(.23,.025,.045),silver,.005)
 for z in [-1.93,-.82,.61]:
  for y in [.45,.8]:tube((x*.99,y,z),(x*1.02,y,z),.028,silver,8)
box((0,.32,2.11),(.94,.43,.1),steel)
for i in range(-4,5):box((i*.09,.32,2.17),(.035,.34,.025),silver,.006)
for x in [-.74,.74]:
 tube((x,.39,2.08),(x,.39,2.19),.18,lamp,24);box((x,.12,2.17),(.18,.1,.06),amber);box((x,.43,-2.12),(.15,.27,.07),red)
for z in [-2.28,2.29]:
 box((0,-.08,z),(2.15,.17,.18),steel);box((0,-.2,z),(1.5,.12,.04),silver)
 for x in [-.6,.6]:tube((x,-.15,z),(x,-.3,z),.055,silver)
box((0,.06,2.15),(.8,.04,.6),silver);box((0,.42,-2.17),(.55,.15,.025),cream)
for x in [-.85,.85]:
 for z in [-1.8,.5]:tube((x,1.8,z),(x,2.0,z),.035,steel)
 tube((x,2,-1.85),(x,2,.5),.035,steel)
for z in [-1.85,.5]:tube((-.85,2,z),(.85,2,z),.035,steel)
box((-.36,1.96,-1.2),(.65,.25,.8),leather);box((.4,1.97,-1.15),(.54,.22,.85),cream)
for x in [-.58,.58]:box((x,2.1,-1.2),(.035,.04,.8),steel)
# Fixed rear spare, distinct from four rolling wheels.
tube((0,.95,-2.06),(0,.95,-2.39),.46,rubber,28);tube((0,.95,-2.4),(0,.95,-2.42),.27,cream,20)
finish('body')
for name in ['FL','FR','RL','RR']:
 # Axle is X; the tire profile is a rounded section, with individual tread blocks.
 for a,b,r in [(-.17,-.12,.44),(-.12,.12,.48),(.12,.17,.44)]:tube((a,0,0),(b,0,0),r,rubber,28)
 for side in [-1,1]:
  tube((side*.171,0,0),(side*.19,0,0),.29,cream,24);tube((side*.192,0,0),(side*.21,0,0),.14,silver,16)
  for j in range(6):
   a=j*math.tau/6;tube((side*.193,math.sin(a)*.2,math.cos(a)*.2),(side*.207,math.sin(a)*.2,math.cos(a)*.2),.027,steel,6)
 for j in range(28):
  a=j*math.tau/28
  o=box((0,math.cos(a)*.47,math.sin(a)*.47),(.31,.055,.09),rubber,.009);o.rotation_euler.x=-a
 finish('wheel_'+name)
 # Unit Y-axis components; renderer stretches between physical mounts.
 tube((0,0,0),(0,1,0),.035,silver);finish('shock_'+name)
 for j in range(64):
  a=j/64*math.tau*6;b=(j+1)/64*math.tau*6;tube((math.cos(a)*.095,j/64,math.sin(a)*.095),(math.cos(b)*.095,(j+1)/64,math.sin(b)*.095),.018,steel,5)
 finish('spring_'+name)
 tube((0,0,0),(0,1,0),.045,steel);finish('arm_'+name)
for name in ['axle_front','axle_rear']:
 tube((-1,0,0),(1,0,0),.075,steel);tube((-.18,0,0),(.18,0,0),.17,steel,16);finish(name)
tube((0,0,0),(0,1,0),.028,silver);finish('steering_link')
# Four independently animated nodes share immutable mesh data in the GLB.
# This preserves the mechanisms while cutting download and GPU memory costs.
for family in ['wheel_','spring_','shock_','arm_']:
 base=bpy.data.objects[family+'FL']
 for suffix in ['FR','RL','RR']:bpy.data.objects[family+suffix].data=base.data
bpy.data.objects['axle_rear'].data=bpy.data.objects['axle_front'].data
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'over-the-hill/wren.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'over-the-hill/wren.glb'),export_format='GLB',export_yup=True,export_apply=True)
