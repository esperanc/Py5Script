rand = P5.random

def setup():
    createCanvas(windowWidth, windowHeight, WEBGL)
    s = min(width,height)*0.4
    global geom
    beginGeometry()
    for i in range(50):
        push()
        translate(rand(-s,s),rand(-s,s),rand(-s,s))
        sphere(s/8)
        pop()
    geom = endGeometry()

def draw():
    background('darkgreen')
    orbitControl()
    model(geom)
