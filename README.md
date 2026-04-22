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

Py5Script uses a **hybrid storage architecture** designed to handle projects of any size without hitting browser quota limits.

| Layer | What is stored | Technology |
|---|---|---|
| **Registry** (metadata) | Project ID, name, last-modified timestamp | `localStorage` — synchronous, always reliable |
| **Files** (content) | `sketch.py`, assets, shaders, images (as Base64) | **IndexedDB** — asynchronous, large-capacity (hundreds of MB) |

- **Auto-save**: Changes are written to IndexedDB automatically as you type (debounced 2 s). The registry in `localStorage` is updated in the same call, so the project list is always consistent.
- **Large assets**: Images and binary files are stored as Base64 Data URLs in IndexedDB, so there is no practical size limit for individual projects.
- **Export / Backup**: Use the **Download** button to save a `.py` or `.zip` snapshot of your project to disk. This is the recommended way to keep permanent backups.

#### Migration from older versions
When you first open the new app, it **automatically migrates** any projects previously saved in the old `localStorage`-only format:

1. The migration scans the registry for projects whose file data is still in `localStorage` (key pattern `project_<id>_files`).
2. Each project's files are written to IndexedDB and the write is **verified by reading back** before the old `localStorage` key is deleted. If the write cannot be verified, the legacy key is preserved as a fallback.
3. Migration is **incremental and idempotent** — running it multiple times is safe and it will pick up any new projects created by an older version of the app running at the same origin.

> **Note on browser origins**: `localStorage` and IndexedDB are scoped to the browser origin (`scheme + host + port`). If you run the legacy and new app on different ports (e.g. `:9000` vs `:9005`), migration will not see the legacy data. Run both apps on the **same port** for seamless migration.

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

### External Packages (requirements.txt)
To use external Python packages (like `numpy`, `pandas`, `faker`), create a file named `requirements.txt` in your project's root.

1.  **Create File**: Click "New File" -> `requirements.txt`.
2.  **Add Packages**: List one package per line.
    ```text
    numpy
    pandas
    ```
3.  **Import**: In your `sketch.py`, import them as usual.
    ```python
    import numpy as np
    def setup():
        print(np.array([1, 2, 3]))
    ```
The runner will automatically install these packages from PyPI (via Pyodide/Micropip) before starting your sketch.

### External Javascript Libraries (js_modules.txt)

You can import external Javascript libraries by creating a file named `js_modules.txt` in your project's root.

Each line in this file should contain a url of a library, followed by an equal sign and the alias for that library in the python code.

Example:
```
# The lil-gui library
https://cdn.jsdelivr.net/npm/lil-gui@0.21/+esm = lil
```

The python code would then use the name `lil` as the module name. For instance

```python
gui = lil.GUI.new()
```

**Note**: The library must be available as an ESM (ES Module) build. Most modern CDN packages (jsDelivr, unpkg, skypack) offer ESM variants. 


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

#### 2. Data Structures (Python Lists/Tuples vs JS Arrays)
Python lists and tuples are **not** automatically converted to JavaScript Arrays when passed to p5 functions. This can cause subtle failures in functions like `setUniform()`, `stroke()` with a colour array, or anything shader-related.

The following helpers are **available globally** in every sketch — no import needed:

| Helper | What it does |
|---|---|
| `js_array(iterable)` | Convert a Python list or tuple → JS Array |
| `js_object(dict)` | Convert a Python dict → plain JS object |
| `to_js(value)` | Raw Pyodide converter (supports extra options) |
| `create_proxy(fn)` | Keep a Python callback alive in JS scope |

```python
# Shader uniform — pass a list as a JS Array
def setup():
    shader = createShader(vert, frag)
    shader(shader)
    shader.setUniform('p', js_array([-0.74364388703, 0.13182590421]))
    shader.setUniform('r', 0.001)

# Or use to_js directly for more control
shader.setUniform('palette', to_js([255, 100, 50]))
```

For in-place mutation (like `P5.shuffle()`), prefer the Python equivalent:

*   **Good**: `random.shuffle(my_list)` (native Python)
*   **Good**: `P5.shuffle(js_array(my_list))` (explicit JS Array)

#### 3. Numpy & Types
Numpy scalars (e.g. `np.float64`) are passed as temporary proxies to JavaScript. If p5 stores these (like `vertex()` does before `end_shape()`), the proxy might be destroyed before p5 uses it, causing a `borrowed proxy was automatically destroyed` error.

*   **Fix**: Cast to native Python types before passing to p5.
    ```python
    # Ensure values are simple floats/ints/lists
    for x, y, z in my_numpy_array.tolist():
        vertex(x, y, z)
    ```

#### 4. Callbacks & Proxies
When using p5 functions that expect a callback (like DOM interactions), wrap your Python function in `create_proxy` to keep it alive in the JavaScript scope. **`create_proxy` is available globally — no import needed.**

```python
# Example: DOM Checkbox — no imports required
def toggle_drawing(event):
    global is_drawing
    is_drawing = checkbox.checked()

def setup():
    global checkbox
    checkbox = createCheckbox(' Draw Circle', True)
    checkbox.changed(create_proxy(toggle_drawing))
```


### Modes: IDE vs Viewer vs Standalone
1.  **IDE Mode (`ide.html`)**: The full integrated development environment.
2.  **Viewer Mode (`view.html`)**: A minimal, full-screen runner.
    - Can load shared projects via `?zip=` or `?code=`.
    - Useful for sharing finished work.
3.  **Standalone Mode (`runner.html`)**: Running directly outside the IDE using external editors (see below).

### Standalone Use (External Editor)
You can build Py5Script apps without using the IDE by directly utilizing `runner.html`. This is extremely useful if you prefer to write your code in editors like **VS Code** or **Sublime Text**.

1. **Setup**: Create a directory for your project. Copy the IDE's `runner.html` file into your directory and rename it to `index.html`.
2. **Files**: Create your core `sketch.py`. You can also add `requirements.txt`, `js_modules.txt`, and any other `.py` files to import.
3. **Execution**: Start a local web server (e.g., `python3 -m http.server 8000`) and browse to `localhost:8000`.

**How it works:**
When loaded outside the IDE, `runner.html` enters **Standalone Mode**. It automatically uses Pyodide to fetch your `sketch.py`, `requirements.txt`, and `js_modules.txt` from the local web server. It also dynamically intercepts regular Python `import module` statements and fetches the corresponding `.py` files automatically.

**A Note on Assets:**
Standard `p5.js` functions like `P5.loadImage("cat.png")` or `P5.loadStrings("data.csv")` will work seamlessly since they fetch over standard HTTP. However, standard Python basic `open("data.txt")` requires the file to be present in Pyodide's virtual filesystem. It is recommended to stick to `p5.js` native loaders or use `pyodide.http.pyfetch` for raw text data in standalone mode.

### URL Parameters
- `?id=<project-id>`: Loads a project by its ID from IndexedDB.
- `?sketch=<url>`: Imports a project from an external URL (zip or py).
- `?code=<lz_string>`: Loads a single-file sketch from the URL hash.
- `?zip=<base64_lz_string>`: Loads a multi-file project from the URL hash.
- `?case=<mode>`: Configures snake_case converter (`both`, `snake`, `camel`).

## Deployment & Hosting

### GitHub Pages
This project is hosted on GitHub Pages. The `index.html` redirects to `ide.html`.

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
