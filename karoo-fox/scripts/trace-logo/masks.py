"""Colour-layer masks for tracing the Karoo Fox logo from the original artwork.

Usage: python3 scripts/trace-logo/masks.py src/brand/original/karoo-fox-logo-original.jpg <work-dir>
Then:  node scripts/trace-logo/trace.cjs <work-dir> src/brand/fox-mark.svg && npm run brand
Needs Python 3 with numpy, scipy and Pillow. The crop below is the fox in the 1536×1024 original.
"""
import numpy as np
from PIL import Image
from scipy import ndimage as nd
import os, sys
src, out = os.path.abspath(sys.argv[1]), sys.argv[2]
os.makedirs(out, exist_ok=True)
os.chdir(out)
im=Image.open(src).convert('RGB').crop((520,125,1025,745))
S=3
a=np.asarray(im.resize((im.width*S,im.height*S),Image.LANCZOS),dtype=np.float32).copy()
a[598*S:,400*S:]=254  # drop the top of the wordmark 'F'
groups={'white':[(254,254,254),(250,252,252)],'cream':[(251,244,235),(253,248,242)],'shade':[(232,219,206)],'navy':[(10,30,60),(20,40,70)],
        'orange':[(249,90,12),(235,75,9),(226,56,10),(190,48,14),(240,110,60)]}
names=list(groups)
d=np.stack([np.min([np.sum((a-np.array(c))**2,axis=2) for c in cs],axis=0) for cs in groups.values()])
lab=np.argmin(d,axis=0)
# soft majority smoothing of group labels
soft=np.stack([nd.gaussian_filter((lab==i).astype(np.float32),2.2) for i in range(len(names))])
g=np.argmax(soft,axis=0)
G={n:(g==i) for i,n in enumerate(names)}
ink=nd.gaussian_filter(255-a.min(axis=2),2.0)
creamlike=nd.binary_opening(G['cream']&(ink>9),iterations=10)
sil=(ink>34)|creamlike
# The tail's cream sweep runs out to the edge at the bottom left; close it there only.
region=np.zeros_like(sil); region[440*S:, :330*S]=True
sil=sil|(nd.binary_closing(sil,iterations=14)&region)
filled=nd.binary_fill_holes(sil)
holes=filled&~sil
sil=filled
# orange darkness levels from green channel, smoothed heavily within orange
orange=G['orange']
green=nd.gaussian_filter(np.where(orange,a[...,1],np.nan_to_num(0)),10)
w=nd.gaussian_filter(orange.astype(np.float32),10)+1e-6
gm=green/w
red=nd.gaussian_filter(np.where(orange,a[...,0],0),10)/w
grow=lambda m: nd.binary_dilation(m,iterations=4)&sil
levels={'o1':grow(orange&(gm<82)),'o2':grow(orange&(gm<64)),'o3':grow(orange&(red<210))}
def save(name,m,thr=0.5,sigma=2.5):
  sm=nd.gaussian_filter(m.astype(np.float32),sigma)>thr
  Image.fromarray(np.where(sm,0,255).astype(np.uint8)).save(f'mask_{name}.png')
save('sil',sil,0.5,1.5)
for k,v in levels.items(): save(k,v)
core=nd.binary_erosion(sil,iterations=6)
save('cream',((G['cream']|G['white'])&core)|holes); save('shade',G['shade']&core); save('navy',G['navy'])
print({k:int(v.sum()) for k,v in G.items()})
# Split navy into named features (for animation): label connected components.
nav=np.asarray(Image.open('mask_navy.png'))==0
lab_n,count=nd.label(nav)
H_,W_=nav.shape
parts={}
for i in range(1,count+1):
  ys,xs=np.nonzero(lab_n==i)
  if len(xs)<200: continue
  cx,cy=xs.mean()/S,ys.mean()/S  # in original-crop pixels
  if cy<120: name='ear-left-edge' if cx<250 else 'ear-right-inner'
  elif cy<210 and cx<380: name='eye'
  elif cy<210: name='eye-far'
  elif cy<280: name='nose'
  else: name='chest-navy'
  parts[name]=parts.get(name,np.zeros_like(nav))|(lab_n==i)
for n,m in parts.items():
  Image.fromarray(np.where(m,0,255).astype(np.uint8)).save(f'mask_navy_{n}.png')
print(sorted(parts))
