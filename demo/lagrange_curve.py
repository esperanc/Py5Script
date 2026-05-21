"""
Interactive demonstration of Lagrange Curves.
Drag control points to adjust curve.
Click and drag to add another control point (and increase curve degree).
Click on control point to remove it.
"""

from math import comb, pow, isclose

def lagrange_uniform_blending(t, n, t_min=0.0, t_max=1.0):
    """
    Lagrange blending for 'n' nodes uniformly spaced in range [t_min, t_max]
    """
    # Trivial case
    if n == 1: return [1.0]
    
    # Uniformly spaced nodes
    t_nodes = [t_min + i * (t_max - t_min) / (n - 1) for i in range(n)]
    
    # Check whether 't' coincides with a node 
    for i in range(n):
        if isclose(t, t_nodes[i], abs_tol=1e-9):
            L = [0.0] * n
            L[i] = 1.0
            return L
            
    # Simplified barycentric form
    terms = []
    for i in range(n):
        sign = 1 if (n - 1 - i) % 2 == 0 else -1
        
        w_i = sign * comb(n - 1, i)
        
        terms.append(w_i / (t - t_nodes[i]))
        
    # Normalization
    sum_terms = sum(terms)
    return [term / sum_terms for term in terms]
    

    
def setup():
    global pts
    create_canvas(windowWidth, windowHeight)
    w,h = width,height
    pts = [[w*0.2,h*0.8],
           [w*0.4,h*0.2],
           [w*0.6,h*0.2],
           [w*0.8,h*0.8]]

def mouse_pressed():
    global selected, pts, moved
    selected = None
    if mouse_button != LEFT: return
    moved = False
    for p in pts:
        x, y = p
        if dist(x,y,mouse_x, mouse_y) < 10:
            selected = p
    if not selected:
        j = -1
        min_d = 1e10
        p = [mouse_x, mouse_y]
        n = len(pts)
        #k = n+1 if gui.closed else n
        k = n
        for i in range (1,k):
            d = dist_segment (p, pts[i-1], pts[i%n])
            if d < min_d:
                min_d = d
                j = i
        pts = pts[:j] + [p] + pts[j:]
        selected = pts[j]

def mouse_released():
    global selected, pts
    if selected and not moved:
        pts.remove(selected)
            
def mouse_dragged():
    global selected, moved
    if selected:
        moved = True
        p = selected
        p[0]+=mouse_x-pmouse_x
        p[1]+=mouse_y-pmouse_y

def dist_segment (p, a, b):
    p = create_vector (*p)
    a = create_vector (*a)
    b = create_vector (*b)
    v = b.copy().sub(a)
    u = p.copy().sub(a)
    vlen = v.mag()
    vnorm = v.copy().normalize()
    proj_size = vnorm.dot(u)
    if proj_size > vlen: return p.dist(b)
    if proj_size < 0: return p.dist(a)
    return p.sub(a.lerp(b, proj_size / vlen)).mag()
    
def draw():
    background(245)
    global pts
    
    push()
    stroke_weight(2)
    n = len(pts)
    begin_shape()
    for i in range(100):
        t = i / 99
        p = createVector(0,0)
        L = lagrange_uniform_blending(t, n)
        for (x,y),l in zip(pts,L):
            p.add(createVector(x*l,y*l))
        vertex(p.x,p.y)
    end_shape()
    pop()
    
    push()
    stroke_weight(1)
    no_fill()
    drawingContext.setLineDash([2, 5]);
    begin_shape()
    for x,y in pts: vertex(x,y)
    end_shape()
    pop()
    
    for x,y in pts:
        circle (x, y, 10, 10)
        
    
    
    
