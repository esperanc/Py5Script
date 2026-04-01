batch = 10
delta = deltaMax = 0

def setup():
    global R, curveDrawing
    createCanvas(windowWidth, windowHeight);
    R = min(width, height) / 2
    curveDrawing = createGraphics(width, height)
    curveDrawing.translate(width / 2, height / 2)
    curveDrawing.strokeWeight(2)
    generate()


def mousePressed() :
    global delta
    if delta < deltaMax: 
        delta = deltaMax
    else:
        generate()

def generate():
    global teeth1, teeth2, delta, deltaMax, pace, r1, r2, r3, qprev
    
    teeth1 = floor(P5.random(80, 200))
    teeth2 = floor(P5.random(0.2, 0.8) * teeth1)
    lcm = teeth1 * teeth2 / gcd(teeth1, teeth2)
    fullTurns = lcm / teeth1
    
    r1 = R * 0.8;
    r2 = r1 * teeth2 / teeth1
    r3 = r2 * P5.random(0.5, 1)
    
    deltaMax = r1 * TAU * fullTurns

    delta = 0
    p, c, q = twoCircles(r1, r2, r3, delta);
    pace = r1 * TAU / 360
    qprev = q
    curveDrawing.clear()


def twoCircles(r1, r2, r3, delta):
    perim1 = r1 * TAU
    perim2 = r2 * TAU;
    ang1 = (delta % perim1) / r1;
    ang2 = (delta % perim2) / r2;
    p = createVector(r1, 0).rotate(ang1)
    c = p.copy().setMag(r1 - r2);
    q = c.copy().add(createVector(r3, 0).rotate(ang1 - ang2))
    return p, c, q


def gcd(a, b):
    while a != b:
        if a > b:
        	a -= b
        else:
            b -= a
    return a;

def draw():
    global delta, batch, qprev
    background(220);
    textSize(20)
    textAlign(CENTER)
    completed = delta / deltaMax * 100
    if delta >= deltaMax:
    	text (f"Click for \nanother", 100, 50)
    	image(curveDrawing, 0, 0)
    	return
    
    text (f"{completed:.1f} % complete\n(click to stop)", 100, 50)
    batch = floor(P5.map(abs(50-completed)**2, 50**2, 0, 5, 50))
    for i in range(batch):
    	delta += pace
    	p, c, q = twoCircles(r1, r2, r3, delta)
    	curveDrawing.line(qprev.x, qprev.y, q.x, q.y)
    	qprev = q
    
    image(curveDrawing, 0, 0)
    translate(width / 2, height / 2);
    noFill();
    p, c, q = twoCircles(r1, r2, r3, delta)
    circle(0, 0, r1 * 2);
    fill (255,40)
    circle(c.x, c.y, r2 * 2);
    fill('black');
    circle(p.x, p.y, 5);
    circle(q.x, q.y, 5);
