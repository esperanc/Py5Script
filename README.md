# Py5Script IDE

A web-based IDE for running [p5.js](https://p5js.org/) sketches using Python, powered by [PyScript](https://pyscript.net/). This project allows you to write standard Python code that interacts with the p5.js library, with automatic handling of the p5 instance context.

## Interface Overview

The IDE provides a clean interface for coding, managing files, and running sketches.

### Toolbar Controls
- **▶️ (Run)**: Executes the current sketch in the preview panel.
- **↗️ (View)**: Opens the current project in the separate **Viewer Mode** (`view.html`). This effectively saves your changes and opens a clean, full-screen runner in a new tab.
- **⏹️ (Stop)**: Stops the running sketch and resets the preview.
- **📄 New**: Creates a fresh, empty project with a unique ID.
- **📂 Open**: Opens a modal list of all your locally saved projects to switch between.
- **💾 Download**: Exports the project to your computer.
    - **Single File (`.py`)**: If the project (text-only) contains only `sketch.py`, it downloads as `[ProjectName].py`.
    - **Full Project (`.zip`)**: If you have multiple files or binary assets, it downloads `[ProjectName].zip`.
- **⬆ Upload (Header)**: Imports a `.zip` or `.py` file as a **NEW** project, redirecting you to it.
- **🔗 Share**: Generates a shareable URL.
    - **Single File**: Uses `?code=` with LZString compression (short and clean).
    - **Multi-File**: Uses `?zip=` with Base64+LZString compression (supports images, shaders, etc.).
- **⚙️ Settings**: Customizes the editor experience (Theme, Font Size, Tabs, whitespace).

### File Management & Assets
The sidebar on the left displays all files in your current project, including code and assets
- **Files**: Listing of all code and asset files.
- **sketch.py**: The main entry point.
- **Add File (+)**: Create new python modules or shader files (`.vert`, `.frag`, `.glsl`).
- **Upload File (Sidebar ⬆)**: Upload images, data, or scripts **into the current project**.
- **Viewing**: Click a file to view/edit it. (Binary files like images are read-only placeholders).

### Project Management & Storage
- **Local Storage**: All projects are stored in your browser's `localStorage` using unique IDs (e.g., `project_my-cool-sketch_files`).
- **Persistence**: Changes are auto-saved to local storage as you type (debounced). Use the "Download" button to export your project to your computer.
- **Listing**: The "Open" button reads the registry of all saved projects so you can switch between them.

## How It Works

### Python & p5.js Integration
This IDE simplifies writing p5.js sketches in Python by abstracting away the global vs. instance mode distinction.

1.  **P5 Instance**: The system instantiates p5.js in "instance mode".
2.  **Instance Naming**: The instance is named `P5` to avoid conflicting with the global `p5` object.
3.  **Global p5**: The standard `p5` object is used for static classes (e.g., `p5.Vector`, `p5.Image`, `p5.TWO_PI`).
4.  **Automatic Hydration**: Your project files (code and assets) are automatically made available to the Python environment via a virtual file system. 
    - You can use python's `open("data.txt")` or p5's `P5.loadImage("img.png")` directly.
5.  **AST Analysis**: Python code is analyzed to auto-prefix p5 functions.
    - `rect(10, 10, 50, 50)` -> `P5.rect(10, 10, 50, 50)`
    - `print("Hello")` -> `print("Hello")` (Python built-in)

## Asset Management
You can upload assets (images, fonts, shaders, CSVs) via the sidebar. These are stored as Base64 Data URLs within your project data.
- **Python**: `open("data.txt")` works as expected.
- **p5.js**: `P5.loadImage("cat.png")` works as expected (the system intercepts the call and provides the stored data).
- **Shaders**: You can create `.vert` and `.frag` files and load them using `P5.loadShader("shader.vert", "shader.frag")`.

### Snake Case Support
You can optionally write p5.js code using `snake_case`. The IDE automatically converts it to `camelCase`.
- `create_canvas(400, 400)` -> `P5.createCanvas(400, 400)`
- `def mouse_pressed():` -> registers `mousePressed`

### Python & JavaScript Interoperability

Since Py5Script runs Python (via Pyodide) alongside p5.js (JavaScript), there are some important considerations when passing data between them.

#### 1. Naming Collisions (Random & Logic)
Some p5.js functions conflict with Python standard libraries or built-ins. To avoid issues, these have been excluded from auto-prefixing, meaning you must access them explicitly via the `P5` instance if you want the p5 version.

*   **`random` vs `P5.random`**:
    *   `import random`: Use Python's standard `random` module for logic.
    *   `P5.random(0, 255)`: Use p5's random for visual noise or drawing.
*   **`map`, `set`, `min`, `max`**: These default to Python's built-in versions. Use `P5.map(...)` for the p5 range mapping function.

#### 2. Data Structures (Lists vs Arrays)
Avoid passing Python lists directly to p5 functions that expect to modify them in-place, such as `P5.shuffle()`.

*   **Bad**: `P5.shuffle(my_python_list)` (May cause errors or return wrapped proxies).
*   **Good**: use `random.shuffle(my_python_list)` (Native Python).
*   **Good**: If you *must* pass a list to a JS library, convert it:
    ```python
    from pyodide.ffi import to_js
    js_array = to_js(my_python_list)
    P5.someFunc(js_array)
    ```

#### 3. Numpy & Types
Numpy scalars (e.g. `np.float64`) are passed as temporary proxies to JavaScript. If p5 stores these (like `vertex()` does before `end_shape()`), the proxy might be destroyed before p5 uses it, causing a `borrowed proxy was automatically destroyed` error.

*   **Fix**: Cast to native Python types before passing to p5.
    ```python
    # Ensure values are simple floats/ints/lists
    for x, y, z in my_numpy_array.tolist():
        vertex(x, y, z)
    ```

#### 4. Callbacks & Proxies
When using p5 functions that expect a callback (like DOM interactions), you must wrap your Python function in a `create_proxy` to keep it alive in the JavaScript scope.

```python
# Example: DOM Checkbox
from pyodide.ffi import create_proxy

def toggle_drawing(event):
    global is_drawing
    is_drawing = checkbox.checked()

def setup():
    global checkbox
    checkbox = createCheckbox(' Draw Circle', True)
    
    # Create a proxy for the callback
    proxy = create_proxy(toggle_drawing)
    
    # Attach it to the p5 element
    checkbox.changed(proxy)
```


### Modes: IDE vs Viewer
1.  **IDE Mode (`ide.html`)**: The full integrated development environment.
2.  **Viewer Mode (`view.html`)**: A minimal, full-screen runner.
    - Can load shared projects via `?zip=` or `?code=`.
    - Useful for sharing finished work.

### URL Parameters
- `?id=<project-id>`: Loads a locally saved project by its ID.
- `?sketch=<url>`: Imports a project from an external URL (zip or py).
- `?code=<lz_string>`: Loads a single-file sketch from the URL hash.
- `?zip=<base64_lz_string>`: Loads a multi-file project from the URL hash.
- `?case=<mode>`: Configures snake_case converter (`both`, `snake`, `camel`).

## Deployment & Hosting

### GitHub Pages
This project is ready to be hosted on GitHub Pages. The `index.html` redirects to `ide.html`.

### Local Hosting
Due to CORS/Module security, you must use a local web server:

**Using Python**:
```bash
python3 -m http.server 8000
```
**Using Node.js**:
```bash
npx http-server .
```


## License
MIT
