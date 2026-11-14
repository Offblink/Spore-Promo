# -*- coding: utf-8 -*-
"""列出 public/textures 下每张 PNG 的实际像素尺寸 + md5（只读，给报告贴证据用）。"""
import glob
import hashlib
import os
from pathlib import Path

from PIL import Image

TEX = Path(__file__).resolve().parent.parent / "public" / "textures"
for p in sorted(glob.glob(str(TEX / "*.png"))):
    with Image.open(p) as im:
        w, h = im.size
        dpi = im.info.get("dpi")
    md5 = hashlib.md5(open(p, "rb").read()).hexdigest()[:10]
    print("%-28s %5dx%-5d dpi=%-12s md5=%s" % (os.path.basename(p), w, h, dpi, md5))
