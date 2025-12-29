// --- STATE ---
const PROJECT_REGISTRY_KEY = 'py5script_projects_index';
const PROJECT_KEY_PREFIX = 'project_';

let projectId = null; // Will be set by initProjectID
let projectFiles = { 'sketch.py': '' };
let projectName = "My Project";
let currentFile = 'sketch.py';
let isDirty = localStorage.getItem('py5script_is_dirty') === 'true'; // This might need scoping too, but let's keep simple for now or scope it? 
// Actually isDirty is per window session usually, but if we reload we want to know?
// Let's scope isDirty too: 'project_{id}_dirty'

// --- REGISTRY HELPERS ---
function getProjectRegistry() {
    try {
        const data = localStorage.getItem(PROJECT_REGISTRY_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error("Registry parse error", e);
        return {};
    }
}

function saveProjectRegistry(registry) {
    localStorage.setItem(PROJECT_REGISTRY_KEY, JSON.stringify(registry));
}

function updateRegistryEntry(id, name, lastExported = null) {
    const registry = getProjectRegistry();
    if (!registry[id]) registry[id] = {};
    
    registry[id].id = id;
    registry[id].name = name;
    registry[id].lastModified = Date.now();
    if (lastExported) registry[id].lastExported = lastExported;
    
    saveProjectRegistry(registry);
}

function deleteProjectFromRegistry(id) {
    const registry = getProjectRegistry();
    if (registry[id]) {
        delete registry[id];
        saveProjectRegistry(registry);
        
        // Remove actual data
        localStorage.removeItem(`${PROJECT_KEY_PREFIX}${id}_files`);
        localStorage.removeItem(`${PROJECT_KEY_PREFIX}${id}_name`);
        localStorage.removeItem(`${PROJECT_KEY_PREFIX}${id}_dirty`);
    }
}



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
    const textExts = ['.py', '.txt', '.csv', '.json', '.md', '.xml', '.yaml', '.gsdict', '.vert', '.frag', '.glsl'];
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
    if (!projectId) {
        console.warn("No Project ID set, skipping save.");
        return;
    }

    // If editor exists and current file is text, sync it
    if (typeof editor !== 'undefined' && editor.getValue && !isBinary(projectFiles[currentFile])) {
        projectFiles[currentFile] = editor.getValue();
    }
    
    // Save to Scoped Storage
    const keyFiles = `${PROJECT_KEY_PREFIX}${projectId}_files`;
    const keyName = `${PROJECT_KEY_PREFIX}${projectId}_name`;
    const keyDirty = `${PROJECT_KEY_PREFIX}${projectId}_dirty`;

    localStorage.setItem(keyFiles, JSON.stringify(projectFiles));
    localStorage.setItem(keyName, projectName);
    localStorage.setItem(keyDirty, isDirty);
    
    // Update Registry
    updateRegistryEntry(projectId, projectName);

    if (typeof updateProjectNameUI === 'function') updateProjectNameUI();
}

// Rename Project and Migrate ID
function renameProject(newName) {
    if (!newName || !newName.trim()) return;
    
    // Slugify helper
    const slugify = (text) => text.toString().toLowerCase()
        .replace(/\s+/g, '-')           
        .replace(/[^\w\-]+/g, '')       
        .replace(/\-\-+/g, '-')         
        .replace(/^-+/, '')             
        .replace(/-+$/, '');
        
    const newId = slugify(newName);
    
    if (!newId) {
        alert("Invalid project name.");
        return;
    }
    
    // Case only change?
    if (newId === projectId) {
        projectName = newName;
        isDirty = true;
        saveProjectAndFiles();
        return;
    }
    
    // Check Collision
    const registry = getProjectRegistry();
    if (registry[newId]) {
        alert(`Project "${newName}" (ID: ${newId}) already exists. Please choose another name.`);
        return;
    }
    
    if (!confirm(`This will rename the project ID to "${newId}" and reload. Continue?`)) return;
    
    // MIGRATE DATA
    // We already have 'projectFiles', 'isDirty' in memory.
    // Just save to NEW keys and delete OLD keys.
    
    // 1. Save to New ID
    const oldId = projectId;
    const keyFilesNew = `${PROJECT_KEY_PREFIX}${newId}_files`;
    const keyNameNew = `${PROJECT_KEY_PREFIX}${newId}_name`;
    const keyDirtyNew = `${PROJECT_KEY_PREFIX}${newId}_dirty`;

    localStorage.setItem(keyFilesNew, JSON.stringify(projectFiles));
    localStorage.setItem(keyNameNew, newName);
    localStorage.setItem(keyDirtyNew, isDirty);
    
    // 2. Update Registry (Add New, Delete Old)
    updateRegistryEntry(newId, newName);
    deleteProjectFromRegistry(oldId);
    
    // 3. Redirect
    window.location.href = `ide.html?id=${newId}`;
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
                 // Heuristic: .py, .txt, .csv, .json, .md, .xml, .yaml, .gsdict, .vert, .frag, .glsl -> String
                 // Others -> Base64
                 const textExts = ['.py', '.txt', '.csv', '.json', '.md', '.xml', '.yaml', '.gsdict', '.vert', '.frag', '.glsl'];
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
         // Text Import (Single File) - Treat as sketch.py replacement
         const text = await blob.text();
         projectFiles = {}; 
         projectFiles['sketch.py'] = text;
         currentFile = 'sketch.py';
         
         // Extract project name from filenameHint (e.g. "mandelbrot.py" -> "mandelbrot")
         // Only if filenameHint is valid and not generic 'sketch.py' or 'Unknown' if we want to preserve that behavior.
         // But user requested "something.py" -> "something".
         if (filenameHint && filenameHint !== 'sketch.py') {
             // remove extension
             const name = filenameHint.replace(/\.[^/.]+$/, "");
             if (name.trim() !== "") {
                 projectName = name;
             }
         }

         isDirty = false; // Just loaded from source -> clean
         
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
    // Just redirect to a fresh URL with a new ID
    // We don't check dirty here because we're opening a "new" clean project in a way (or same window)
    // Actually users expect "New" to replace current if single window.
    if (!checkDirty()) return;
    
    const newName = generateProjectName(); // from name_generator.js
    // We rely on slug as ID for simplicity as per plan
    const newId = newName; 
    
    // Redirect
    window.location.href = `ide.html?id=${newId}`;
}

// --- INITIALIZATION (ID & Migration) ---
async function initProjectID() {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');
    
    if (idParam) {
        projectId = idParam;
        
        // Try to load scoped data
        const keyFiles = `${PROJECT_KEY_PREFIX}${projectId}_files`;
        const keyName = `${PROJECT_KEY_PREFIX}${projectId}_name`;
        const keyDirty = `${PROJECT_KEY_PREFIX}${projectId}_dirty`; // Optional loading
        
        const savedFiles = localStorage.getItem(keyFiles);
        const savedName = localStorage.getItem(keyName);
        
        if (savedFiles) {
            try {
                projectFiles = JSON.parse(savedFiles);
                if (savedName) projectName = savedName;
                isDirty = false; // Reset dirty on fresh load unless we tracking session crash?
                // Let's assume clean load
            } catch(e) {
                console.error("Error loading project files", e);
            }
        } else {
            // ID exists in URL but no data? 
            // 1. Could be a totally new project with a custom name user typed?
            // 2. Could be valid.
            // Initialize empty.
            // If the ID looks like it came from us (adjective-noun), nice.
            // Just init defaults.
            // We do NOT fetch default sketch here, initializeIDE does that fallback.
            
            // Set name from ID if looks reasonable (replace - with space, capitalize)
            // Or just keep ID as name initially?
            // Let's set projectName to title-cased ID if it's new
            const readable = projectId.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
            projectName = readable;
            // projectFiles initialized empty/default later in initializeIDE fallback
        }
        
    } else {
        // NO ID -> MIGRATION or NEW
        
        // Check legacy global key
        const legacyKey = 'py5script_project';
        const legacyData = localStorage.getItem(legacyKey);
        
        if (legacyData) {
            // MIGRATION
            console.log("Migrating legacy project...");
            const newName = generateProjectName();
            const newId = newName;
            
            // Save to new scoped keys
            const oldName = localStorage.getItem('py5script_project_name') || "My Parsed Project";
            
            localStorage.setItem(`${PROJECT_KEY_PREFIX}${newId}_files`, legacyData);
            localStorage.setItem(`${PROJECT_KEY_PREFIX}${newId}_name`, oldName);
            localStorage.setItem(`${PROJECT_KEY_PREFIX}${newId}_dirty`, 'false');
            
            // Add to registry
            updateRegistryEntry(newId, oldName);
            
            // WIPE legacy (Safety first? Maybe keep as backup? No, conflicting.)
            localStorage.removeItem(legacyKey);
            localStorage.removeItem('py5script_project_name');
            localStorage.removeItem('py5script_is_dirty');
            
            // Redirect
            window.location.href = `ide.html?id=${newId}`;
            return false; // Stop loading
        } else {
            // NEW FRESH PROJECT
            const newName = generateProjectName();
            // Redirect
            window.location.href = `ide.html?id=${newName}`;
            return false;
        }
    }
    
    return true; // Continue loading
}
