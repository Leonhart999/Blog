"""Build an SVG symbol sprite from game-icons.net SVGs (CC BY 3.0).

Usage: python -I build-icons.py <icons dir> <out sprite.svg> name=file.svg ...
Only the <path d="..."> data is taken over; the black background square of
each source icon is dropped and fills are left to currentColor.
"""
import re
import sys
from pathlib import Path

src, out, *pairs = sys.argv[1:]
symbols = []
for pair in pairs:
    name, file = pair.split('=', 1)
    text = (Path(src) / file).read_text(encoding='utf-8')
    paths = re.findall(r'<path[^>]*\sd="([^"]+)"', text)
    paths = [d for d in paths if d.strip() != 'M0 0h512v512H0z']
    if not paths:
        raise SystemExit(f'no paths in {file}')
    for d in paths:
        if not re.fullmatch(r'[0-9MmLlHhVvCcSsQqTtAaZz.,\-\s]+', d):
            raise SystemExit(f'unexpected path data in {file}')
    body = ''.join(f'<path d="{d}"/>' for d in paths)
    symbols.append(f'<symbol id="i-{name}" viewBox="0 0 512 512">{body}</symbol>')
sprite = '<svg xmlns="http://www.w3.org/2000/svg" style="display:none">' + ''.join(symbols) + '</svg>\n'
Path(out).write_text(sprite, encoding='utf-8')
print(len(symbols), 'icons ->', out, len(sprite), 'bytes')
