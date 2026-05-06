"""
Demo of "static" mode and context pairs as per py5 usage.
"""
size(400,400)
with push_matrix():
    translate(100,0)
    with begin_closed_shape():
        vertex(100,100)
        vertex(100,200)
        vertex(200,100)
with begin_closed_shape():
    vertex(100,100)
    vertex(100,200)
    vertex(200,100)
    
