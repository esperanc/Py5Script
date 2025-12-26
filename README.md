# Py5Script IDE

A web-based IDE for running [p5.js](https://p5js.org/) sketches using Python, powered by [PyScript](https://pyscript.net/). This project allows you to write standard Python code that interacts with the p5.js library, with automatic handling of the p5 instance context.

## Interface Overview

The IDE provides a clean interface for coding, managing files, and running sketches.

### Toolbar Controls
- **▶ Run**: Executes the current sketch in the preview panel.
- **■ Stop**: Stops the running sketch and resets the preview.
- **💾 Save**: Downloads your entire project (all scripts and assets) as `project.zip` and marks changes as saved.
- **📂 Load**: Opens a file picker to load a `project.zip` or a single `.py` file.
    > **Warning**: Loading a project will **replace** your current workspace. Any unsaved changes will be lost.
- **🔗 Share**: Generates a shareable URL containing your code (compressed) to send to others. Note that this will **_not_** include assets or other python files.
- **⚙️ Settings**: Customizes the editor experience (Theme, Font Size, Tabs, whitespace).

### File Management & Assets
The sidebar on the left displays all files in your project (Python scripts, images, data files).
- **Files**: Listing of all logic and asset files.
- **sketch.py**: The main entry point.
- **Add File (+)**: Create new python modules.
- **Upload File (⬆)**: Upload images, CSVs, JSONs, or other assets directly into your project.
- **Viewing**: Click a file to view/edit it. (Binary files like images are currently read-only placeholders).

## How It Works

### Python & p5.js Integration
This IDE simplifies writing p5.js sketches in Python by abstracting away the global vs. instance mode distinction.

1.  **P5 Instance**: When you run a sketch, the system instantiates p5.js in "instance mode".
2.  **AST Analysis**: Before execution, your Python code is analyzed using Python's `ast` (Abstract Syntax Tree) module.
3.  **Auto-Prefixing**: The analyzer identifies calls to p5 functions (like `rect`, `fill`, `stroke`)  and variables (like `width`, `height`, `mouseX`, `mouseY`). It compares them against the properties of the p5 instance.
    - If a name matches a p5 property and is **not** defined by you (the user) in the script, it automatically prefixes it with `p5.`.
    - Example: `rect(10, 10, 50, 50)` becomes `p5.rect(10, 10, 50, 50)` internally.
    - Example: `print("Hello")` remains `print("Hello")` (uses Python's standard print).

### Snake Case Support
You can optionally write p5.js code using `snake_case` (as recommended by [PEP8](https://peps.python.org/pep-0008/)), and the IDE will automatically convert it internally to `camelCase` (p5.js style).
- **Supported**: `create_canvas(400, 400)`, `background_color`, `mouse_x`.
- **Mechanism**: The AST transformer checks for snake_case versions of p5 properties and maps them.
- **Shadowing**: If you define `create_canvas` yourself, the auto-conversion remains disabled for that scope.

### Limitations
- **Eval/Dynamic Access**: The auto-prefixing is a **static analysis**. It cannot detect usage inside `eval()` strings or dynamic attribute access. 
    - *Workaround*: You can always manually verify the prefix yourself. Passing `p5` explicitly or using `p5.func()` is always valid.
- **Variable Shadowing**: If you define a variable with the same name as a p5 function (e.g. `def rect(): ...`), the auto-prefixer will respect your definition and will **not** prefix usages of `rect`.

### Unified Storage & Projects
The IDE uses a unified storage system for everything.

- **Storage**: All files are stored in your browser's `localStorage` under a single project key.
### Modes: IDE vs Viewer
The project offers two ways to interact with sketches:

1.  **IDE Mode (`ide.html`)**: The full integrated development environment.
    - Allows editing code, managing files, and running sketches.
    - Shows the file panel, editor, and console.
    - **Use case**: Developing, debugging, or remixing code.

2.  **Viewer Mode (`view.html`)**: A minimal, full-screen runner.
    - Displays only the running sketch canvas.
    - Hidden controls (hover to see) for basic actions like "Edit in IDE" or viewing logs.
    - **Use case**: Sharing finished projects or embedding in other pages.

### URL Parameters
You can load sketches or projects directly via URL parameters in **both** `ide.html` and `view.html`.

- `?sketch=<url>`: Loads a project from an external URL. This can be:
    - A single Python file (`.py`): e.g., `?sketch=demo/webGLDemo.py`
    - A compressed Project (`.zip`): e.g., `?sketch=demo/loadImageDemo.zip`
- `?code=<lz_string>`: Loads a raw code snippet compressed with LZString (used by the Share button).
- `?case=<mode>`: Configures the snake_case converter. Options:
    - `both` (Default): Accepts both snake_case and camelCase.
    - `snake`: Prefers snake_case (implies you wish to write in Pythonic style).
    - `camel`: Strict mode. Disables auto-conversion of snake_case to p5 symbols.

## Deployment & Hosting

### GitHub Pages (Live Demo)
This project is deployed and ready to use at:  
**[https://esperanc.github.io/Py5Script/](https://esperanc.github.io/Py5Script/)** (redirects to IDE)

**Examples:**
- **Run WebGL Demo in IDE**:  
  [https://esperanc.github.io/Py5Script/ide.html?sketch=demo/webGLDemo.py](https://esperanc.github.io/Py5Script/ide.html?sketch=demo/webGLDemo.py)
- **Run WebGL Demo in Viewer**:  
  [https://esperanc.github.io/Py5Script/view.html?sketch=demo/webGLDemo.py](https://esperanc.github.io/Py5Script/view.html?sketch=demo/webGLDemo.py)

### Deployment Instructions
This project is designed to be easily hosted on GitHub Pages.

1.  **Push to Main**: The `main` branch now contains an `index.html` that automatically redirects to `ide.html`.
2.  **Settings**: Go to your Repository Settings -> **Pages**.
3.  **Source**: Select "Deploy from a branch" and choose **main**.
4.  **Visit**: Your IDE will be available at `https://<username>.github.io/<repo-name>/`.

**Loading Demos on GitHub Pages**:
If you check in your demo files to the repository (e.g., in a `demo/` folder), you can share links effectively:
- `https://<user>.github.io/<repo>/ide.html?sketch=demo/mySketch.py`
- `https://<user>.github.io/<repo>/ide.html?sketch=demo/project.zip`

### Local Hosting
To run the IDE locally (e.g., for development or private use), you need a local web server to serve the files correctly (due to CORS/Module restrictions).

**Using Python**:
```bash
# Run inside the project directory
python3 -m http.server 8000
# Visit http://localhost:8000
```

**Using Node.js**:
```bash
# Install http-server globally if needed
npm install -g http-server
# Run inside the project directory
http-server .
# Visit http://localhost:8080
```

## Asset Management

Py5Script handles assets (images, data files, fonts) by storing them in a virtual filesystem.

### Using `asset()` helper
When using p5.js load functions (like `p5.loadImage`, `p5.loadFont`), you should use the global `asset()` helper function to ensure the correct Data URL is passed to the browser.

```python
# GOOD: Explicitly resolve asset URL
img = p5.loadImage(asset("logo.png"))

# ALSO GOOD: Interceptors handle simple strings (but less robust)
img = p5.loadImage("logo.png")
```

### Python File IO
For standard Python file operations, simply use the filename. The `asset()` helper is **not** needed for `open()`.

```python
# Read a text file
with open("data.txt", "r") as f:
    content = f.read()
```

## Project Structure
- **`sketch.py`**: The main entry point of your project. This file is always executed when you click "Run".
- **Modules**: You can create additional `.py` files (e.g., `utils.py`) and import them in `sketch.py`. 
    - *Note*: Clicking "Run" while viewing a module will save the module but execute `sketch.py`.

## License
MIT
