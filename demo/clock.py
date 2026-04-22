from datetime import datetime

def setup():
    createCanvas(400, 400)

def drawHand(s):
    """Desenha um vetor de tamanho s apontando para cima 
    a partir do ponto (0,0)"""
    h = -s+0.1
    beginShape()
    vertex(0,0)
    vertex(0,h)
    vertex(0.04,h)
    vertex(0,-s)
    vertex(-0.04,h)
    vertex(0,h)
    endShape()
    
def drawFace():
    """Desenha o fundo de um relógio de raio 1.2 centrado na origem"""
    push()
    fill('white')
    circle(0,0,2.4)
    textAlign(CENTER,CENTER)
    fill('black')
    for i in range(60):
        ang = -PI/2 + i/60*TAU
        line(cos(ang)*1.2,sin(ang)*1.2,cos(ang)*1.15,sin(ang)*1.15)
    for i in range(1,13,1):
        ang = -PI/2 + i/12*TAU
        text(str(i),cos(ang),sin(ang))
    pop()
    
def drawTime(h,m):
    """Desenha os braços do relógio para h horas e m minutos.
    h é um número inteiro entre 0 e 12 e m é um número inteiro
    entre 0 e 59."""
    push()
    rotate(radians(h*360/12 + m / 60 * 30))
    drawHand(0.7)
    pop()
    push()
    rotate(m/60*TAU)
    drawHand(0.9)
    
def draw():
    background(220)
    translate(width/2,height/2)
    scale(100)
    strokeWeight(2/100)
    fill('black')
    textSize(0.15)
    
    drawFace()
    now = datetime.now()
    drawTime(now.hour%12,now.minute)
    