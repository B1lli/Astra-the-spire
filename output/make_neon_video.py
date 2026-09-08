from PIL import Image, ImageDraw, ImageFilter
import numpy as np
import math, subprocess, pathlib

OUT = pathlib.Path(__file__).parent
W,H,FPS = 960,540,24
rng=np.random.default_rng(42)
stars=rng.uniform(-1,1,(260,3)); stars[:,2]=rng.uniform(0,1,260)
y,x=np.mgrid[0:H,0:W]
bg=np.zeros((H,W,3),dtype=np.uint8)
halo=np.exp(-((x-W/2)**2/(W*.35)**2+(y-H*.45)**2/(H*.5)**2))
for c,v in enumerate([25,9,49]): bg[:,:,c]=np.clip(v*halo+[3,3,14][c],0,255)
pipe=subprocess.Popen(['ffmpeg','-y','-f','rawvideo','-vcodec','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',str(OUT/'neon-flight.mp4')],stdin=subprocess.PIPE,stderr=subprocess.DEVNULL)
for frame in range(8*FPS):
    t=frame/FPS
    im=Image.fromarray(bg.copy()); layer=Image.new('RGB',(W,H)); d=ImageDraw.Draw(layer)
    cx,cy=W/2,H*.43
    # A striped sunset over a luminous perspective grid.
    r=91+3*math.sin(t*.8)
    for sy in range(int(cy-r),int(cy+r)):
        dy=(sy-cy)/r
        if dy>.1 and (sy-int(cy))%14>8: continue
        half=r*math.sqrt(max(0,1-dy*dy))
        d.line((cx-half,sy,cx+half,sy),fill=(255,int(115-65*dy),int(108+95*dy)),width=1)
    horizon=345
    for j in range(-14,15):
        d.line((cx+j*10,horizon,cx+j*110,H),fill=(74,34,152),width=1)
    for j in range(16):
        p=((j/16+t*.13)%1)**2
        yy=horizon+(H-horizon)*p
        d.line((0,yy,W,yy),fill=(int(80+100*p),30,int(140+100*p)),width=1)
    for sx,sy,sz in stars:
        z=(sz-t*.11)%1+.07
        px=cx+sx*W*.38/z; py=cy+sy*H*.4/z
        if not(0<px<W and 0<py<H): continue
        b=int(90+165*(1-min(z,1)))
        tail=1+.012/z
        d.line((px,py,cx+(px-cx)*tail,cy+(py-cy)*tail),fill=(b//2,b,b),width=1 if z>.45 else 2)
    # A tiny spacecraft banks through the stars.
    shipx=cx+160*math.sin(t*.75); shipy=365+22*math.sin(t*1.3)
    d.polygon([(shipx,shipy-16),(shipx-29,shipy+12),(shipx,shipy+5),(shipx+29,shipy+12)],fill=(116,208,244))
    d.polygon([(shipx,shipy-9),(shipx-6,shipy+3),(shipx+6,shipy+3)],fill=(29,40,83))
    flame=22+9*math.sin(t*33)
    d.polygon([(shipx-5,shipy+8),(shipx,shipy+flame),(shipx+5,shipy+8)],fill=(255,99,192))
    glow=layer.filter(ImageFilter.GaussianBlur(9))
    im=Image.fromarray(np.clip(np.asarray(im,dtype=np.uint16)+np.asarray(glow,dtype=np.uint16)*2+np.asarray(layer,dtype=np.uint16),0,255).astype('uint8'))
    if frame==72: im.save(OUT/'neon-flight-preview.jpg')
    pipe.stdin.write(im.tobytes())
pipe.stdin.close()
assert pipe.wait()==0
print(OUT/'neon-flight.mp4')
