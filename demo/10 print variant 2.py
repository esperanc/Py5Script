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
            if r < 1/4:
                line (x,y,x+cell/2,y+cell/2)
                line (x+cell/2,y+cell/2,x+cell,y)
            elif r < 2/4:
                line (x+cell,y,x+cell/2,y+cell/2)
                line (x+cell/2,y+cell/2,x+cell,y+cell)
            elif r < 3/4:
                line (x+cell,y+cell,x+cell/2,y+cell/2)
                line (x+cell/2,y+cell/2,x,y+cell)
            else:
                line (x,y+cell,x+cell/2,y+cell/2)
                line (x+cell/2,y+cell/2,x,y)
    