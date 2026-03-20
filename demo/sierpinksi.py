def setup():
    tam = min(windowWidth, windowHeight) * 0.9
    createCanvas(tam, tam)
    recursivo (0, 0, tam, 5)

def recursivo (x,y,tam,n):
    if n == 0: 
        rect (x,y,tam)
    else:
        tam /= 2
        recursivo(x,y,tam,n-1)
        recursivo(x,y+tam,tam,n-1)
        recursivo(x+tam,y,tam,n-1)