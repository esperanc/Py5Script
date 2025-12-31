"""
Use of callbacks using proxies.
(From https://p5js.org/reference/p5/changed/)
"""

def setup():
  createCanvas(100, 100)

  background(200)

  # Create a checkbox and place it beneath the canvas.
  global checkbox
  checkbox = createCheckbox(' circle');
  checkbox.position(0, 100);

  # Call repaint() when the checkbox changes.
  from pyodide.ffi import create_proxy
  repaint_proxy = create_proxy(lambda event: repaint())
  checkbox.changed(repaint_proxy)


# Paint the background gray and determine whether to draw a circle.
def repaint():
  background(200);
  if checkbox.checked(): 
      circle(50, 50, 30)
