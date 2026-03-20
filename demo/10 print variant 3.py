cell = 20
random = P5.random

def setup():
    createCanvas(windowWidth, windowHeight)
    background (255)
    nx = width // cell
    ny = height // cell
    strokeWeight (cell/10)
    noFill()
    for i in range(nx):
        x = i * cell
        for j in range(ny):
            y = j * cell
            r = random()
            if r < 1/2:
                arc (x,y,cell,cell,0,PI/2)
                arc (x+cell,y+cell,cell,cell,PI,3*PI/2)
            else:
                arc (x+cell,y,cell,cell,PI/2,PI)
                arc (x,y+cell,cell,cell,3*PI/2,2*PI)
    