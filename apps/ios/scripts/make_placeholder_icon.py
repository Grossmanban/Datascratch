"""Draws the placeholder app icon ("Quiet paper": warm paper, ink stroke).

Run once; the PNGs are committed. Replace with the real icon later (D-24).
"""
import math
import sys
from PIL import Image, ImageDraw, ImageFilter

def draw(path, paper, ink, accent):
    s = 1024
    img = Image.new("RGB", (s, s), paper)
    d = ImageDraw.Draw(img)
    # ruled lines, like a notebook page
    for y in range(300, 820, 104):
        d.line([(170, y), (854, y)], fill=tuple(max(0, c - 18) for c in paper), width=6)
    # a handwritten-looking underline stroke
    pts = []
    for i in range(0, 101):
        t = i / 100
        x = 190 + t * 640
        y = 600 + math.sin(t * math.pi * 1.6) * 34 - t * 40
        pts.append((x, y))
    for w, col in ((46, accent),):
        d.line(pts, fill=col, width=w, joint="curve")
    # "D" glyph-like ink loop
    d.rounded_rectangle([300, 250, 560, 520], radius=130, outline=ink, width=40)
    img = img.filter(ImageFilter.SMOOTH)
    img.save(path)

out = sys.argv[1]
draw(f"{out}/AppIcon.png", (250, 248, 244), (29, 28, 26), (46, 91, 219))
draw(f"{out}/AppIcon-Dark.png", (26, 25, 23), (236, 233, 227), (123, 155, 255))
