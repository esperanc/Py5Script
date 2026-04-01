#!/bin/bash

# makeindex.sh - Generates index.html for Py5Script demo folder
# Usage: bash demo/makeindex.sh or ./makeindex.sh (from demo folder)

# Determine the demo directory and move there
DEMO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DEMO_DIR"

OUTPUT_FILE="index.html"

echo "Generating $OUTPUT_FILE in $DEMO_DIR..."

cat <<EOF > "$OUTPUT_FILE"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Py5Script Demos</title>
    <link rel="icon" type="image/x-icon" href="../favicon.ico">
    <style>
        :root {
            --bg-color: #1a1a1a;
            --card-bg: #2a2a2a;
            --text-color: #eee;
            --accent-color: #007acc;
            --view-color: #17a2b8;
            --run-color: #28a745;
            --border-color: #444;
            --hover-bg: #333;
        }

        body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            margin: 0;
            padding: 40px 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        header {
            text-align: center;
            margin-bottom: 50px;
            max-width: 800px;
        }

        header h1 {
            font-size: 2.5rem;
            margin: 0 0 10px 0;
            background: linear-gradient(135deg, #fff 0%, #aaa 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        header p {
            color: #888;
            font-size: 1.1rem;
        }

        .demo-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            width: 100%;
            max-width: 1200px;
        }

        .demo-card {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 20px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            overflow: hidden;
        }

        .demo-card:hover {
            transform: translateY(-5px);
            border-color: var(--accent-color);
            box-shadow: 0 10px 20px rgba(0,0,0,0.3);
            background: var(--hover-bg);
        }

        .demo-card h3 {
            margin: 0 0 15px 0;
            font-size: 1.2rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            color: #fff;
        }

        .demo-info {
            font-size: 0.85rem;
            color: #777;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .file-type {
            padding: 2px 6px;
            border-radius: 4px;
            background: #444;
            color: #aaa;
            text-transform: uppercase;
            font-weight: bold;
            font-size: 0.7rem;
        }

        .actions {
            display: flex;
            gap: 10px;
        }

        .btn {
            flex: 1;
            padding: 10px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            font-size: 0.9rem;
            text-align: center;
            transition: filter 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .btn:hover {
            filter: brightness(1.2);
        }

        .btn-ide {
            background-color: var(--accent-color);
            color: white;
        }

        .btn-view {
            background-color: var(--view-color);
            color: white;
        }

        .icon {
            width: 16px;
            height: 16px;
            stroke: currentColor;
            fill: none;
            stroke-width: 2;
        }

        footer {
            margin-top: 60px;
            color: #555;
            font-size: 0.9rem;
        }

        footer a {
            color: #777;
            text-decoration: none;
        }

        footer a:hover {
            text-decoration: underline;
        }

        @media (max-width: 600px) {
            .demo-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>

<header>
    <h1>Py5Script Demos</h1>
    <p>Collection of sketches, shaders, and examples powered by Python and p5.js</p>
</header>

<div class="demo-grid">
EOF

# Loop throughout *.py and *.zip files
# Sort them nicely
ls *.py *.zip 2>/dev/null | sort | while read -r f; do
    # Skip index.html itself if it somehow matched (it won't with .py .zip)
    [ "$f" == "index.html" ] && continue
    [ "$f" == "makeindex.sh" ] && continue

    # Clean name for display
    name="${f%.*}"
    ext="${f##*.}"
    
    # Escape spaces for URL
    url_encoded_f=$(echo "$f" | sed 's/ /%20/g')

    cat <<ITEM >> "$OUTPUT_FILE"
    <div class="demo-card">
        <h3>$name</h3>
        <div class="demo-info">
            <span class="file-type">$ext</span>
            <span>$f</span>
        </div>
        <div class="actions">
            <a href="../ide.html?sketch=demo/$url_encoded_f" class="btn btn-ide" title="Open in IDE">
                <svg class="icon" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                Edit
            </a>
            <a href="../view.html?sketch=demo/$url_encoded_f" class="btn btn-view" title="Run in View Mode">
                <svg class="icon" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                Play
            </a>
        </div>
    </div>
ITEM
done

cat <<EOF >> "$OUTPUT_FILE"
</div>

<footer>
    <p>Powered by <a href="https://github.com/esperanc/Py5Script">Py5Script</a></p>
</footer>

</body>
</html>
EOF

echo "Done! index.html generated with $(ls *.py *.zip 2>/dev/null | wc -l) items."
chmod +x "$OUTPUT_FILE"
chmod +x "makeindex.sh"
