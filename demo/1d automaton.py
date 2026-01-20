rule = 30 # Try others!
n = 100
from random import randint

def setup():
    createCanvas(600, 600)
    inicia()
    
def inicia():
    global celulas, geracao, tam
    tam = width/n
    celulas = [0]*n
    celulas[n//2] = 1
    noStroke()
    clear()
    geracao = 0
    
def draw():
    global celulas, geracao
    desenha_geracao()
    celulas = proxima()
    geracao = geracao+1
    if geracao == n: 
        img = get()
        image (img, 0, -tam)
        geracao -= 1
        
def keyPressed():
    global rule
    rule = randint(0,255)
    print (rule)
    inicia()
    
def desenha_geracao():
    y = geracao*tam
    x = 0
    for cel in celulas:
        if cel: fill ('black')
        else: fill('white')
        square (x,y,tam)
        x += tam

def bit (n,i):
    return int (((1 << i) & n) > 0)

def bin(a,b,c):
    return a*4+b*2+c
    
def proxima ():
    r = [0]*n
    for i in range(n):
        a,b,c = celulas[(i-1+n)%n], celulas[i], celulas[(i+1)%n]
        r[i] = bit(rule,bin(a,b,c))
    return r