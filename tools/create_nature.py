"""Original full-3D foliage models for Ashen Vale. Run with Blender --background --python.
No billboards, screenshot textures or imported third-party scenery assets.
"""
import bpy, math, random, os
from mathutils import Vector
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def material(name,color,rough=.9):
 m=bpy.data.materials.new(name);m.use_nodes=True
 n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=tuple((int(color[i:i+2],16)/255)**2.2 for i in (1,3,5))+(1,);n.inputs['Roughness'].default_value=rough
 m.diffuse_color=n.inputs['Base Color'].default_value;return m
mats=[material('bark','#6e5740'),material('birch bark','#c9c6a9'),material('leaf amber','#d9a62e'),material('leaf copper','#b96e29'),material('leaf sunlit','#edc34a'),material('leaf pine','#315c42'),material('leaf pine tips','#60804e'),material('grass deep','#4b7041'),material('grass light','#9da447'),material('fern','#457452'),material('slate','#748395')]
class Mesh:
 def __init__(self,name):self.name=name;self.v=[];self.f=[];self.m=[];self.s=[]
 def face(self,points,mat=0,smooth=False):
  n=len(self.v);self.v.extend([tuple(p) for p in points]);self.f.append(tuple(range(n,n+len(points))));self.m.append(mat);self.s.append(smooth)
 def tube(self,a,b,r1,r2,mat=0,n=6):
  a,b=Vector(a),Vector(b);axis=(b-a).normalized();u=axis.cross(Vector((0,1,0)))
  if u.length<.01:u=axis.cross(Vector((1,0,0)))
  u.normalize();v=axis.cross(u);rings=[[p+(u*math.cos(i*math.tau/n)+v*math.sin(i*math.tau/n))*r for i in range(n)]for p,r in [(a,r1),(b,r2)]]
  for i in range(n):self.face([rings[0][i],rings[0][(i+1)%n],rings[1][(i+1)%n],rings[1][i]],mat,True)
 def leaf(self,p,length,width,angle,tilt,mat):
  p=Vector(p);u=Vector((math.cos(angle)*math.cos(tilt),math.sin(angle)*math.cos(tilt),math.sin(tilt)));v=Vector((-math.sin(angle),math.cos(angle),.12));a=p-u*length*.5;b=p+u*length*.5;l=p+v*width*.5;r=p-v*width*.5;mid=p+Vector((0,0,width*.16))
  for q in [(a,l,b),(a,b,r)]:self.face(q,mat)
 def crown(self,p,r,mat,lod=False):
  p=Vector(p);n=7 if lod else 12;rings=4 if lod else 7
  def point(i,j):
   a=i/n*math.tau;b=-math.pi/2+j/rings*math.pi
   shape=1+.08*math.sin(a*3+b*2)+.045*math.cos(a*5-b)
   return p+Vector((math.cos(a)*math.cos(b)*r*shape,math.sin(a)*math.cos(b)*r*.85*shape,math.sin(b)*r*.68))
  for j in range(rings):
   for i in range(n):self.face([point(i,j),point(i+1,j),point(i+1,j+1),point(i,j+1)],mat,True)
 def finish(self):
  me=bpy.data.meshes.new(self.name);me.from_pydata(self.v,[],self.f);me.update();obj=bpy.data.objects.new(self.name,me);bpy.context.collection.objects.link(obj)
  for m in mats:me.materials.append(m)
  for i,p in enumerate(me.polygons):p.material_index=self.m[i];p.use_smooth=self.s[i]
  # Weld branch rings so smooth trunk normals are genuine shared-vertex normals.
  bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.remove_doubles(threshold=.00001);bpy.ops.object.mode_set(mode='OBJECT');obj.select_set(False)
  return obj

def deciduous(name,birch=False,lod=False):
 rng=random.Random(37 if birch else 19);m=Mesh(name);trunk=1 if birch else 0
 if lod:
  m.tube((0,0,0),(0,0,11.7),.43,.025,trunk,5)
  for j in range(8):
   a=j*2.399;z=5+j*.75;r=(2.6 if not birch else 1.6)*(1-j/14);tip=Vector((math.cos(a)*r,math.sin(a)*r,z+1));m.tube((0,0,z-.8),tip,.075,.018,trunk,4)
   m.crown(tip,1.7 if not birch else 1.25,2+j%3,True)
   for k in range(26):
    ang=rng.random()*math.tau;rr=rng.random();p=tip+Vector((math.cos(ang)*rr,math.sin(ang)*rr,(rng.random()-.5)*1.2));m.leaf(p,1.15+rng.random()*.5,.65+rng.random()*.2,rng.random()*math.tau,(rng.random()-.5)*.7,2+rng.randrange(3))
  return m.finish()
 for j in range(5):
  a=j*math.tau/5;m.tube((math.cos(a)*.1,math.sin(a)*.1,.5),(math.cos(a)*.9,math.sin(a)*.9,.03),.14,.035,trunk,6)
 for j in range(6):
  a=(.13*math.sin(j*.6),.09*math.sin(j),j*1.85);b=(.13*math.sin((j+1)*.6),.09*math.sin(j+1),(j+1)*1.85);m.tube(a,b,.43*(1-j/7),.43*(1-(j+1)/7),trunk,5 if lod else 7)
 for j in range(11):
  angle=j*2.399;z=4+j*.56;reach=(2.6 if not birch else 1.7)*(1-j/17);a=Vector((0,0,z));end=Vector((math.cos(angle)*reach,math.sin(angle)*reach,z+1.8));m.tube(a,end,.095*(1-j/16),.02,trunk,4 if lod else 6)
  m.crown(end+Vector((0,0,.3)),1.95 if not birch else 1.35,2+j%3)
  for k in range(3):
   aa=angle+(k-1)*.65;tip=end+Vector((math.cos(aa)*.7,math.sin(aa)*.7,.3+k*.12));m.tube(end-Vector((0,0,.3)),tip,.024,.009,trunk,4)
   for leaf in range(6 if lod else 36):
    az=rng.random()*math.tau;rr=math.sqrt(rng.random())*.85;pos=tip+Vector((math.cos(az)*rr,math.sin(az)*rr,(rng.random()-.5)*1.05));m.leaf(pos,.9+rng.random()*.4,.5+rng.random()*.22,rng.random()*math.tau,(rng.random()-.5)*1.1,2+rng.randrange(3))
 return m.finish()
def conifer(name,lod=False):
 rng=random.Random(52);m=Mesh(name);m.tube((0,0,0),(.12,.08,13),.27,.025,0,5 if lod else 8)
 for tier in range(6 if lod else 9):
  z=2+tier*(1.7 if lod else 1.15);radius=3.1*(1-tier/(7 if lod else 10))
  for arm in range(3 if lod else 5):
   a=arm*math.tau/(3 if lod else 5)+tier*1.67;tip=Vector((math.cos(a)*radius,math.sin(a)*radius,z+.12));m.tube((0,0,z+.45),tip,.065*(1-tier/13),.012,0,4)
   # Layered real boughlets form a broken, airy silhouette, rather than solid cones.
   for j in range(2 if lod else 4):
    t=(j+1)/(3 if lod else 5);center=tip*t+Vector((0,0,z*(1-t)));size=(.85 if not lod else 1.0)*(1-tier/15)
    for side in [-1,1]:
     angle=a+side*.9;u=Vector((math.cos(angle),math.sin(angle),.1));v=Vector((-math.sin(angle),math.cos(angle),.04));base=center-u*size*.25;end=center+u*size
     for n in range(1 if lod else 2):
      p=base+(end-base)*n/3;wide=size*.38*(1-n/4);m.face([p-v*wide,p+u*size*.6+Vector((0,0,.12)),p+v*wide,p+Vector((0,0,.10))],5+(tier+n)%2)
 return m.finish()
def grass(name,fern=False,shrub=False):
 rng=random.Random(81);m=Mesh(name)
 if shrub:
  for j in range(9):
   a=j*2.399;tip=Vector((math.cos(a)*.65,math.sin(a)*.65,.6+rng.random()*.6));m.tube((0,0,0),tip,.018,.006,0,4)
   for k in range(14):m.leaf(tip+Vector(((rng.random()-.5)*.5,(rng.random()-.5)*.5,(rng.random()-.5)*.5)),.28,.14,rng.random()*math.tau,rng.random()*.6,5 if k%3 else 6)
 elif fern:
  for j in range(8):
   a=j*math.tau/8;u=Vector((math.cos(a),math.sin(a),0))
   for k in range(6):
    t=(k+1)/7;p=u*t*.85+Vector((0,0,math.sin(t*math.pi)*.48+.08));m.leaf(p,.35*(1-t*.6),.12,a+1.57,.2,9)
 else:
  for j in range(22):
   a=rng.random()*math.tau;r=rng.random()*.4;start=Vector((math.cos(a)*r,math.sin(a)*r,0));h=.3+rng.random()*.6;u=Vector((math.cos(a),math.sin(a),0));v=Vector((-math.sin(a),math.cos(a),0));mid=start+u*.10+Vector((0,0,h*.58));tip=start+u*(.12+rng.random()*.2)+Vector((0,0,h));w=.028+rng.random()*.025
   m.face([start-v*w,mid-v*w*.5,mid+v*w*.5,start+v*w],7+j%2,True);m.face([mid-v*w*.5,tip,mid+v*w*.5],7+j%2,True)
 return m.finish()
def stone(name,cliff=False):
 rng=random.Random(114 if cliff else 62);parts=[]
 if not cliff:
  bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2,radius=1);o=bpy.context.object;o.name=name
  for v in o.data.vertices:
   r=.92+rng.random()*.16;v.co.x*=r;v.co.y*=r*.87;v.co.z=(v.co.z+1)*.43*r
  o.data.materials.append(mats[10])
  for face in o.data.polygons:face.use_smooth=True
  o.select_set(False);return

 for i in range(4 if cliff else 3):
  bpy.ops.mesh.primitive_cube_add(size=1,location=((i-1)*(.38 if cliff else .25),(rng.random()-.5)*.35,0));o=bpy.context.object
  height=(2.7-i*.38 if cliff else .75+rng.random()*.3);o.scale=(.8+rng.random()*.35,1.1+rng.random()*.4,height);o.location.z=height*.5;o.rotation_euler=(rng.random()*.12,rng.random()*.14,(rng.random()-.5)*.35)
  bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
  bevel=o.modifiers.new('Weather-softened fracture edges','BEVEL');bevel.width=.07 if cliff else .1;bevel.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=bevel.name)
  o.data.materials.append(mats[10]);parts.append(o)
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();o=bpy.context.object;o.name=name
 # Apply world coordinates to the mesh and retain the same ground-centred origin.
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True);o.select_set(False)
stone('boulder');stone('cliff',True)
deciduous('oak');deciduous('oak_low',lod=True);deciduous('birch',True);deciduous('birch_low',True,True);conifer('pine');conifer('pine_low',True);grass('grass');grass('fern',fern=True);grass('shrub',shrub=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'over-the-hill/nature.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'over-the-hill/nature.glb'),export_format='GLB',export_yup=True,export_apply=True,export_materials='EXPORT',export_normals=True)
print('Original 3D model library exported')
