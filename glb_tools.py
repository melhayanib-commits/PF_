"""Utilidades GLB (solo librería estándar + Pillow/numpy). Uso:
  python3 tools/glb_tools.py compare ORIGINAL.glb LIGERO.glb
  python3 tools/glb_tools.py shrink ENTRADA.glb SALIDA.glb 512
"""
import struct, json, io, sys, hashlib
from PIL import Image

def read_glb(path):
    with open(path, 'rb') as f:
        magic, ver, total = struct.unpack('<III', f.read(12))
        assert magic == 0x46546C67, 'no es GLB'
        jl, jt = struct.unpack('<II', f.read(8)); j = json.loads(f.read(jl))
        bl, bt = struct.unpack('<II', f.read(8)); b = f.read(bl)
    return j, b

def view_bytes(j, b, i):
    v = j['bufferViews'][i]; o = v.get('byteOffset', 0); return b[o:o+v['byteLength']]

def image_view_ids(j): return {im['bufferView'] for im in j['images']}

def compare(a, b):
    ja, ba = read_glb(a); jb, bb = read_glb(b); ok = True
    for key in ('meshes', 'nodes', 'skins', 'materials', 'animations', 'accessors', 'scenes'):
        same = json.dumps(ja.get(key), sort_keys=True) == json.dumps(jb.get(key), sort_keys=True)
        print(f'  JSON {key:11s} idéntico: {same}'); ok &= same or key == 'materials'
    img_a, img_b = image_view_ids(ja), image_view_ids(jb)
    nonimg = [i for i in range(len(ja['bufferViews'])) if i not in img_a]
    diff = [i for i in nonimg if hashlib.md5(view_bytes(ja, ba, i)).digest() != hashlib.md5(view_bytes(jb, bb, i)).digest()]
    print(f'  bufferViews no-imagen: {len(nonimg)}, distintos: {len(diff)} (geometría/huesos/animación)'); ok &= not diff
    print('  materiales (JSON) idénticos:', json.dumps(ja['materials'], sort_keys=True) == json.dumps(jb['materials'], sort_keys=True))
    print('  texturas:', len(ja['textures']), 'vs', len(jb['textures']))
    return ok

def shrink(src, dst, size):
    j, b = read_glb(src); out = bytearray(); newviews = []
    img_views = image_view_ids(j)
    for i, v in enumerate(j['bufferViews']):
        data = view_bytes(j, b, i)
        if i in img_views:
            im = Image.open(io.BytesIO(data)); w, h = im.size
            flat = im.convert('RGBA').resize((4, 4)).getcolors() and len(set(im.convert('RGB').resize((32, 32)).getdata())) <= 2
            tgt = 4 if flat else min(size, w)
            im2 = im.convert('RGBA' if im.mode in ('P', 'RGBA', 'LA') else 'RGB').resize((tgt, tgt), Image.LANCZOS)
            buf = io.BytesIO()
            if im2.mode == 'RGB' and not flat: im2.save(buf, 'JPEG', quality=88, optimize=True); mime = 'image/jpeg'
            else: im2.save(buf, 'PNG', optimize=True); mime = 'image/png'
            data = buf.getvalue()
            for img in j['images']:
                if img['bufferView'] == i: img['mimeType'] = mime
        while len(out) % 4: out.append(0)
        nv = dict(v); nv['byteOffset'] = len(out); nv['byteLength'] = len(data); out += data; newviews.append(nv)
    while len(out) % 4: out.append(0)
    j['bufferViews'] = newviews; j['buffers'][0]['byteLength'] = len(out)
    js = json.dumps(j, separators=(',', ':')).encode()
    while len(js) % 4: js += b' '
    with open(dst, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(out)))
        f.write(struct.pack('<II', len(js), 0x4E4F534A)); f.write(js)
        f.write(struct.pack('<II', len(out), 0x004E4942)); f.write(out)

if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'compare': print('EQUIVALENTE' if compare(sys.argv[2], sys.argv[3]) else 'DIFERENTE')
    elif cmd == 'shrink': shrink(sys.argv[2], sys.argv[3], int(sys.argv[4]))
