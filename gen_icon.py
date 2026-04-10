import base64
from PIL import Image, ImageDraw, ImageFont

# Create a 32x32 image with transparent background
img = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Draw a terminal box outline
draw.rounded_rectangle([(2, 4), (30, 28)], radius=4, outline=(0, 0, 0, 255), width=3)

# Draw '>_'
draw.line([(8, 10), (14, 16), (8, 22)], fill=(0, 0, 0, 255), width=3)
draw.line([(16, 22), (24, 22)], fill=(0, 0, 0, 255), width=3)

img.save('tray.png')

with open('tray.png', 'rb') as f:
    b64 = base64.b64encode(f.read()).decode('utf-8')
    print(b64)
