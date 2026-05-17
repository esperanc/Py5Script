"""
A demo of the Bresenham scan conversion algorithm for line segments.
Drag the circles to set the segment endpoints.
"""

def bresenham(qx,qy,rx,ry):
    """Scan convert line from qx,qy to rx,ry by generating x,y coords.
    Assumes line has slope between 0 and 1. 
    Generates x,y coordinates
    """
    # Make sure the line is in the first octant
    assert (rx>=qx and ry>=qy and ry-qy <= rx-qx)
    dx = rx - qx
    dy = ry - qy
    A = dy+dy
    B = A-dx-dx
    D = A-dx
    y = qy
    x = qx
    while x<=rx:
        yield x,y
        if D <= 0:
            D += A
        else:
            D += B
            y += 1
        x += 1

def scan_convert(qx,qy,rx,ry):
    """Scan converts a line from qx,qy to rx,ry by generating x,y coords.
    Uses the Bresenham algorithm.
    """
    if abs(rx-qx) < abs(ry-qy):
        qx,qy,rx,ry = qy,qx,ry,rx
        if rx < qx : qx,qy,rx,ry = rx,ry,qx,qy
        if ry < qy:
            ry,qy = -ry,-qy
            for x,y in bresenham(qx,qy,rx,ry): yield -y,x
        else:
            for x,y in bresenham(qx,qy,rx,ry): yield y,x
    else:
        if rx < qx : qx,qy,rx,ry = rx,ry,qx,qy
        if ry < qy:
            ry,qy = -ry,-qy
            for x,y in bresenham(qx,qy,rx,ry): yield x,-y
        else:
            for x,y in bresenham(qx,qy,rx,ry): yield x,y

def mouse_pressed():
    x,y = mouse_x // pixel_size, mouse_y // pixel_size
    global pts, selected
    selected = None
    for p in pts:
        if dist(x,y,*p)<=2: selected = p

def mouse_dragged():
    x,y = mouse_x // pixel_size, mouse_y // pixel_size
    global pts, selected
    if selected: selected[:] = [x,y]
    
def setup():
    createCanvas(600, 600)
    global pixel_size, pts
    pixel_size = 10
    pts = [20,20],[40,40]

def draw():
    background(220)
    fill('white')
    for x,y in pts:
        circle (x*pixel_size,
                y*pixel_size, pixel_size*2)
    fill ('black')
    for x,y in scan_convert(*pts[0],*pts[1]):
        square(x*pixel_size-pixel_size/2,
               y*pixel_size-pixel_size/2,
               pixel_size)