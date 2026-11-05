"""Split a tall screenshot into half-scale parts: python -I split.py in.png prefix [part_height]"""
import sys
from PIL import Image
src, prefix = sys.argv[1], sys.argv[2]
ph = int(sys.argv[3]) if len(sys.argv) > 3 else 1800
im = Image.open(src)
w, h = im.size
for i in range((h + ph - 1) // ph):
    part = im.crop((0, i * ph, w, min(h, (i + 1) * ph)))
    part.resize((part.width // 2, part.height // 2)).save(f'{prefix}{i}.png')
print(w, h)
