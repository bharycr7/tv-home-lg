#!/usr/bin/env python3
"""Turn a photo into a My Favourites cut-out (transparent background + black-and-white copy).
Usage:  pip install "rembg[cpu]" pillow
        python3 tools/make-cutout.py photo.jpg fav1
Writes app/img/cast/cast_fav1.png and cast_fav1_bw.png."""
import sys, os
from PIL import Image, ImageOps
from rembg import remove, new_session
src, name = sys.argv[1], sys.argv[2]
out = remove(Image.open(src).convert("RGB"), session=new_session("u2net_human_seg"), post_process_mask=True)
out = out.crop(out.getbbox())
if out.height > 1100: out = out.resize((round(out.width * 1100 / out.height), 1100), Image.LANCZOS)
d = os.path.join(os.path.dirname(__file__), "..", "app", "img", "cast")
out.save(os.path.join(d, f"cast_{name}.png"))
g = ImageOps.grayscale(out.convert("RGB")).convert("RGBA"); g.putalpha(out.getchannel("A"))
g.save(os.path.join(d, f"cast_{name}_bw.png"))
print("Saved", f"cast_{name}.png")
