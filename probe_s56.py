from PIL import Image
import os

base = r'C:\Users\37549\Desktop\Vibe Coding\useful\Pot\spore-promo\public\textures'
im = Image.open(os.path.join(base, 'ext-review-default.png')).convert('RGB')
px = im.load()

def css(x, y):
    return px[x * 2, y * 2]

pts = [
    ('rail bg left of pink row', 12, 185),
    ('pink row left edge?', 32, 185),
    ('pink row mid', 150, 185),
    ('normal row (定积分) left', 12, 245),
    ('normal row (定积分) x32', 32, 245),
    ('normal row (定积分) x150', 150, 245),
    ('rail right edge x275', 275, 245),
    ('gap between rows y225', 150, 225),
    ('subject header x12 y130', 12, 130),
    ('subject header x150 y130', 150, 130),
]
for name, x, y in pts:
    print('%-32s (%3d,%3d) = %s' % (name, x, y, css(x, y)))
