
// --- STATE ---
const PROJECT_KEY = 'py5script_project';
// Removed ASSET_STORAGE_KEY

const PROJECT_NAME_KEY = 'py5script_project_name';

let projectFiles = { 'sketch.py': '' };
let projectName = "My Project";
let currentFile = 'sketch.py';
let isDirty = localStorage.getItem('py5script_is_dirty') === 'true';



// --- FILE MANAGEMENT ---

// Helper: Check if content is binary (DataURL)
function isBinary(content) {
    return content && content.startsWith('data:');
}

// Upload Handler
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check size (Soft warning)
    if (file.size > 2 * 1024 * 1024) {
         if(!confirm("File is large (>2MB). This might exceed browser storage limits. Continue?")) {
             event.target.value = '';
             return;
         }
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        let content = e.target.result; // Data URL by default for non-text
        
        // If it's a known text type, we might want to read as text? 
        // FileReader reads as DataURL if we called readAsDataURL.
        // Let's decide based on extension or just treat everything as DataURL if uploaded?
        // Better: text files as text, others as data URL.
        
        // Actually, for simplicity in "Handle Upload", we read as DataURL for everything?
        // No, user wants to edit CSV. So we must detect text files.
    };

    // Re-do Reader Logic based on type
    const textExts = ['.py', '.txt', '.csv', '.json', '.md', '.xml', '.yaml', '.gsdict'];
    const isText = textExts.some(ext => file.name.toLowerCase().endsWith(ext));

    if (isText) {
        reader.readAsText(file);
    } else {
        reader.readAsDataURL(file);
    }

    reader.onload = function(e) {
        let content = e.target.result;
        projectFiles[file.name] = content;
        isDirty = true;
        saveProjectAndFiles();
        if (typeof updateFileList === 'function') updateFileList();
        event.target.value = ''; 
    };
}

// --- PROJECT SAVE/LOAD ---

// Helper: Get code from Editor if available, else from memory
function getCurrentCode() {
    if (typeof editor !== 'undefined' && editor.getValue && !isBinary(projectFiles[currentFile])) {
        return editor.getValue();
    }
    return projectFiles[currentFile] || "";
}

function saveProjectAndFiles() {
    // If editor exists and current file is text, sync it
    if (typeof editor !== 'undefined' && editor.getValue && !isBinary(projectFiles[currentFile])) {
        projectFiles[currentFile] = editor.getValue();
    }
    // Save as JSON object
    localStorage.setItem(PROJECT_KEY, JSON.stringify(projectFiles));
    
    // Save Project Name
    localStorage.setItem(PROJECT_NAME_KEY, projectName);
    localStorage.setItem('py5script_is_dirty', isDirty);
    if (typeof updateProjectNameUI === 'function') updateProjectNameUI();
}

// Check Dirty before action
function checkDirty() {
    if (isDirty) {
        return confirm("You have unsaved changes. They will be lost if you proceed. Continue?");
    }
    return true;
}

async function loadProjectFromBlob(blob, filenameHint, callbacks = {}) {
     // callbacks: { onImport: (msg)=>void, onError: (msg)=>void, onUpdateUI: ()=>void }
     const log = callbacks.onImport || console.log;
     const err = callbacks.onError || console.error;

     if (!checkDirty()) return;

     if (filenameHint.endsWith('.zip')) {
         // ZIP Import
         try {
             const zip = await JSZip.loadAsync(blob);
             
             // Wipe current project
             const newProjectFiles = {};
             let foundPy = false;
             
             for (const filename in zip.files) {
                 if (zip.files[filename].dir) continue;
                 
                 const file = zip.file(filename);
                 // Heuristic: .py, .txt, .csv, .json, .md, .xml, .yaml, .gsdict -> String
                 // Others -> Base64
                 const textExts = ['.py', '.txt', '.csv', '.json', '.md', '.xml', '.yaml', '.gsdict'];
                 const isText = textExts.some(ext => filename.toLowerCase().endsWith(ext));

                 if (isText) {
                     newProjectFiles[filename] = await file.async("string");
                 } else {
                     const b64 = await file.async("base64");
                     // We need MIME type
                     let mime = 'application/octet-stream';
                     if (filename.endsWith('.png')) mime = 'image/png';
                     else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) mime = 'image/jpeg';
                     else if (filename.endsWith('.gif')) mime = 'image/gif';
                     
                     newProjectFiles[filename] = `data:${mime};base64,${b64}`;
                 }
                 
                 if (filename.endsWith('.py')) foundPy = true;
             }

             if (foundPy) {
                 projectFiles = newProjectFiles;
                 
                 // ENFORCE sketch.py
                 if (!projectFiles['sketch.py']) {
                     const keys = Object.keys(projectFiles);
                     if (projectFiles['main.py']) {
                         projectFiles['sketch.py'] = projectFiles['main.py'];
                         delete projectFiles['main.py'];
                     } else {
                         // Find first py
                         const pyFile = keys.find(k => k.endsWith('.py'));
                         if (pyFile) {
                             projectFiles['sketch.py'] = projectFiles[pyFile];
                             delete projectFiles[pyFile];
                         }
                     }
                 }

                 // If still no sketch.py (rare), create one
                 if (!projectFiles['sketch.py']) projectFiles['sketch.py'] = "";

                 currentFile = 'sketch.py';
                 isDirty = false; // Fresh load from zip -> clean
                 
                 if (callbacks.onUpdateUI) callbacks.onUpdateUI();
                 log(`Imported project with ${Object.keys(projectFiles).length} files.`);
             } else {
                 err("Warning: No python file found in ZIP.");
             }

             // Set Project Name from ZIP filename if imported
             if (filenameHint.endsWith('.zip')) {
                 projectName = filenameHint.replace(/\.zip$/i, '');
             }
             
             saveProjectAndFiles();

         } catch(e) {
             err(`Error reading ZIP: ${e}`);
         }
     } else {
         // Text Import (Single File) - Treat as sketch.py replacement?
         // User said: "load button will necessarily erase all files".
         // So leading a single .py file wipes the project and sets it as sketch.py?
         // Yes.
         const text = await blob.text();
         projectFiles = {}; 
         projectFiles['sketch.py'] = text;
         currentFile = 'sketch.py';
         isDirty = true; // Technically 'loaded from file' implies clean, but it's not a full project recovery, it's a new start. 
         // Actually, if I load a file, I haven't "saved" this project state to a zip yet. So Dirty.
         
         if (callbacks.onUpdateUI) callbacks.onUpdateUI();
         
         saveProjectAndFiles();
     }
}

// --- EXPORT ---
function triggerExport() {
     // Sync editor content first
     if (typeof editor !== 'undefined' && editor.getValue && !isBinary(projectFiles[currentFile])) {
        projectFiles[currentFile] = editor.getValue();
     }

     const fileKeys = Object.keys(projectFiles);

     // Single File Export (.py)
     if (fileKeys.length === 1 && fileKeys[0] === 'sketch.py') {
         const content = projectFiles['sketch.py'];
         const blob = new Blob([content], {type: "text/plain;charset=utf-8"});
         
         const a = document.createElement("a");
         a.href = URL.createObjectURL(blob);
         a.download = `${projectName}.py`;
         a.click();
         URL.revokeObjectURL(a.href);
         
         isDirty = false;
         saveProjectAndFiles();
         return;
     }

     // ZIP Export (Multiple files or non-sketch files)
     const zip = new JSZip();

     // Add All Project Files
     for (const filename in projectFiles) {
         const content = projectFiles[filename];
         if (isBinary(content)) {
             // data:mime;base64,...
             const parts = content.split(',');
             if (parts.length === 2) {
                 zip.file(filename, parts[1], {base64: true});
             }
         } else {
             zip.file(filename, content);
         }
     }
     
     // Generate and download
     zip.generateAsync({type:"blob"}).then(function(content) {
         const a = document.createElement("a");
         a.href = URL.createObjectURL(content);
         a.download = `${projectName}.zip`;
         a.click();
         URL.revokeObjectURL(a.href);
         
         isDirty = false; // Saved
         saveProjectAndFiles(); // Persist clean state
     });
}
// --- URL LOADING ---
async function loadProjectFromURL(callbacks = {}) {
    // callbacks: { onImport, onError, onUpdateUI, onLoaded }
    const log = callbacks.onImport || console.log;
    const err = callbacks.onError || console.error;
    const params = new URLSearchParams(window.location.search);
    let loaded = false;

    // 1. URL Code String (?code=...)
    if (params.has('code')) {
        const compressed = params.get('code');
        const code = LZString.decompressFromEncodedURIComponent(compressed);
        if (code) {
             projectFiles = { 'sketch.py': code };
             currentFile = 'sketch.py';
             loaded = true;
        }
    }

    // 2. URL Sketch/Project File (?sketch=...)
    else if (params.has('sketch')) {
        const sketchUrl = params.get('sketch');
        const filename = sketchUrl.split('/').pop() || 'sketch.py';
        try {
            if (sketchUrl.toLowerCase().endsWith('.zip')) {
                 const response = await fetch(sketchUrl);
                 if (response.ok) {
                     const blob = await response.blob();
                     await loadProjectFromBlob(blob, filename, callbacks);
                     loaded = true;
                     // removed early return to allow onLoaded callback below
                 }
            } else {
                 const response = await fetch(sketchUrl);
                 if (response.ok) {
                    const text = await response.text();
                    // Similar logic to loadProjectFromBlob text import but manual here for simplicity? 
                    // Or reuse loadProjectFromBlob?
                    // Let's reuse loadProjectFromBlob for text too
                    const blob = new Blob([text], {type: 'text/plain'});
                    await loadProjectFromBlob(blob, filename, callbacks);
                    loaded = true;
                 } else {
                    err(`Failed to fetch sketch: ${sketchUrl} (${response.status})`);
                 }
            }
        } catch(e) {
            err(`Error fetching sketch: ${e.message}`);
        }
    }

    if (loaded) {
        if (callbacks.onUpdateUI) callbacks.onUpdateUI();
        if (callbacks.onLoaded) callbacks.onLoaded();
    }
    return loaded;
}

async function newProject() {
    if (!checkDirty()) return;

    let defaultSketch = "def setup():\n    p5.createCanvas(400, 400)\n\ndef draw():\n    p5.background(220)";
    
    try {
        const response = await fetch('sketch.py');
        if (response.ok) {
            defaultSketch = await response.text();
        }
    } catch (e) {
        console.warn("Failed to fetch default sketch.py, using fallback.");
    }

    projectFiles = {
        'sketch.py': defaultSketch
    };
    currentFile = 'sketch.py';
    projectName = "My Project";
    
    // UI Updates
    if (typeof editor !== 'undefined') {
        editor.setValue(projectFiles['sketch.py']);
        editor.clearSelection();
        editor.setReadOnly(false);
    }
    if (typeof updateFileList === 'function') updateFileList();
    if (typeof updateProjectNameUI === 'function') updateProjectNameUI();
    
    isDirty = false; // Reset to clean state
    saveProjectAndFiles();
}
