def setup():
    size(400, 400) # Synonym for createCanvas

def draw():
    if is_mouse_pressed: # Synonym for mouse_is_pressed
        circle (mouse_x, mouse_y, 10)
    if is_key_pressed: # Synonym for key_is_pressed
        square(mouse_x, mouse_y, 10)
        