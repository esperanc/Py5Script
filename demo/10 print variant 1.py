cell = 20
random = P5.random

def setup():
    createCanvas(windowWidth, windowHeight)
    background (255)
    nx = width // cell
    ny = height // cell
    strokeWeight (cell/10)
    for i in range(nx):
        x = i * cell
        for j in range(ny):
            y = j * cell
            r = random()
            if r <2/3:
                line (x,y,x+cell,y+cell)
            if r > 1/3:
                line (x+cell,y,x,y+cell)
    