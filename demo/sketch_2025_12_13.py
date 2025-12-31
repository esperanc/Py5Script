"""
Alexandre Villares
Sketch a day for 12/13/2025 ported to Py5Script
See https://github.com/villares/sketch-a-day/tree/main/2025/sketch_2025_12_13
"""

def setup():
    createCanvas(800, 800)
    background (255)
    stroke_weight(1)
    ww = 80
    w = ww - 40
    n = height // w
    for i in range(0, n):
        y = i * ww
        for x in range(-w, width, 4):
            r = P5.random(-10 * i / 300, 10 * i / 300)
            if i % 2 == 0:
                stroke(P5.random(128), 0, 0)
            else:
                stroke(0, 0, P5.random(128))
            line(x, y + r, x + w, y + w -r)
    for j in range(0, n):
        x = j * ww
        for y in range(-w + 2, height, 4):
            r = P5.random(-10 * j / 300, 10 * j / 300)
            if j % 2 == 0:
                stroke(P5.random(128), 0, 0)
            else:
                stroke(0, 0, P5.random(128))
            line(
                x + r, y, x + w -r, y + w)
        stroke(240, 240, 0)
        for y in range(-w + 2, height, 4):
            line(x + w / 2 - 2,
                     y ,
                     x + w / 2 - 2 + 4,
                     y + 4 )
    for i in range(0, n):
        y = i * ww
        stroke(240, 240, 0)
        for x in range(-w, width, 4):
            line(x,
                     y + w / 2 - 2,
                     x + 4,
                     y + w / 2 - 2 + 4)

    save('out.png')
