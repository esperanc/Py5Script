"""
Technique described in

Dafner, Revital, Daniel Cohen-Or, and Yossi Matias. 
"Context-based space filling curves." Computer Graphics Forum. Vol. 19. No. 3. 
Oxford, UK and Boston, USA: Blackwell Publishers Ltd, 2000.
"""

from random import randint, shuffle
n = 20

def setup():
    global s, G,G2
    s = int(min(window_width, window_height)*0.9)
    create_canvas(s,s)
    G = Grid(n,n)
    G.random_st()
    G2 = G.hamiltonian()


#
# Spannning tree in a grid
#
class Grid ():
    
    def __init__(self, ncols, nrows):
        self.ncols = ncols
        self.nrows = nrows
        self.ncells = ncols*nrows
        self.grid = [False]* self.ncells
        
    def col(self,i) : return i % self.ncols
    
    def row(self,i) : return i // self.ncols
    
    def index (self, col, row) : return row * self.ncols + col
    
    def random_st (self):
        edges = []
        def visit (k):
            self.grid[k] = True
            i, j = self.col(k), self.row(k)
            neighbors = [];
            if i > 0: neighbors.append(k - 1)
            if j > 0: neighbors.append(k - self.ncols)
            if i + 1 < self.ncols: neighbors.append(k + 1)
            if j + 1 < self.nrows: neighbors.append(k + self.ncols)
            shuffle(neighbors)
            for n in neighbors:
                if not self.grid[n]:
                    edges.append ((k, n))
                    visit(n)
        visit(randint(0,self.ncells-1))
        connect = [{'left':False, 'right': False, 'up' : False, 'down' : False} 
                for _ in range(self.ncells)]
        for i,j in edges:
            if i > j: i,j = j,i
            if self.row(i) == self.row(j):
                connect[i]['right'] = connect[j]['left'] = True
            else:
                connect[i]['down'] = connect[j]['up'] = True
        self.edges = edges
        self.connect = connect
    
    def draw_edges(self, x0, y0, cell_size):
        x = lambda i : (self.col(i) + 0.5) * cell_size+x0
        y = lambda i : (self.row(i) + 0.5) * cell_size+y0
        for i,j in self.edges:
            line (x(i),y(i),x(j),y(j))
    
    def draw_path(self, x0, y0, cell_size):
        x = lambda i : (self.col(i) + 0.5) * cell_size+x0
        y = lambda i : (self.row(i) + 0.5) * cell_size+y0
        begin_shape()
        i = self.path[len(self.path)-1]
        curveVertex(x(i),y(i))
        for i in self.path:
            curveVertex (x(i),y(i))
        i = self.path[0]
        curveVertex(x(i),y(i))
        end_shape(CLOSE)

            
    def hamiltonian(self):
        g2 = Grid (self.ncols*2,self.nrows*2)
        g2.edges = []
        index2 = lambda i, dcol, drow : \
            (self.row(i) * 2 + drow) * g2.ncols + self.col(i) * 2 + dcol
        for i,cell in enumerate (self.connect):
            if cell['right']:
                g2.edges.append([index2(i, 1, 0), index2(i, 2, 0)])
                g2.edges.append([index2(i, 1, 1), index2(i, 2, 1)])
            else:
                g2.edges.append([index2(i, 1, 0), index2(i, 1, 1)])
            if not cell['left']:
                g2.edges.append([index2(i, 0, 0), index2(i, 0, 1)])
            if cell['down']:
                g2.edges.append([index2(i, 0, 1), index2(i, 0, 2)])
                g2.edges.append([index2(i, 1, 1), index2(i, 1, 2)])
            else:
                g2.edges.append([index2(i, 0, 1), index2(i, 1, 1)])
            if not cell['up']:
                g2.edges.append([index2(i, 0, 0), index2(i, 1, 0)])
        link = [[] for _ in range(g2.ncells)]
        for i,j in g2.edges:
            link[i].append(j)
            link[j].append(i)
        j = 0
        path = []
        visited = [False for _ in range(g2.ncells)];
        #for (let k = edges2.length; k > 0; k--) {
        for k in range(len(g2.edges),0,-1):
            path.append(j)
            visited[j] = True
            j = link[j][1] if visited[link[j][0]] else link[j][0]
        g2.path = path
        return g2

def draw():
    background('orange')
    d = s / n * 0.9
    margin = (s - d*n) / 2 
    #G.draw_edges(margin, margin, d)
    curveTightness(-0.4)
    no_stroke()
    fill("brown")
    G2.draw_path(margin,margin,d/2)