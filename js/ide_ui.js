
// --- UI ELEMENTS ---
const fileListEl = document.getElementById('file-list');
const addFileBtn = document.getElementById('add-file-btn');
const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
const filePanelEl = document.getElementById('file-panel');

const currentFileLabel = document.getElementById('current-file-label');
const projectNameLabel = document.getElementById('project-name');
const renameBtn = document.getElementById('rename-btn');

const iframe = document.getElementById('runner-frame');
const consoleContent = document.getElementById('console-content');
const clearConsoleBtn = document.getElementById('clear-console');

const runBtn = document.getElementById('run-btn');
const stopBtn = document.getElementById('stop-btn');
const viewBtn = document.getElementById('view-btn');
const newBtn = document.getElementById('new-btn');
const openBtn = document.getElementById('open-btn');
const loadBtn = document.getElementById('load-btn'); // Now "Upload"
const downloadBtn = document.getElementById('download-btn'); // Was "save-btn" (Download)
const saveBtn = document.getElementById('save-btn'); // Removed from HTML (Save) but might still be used for shortcut? 
// Actually I removed the Save button from HTML, but we kept the shortcut (Cmd+S).
// We should probably keep 'saveBtn' variable if we want to bind shortcut visual feedback or something, 
// but since I removed the element, `document.getElementById('save-btn')` will be null.
// Let's remove saveBtn variable and only use downloadBtn.
const shareBtn = document.getElementById('share-btn');
// Removed assetsBtn
const fileInput = document.getElementById('file-input');
const uploadInput = document.getElementById('upload-input');
const uploadFileBtn = document.getElementById('upload-file-btn');

// --- EDITOR SETUP ---
var editor = ace.edit("editor");
editor.setTheme("ace/theme/monokai");
editor.session.setMode("ace/mode/python");
editor.setShowPrintMargin(false);
// Apply settings now that editor is ready
applySettings();

let isProgrammaticChange = false;

// Auto-save logic (Debounced)
let autoSaveTimeout;
editor.session.on('change', function(delta) {
    if (isProgrammaticChange) return;

    isDirty = true; // Mark dirty on user input
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
        // Prevent overwriting binary files with placeholder
        if (projectFiles[currentFile] && isBinary(projectFiles[currentFile])) return;

        projectFiles[currentFile] = editor.getValue();
        saveProjectAndFiles();
    }, 2000); 
});

// --- FILE PANEL ---
// --- FILE PANEL ---
toggleSidebarBtn.addEventListener('click', () => {
     if (filePanelEl.style.display === 'flex') {
         filePanelEl.style.display = 'none';
         // Closed -> Show Right Chevron
         toggleSidebarBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>';
     } else {
         filePanelEl.style.display = 'flex';
         // Open -> Show Left Chevron
         toggleSidebarBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>';
     }
});

function updateFileList() {
    fileListEl.innerHTML = '';
    
    // Update Top Bar Label
    currentFileLabel.textContent = currentFile;

    for (const filename in projectFiles) {
        const li = document.createElement('li');
        li.className = `file-item ${filename === currentFile ? 'active' : ''}`;
        li.onclick = () => switchToFile(filename);
        
        const nameSpan = document.createElement('span');
        nameSpan.textContent = filename;
        
        // Icon hint?
        if (isBinary(projectFiles[filename])) {
            nameSpan.textContent += " (bin)";
        }

        li.appendChild(nameSpan);

        // Delete button (prevent deleting sketch.py)
        if (filename !== 'sketch.py') {
            const delBtn = document.createElement('span');
            delBtn.className = 'file-delete';
            delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                deleteFile(filename);
            };
            li.appendChild(delBtn);
        }

        fileListEl.appendChild(li);
    }
}

const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp', 'ico'];

function switchToFile(filename, saveCurrent = true) {
    // Save current content first if it was text (and not currently viewing an image)
    const currentExt = currentFile ? currentFile.split('.').pop().toLowerCase() : '';
    const isCurrentImage = imageExts.includes(currentExt);

    if (saveCurrent && projectFiles[currentFile] !== undefined && !isBinary(projectFiles[currentFile]) && !isCurrentImage) {
        projectFiles[currentFile] = editor.getValue();
    }

    currentFile = filename;
    const ext = filename.split('.').pop().toLowerCase();
    const content = projectFiles[currentFile];
    
    // UI Elements
    const editorEl = document.getElementById('editor');
    const imageViewerEl = document.getElementById('image-viewer');
    const previewImg = document.getElementById('preview-image');

    if (imageExts.includes(ext)) {
        // Show Image Viewer
        editorEl.style.display = 'none';
        imageViewerEl.style.display = 'flex';
        previewImg.src = content; // content is Data URL
    } else {
        // Show Editor
        editorEl.style.display = 'block';
        imageViewerEl.style.display = 'none';
        
        if (isBinary(content)) {
            // Show placeholder or read-only
            editor.setValue(`<< Binary File: ${filename} >>\n<< Content hidden >>`);
            editor.setReadOnly(true);
            editor.session.setMode("ace/mode/text");
        } else {
            isProgrammaticChange = true;
            editor.setValue(content || "");
            isProgrammaticChange = false;
            editor.setReadOnly(false);
    
            // Determine Mode
            let mode = "ace/mode/text";
            if (ext === 'py') mode = "ace/mode/python";
            else if (ext === 'js') mode = "ace/mode/javascript";
            else if (ext === 'json') mode = "ace/mode/json";
            else if (ext === 'html' || ext === 'xml') mode = "ace/mode/html";
            else if (ext === 'css') mode = "ace/mode/css";
            else if (ext === 'vert' || ext === 'frag' || ext === 'glsl') mode = "ace/mode/glsl";
            
            editor.session.setMode(mode);
        }
    }
    
    updateFileList();
    
    // Update Label
    const label = document.getElementById('current-file-label');
    if (label) label.textContent = filename;
}


function addFile() {
    const name = prompt("Enter new filename (e.g. module.py, shader.vert):", "new_module.py");
    if (!name) return;
    
    // Allowed extensions
    const allowed = ['.py', '.vert', '.frag', '.glsl'];
    const hasValidExt = allowed.some(ext => name.endsWith(ext));

    if (!hasValidExt) {
        alert("Filename must end with .py, .vert, .frag, or .glsl");
        return;
    }
    if (projectFiles[name]) {
        alert("File already exists.");
        return;
    }
    projectFiles[name] = "";
    isDirty = true;
    switchToFile(name);
    saveProjectAndFiles();
}

function deleteFile(filename) {
    if (filename === 'sketch.py') {
        alert("Cannot delete the main entry point (sketch.py).");
        return;
    }
    if(!confirm(`Delete ${filename}?`)) return;
    
    delete projectFiles[filename];
    isDirty = true;

    // Safety: Ensure sketch.py exists
    if (!projectFiles['sketch.py']) {
        projectFiles['sketch.py'] = ""; // Default empty
    }

    if(currentFile === filename) {
        switchToFile('sketch.py', false);
    } else {
        saveProjectAndFiles();
        updateFileList();
    }
}


// Link Upload Buttons
uploadFileBtn.addEventListener('click', () => uploadInput.click());
addFileBtn.addEventListener('click', addFile);
uploadInput.addEventListener('change', handleFileUpload);

// --- RUNNER LOGIC ---
function logToConsole(msg, type, filename, line) {
    const el = document.createElement('span');
    el.textContent = msg;
    el.className = type === 'error' ? 'log-error' : 'log-print';
    
    if (type === 'error') {
        el.style.display = 'block';
        el.style.borderBottom = "1px solid #333";
        
        if (filename) {
             const loc = document.createElement('span');
             loc.style.opacity = "0.8";
             loc.style.fontSize = "0.9em";
             loc.style.marginLeft = "8px";
             loc.textContent = `— ${filename}:${line}`;
             el.appendChild(loc);
        }
    }

    el.style.wordWrap = "break-word";

    consoleContent.appendChild(el);
    consoleContent.scrollTop = consoleContent.scrollHeight;
}

function runSketch() {
    consoleContent.innerHTML = "";
    
    // 1. Sync current editor content and Persist to LocalStorage
    // This ensures all modules (including the one currently being edited) are available to the runner
    saveProjectAndFiles();

    // 2. Always execute sketch.py as the entry point
    const code = projectFiles['sketch.py'] || "";
    iframe.contentWindow.name = code;
    
    // Pass 'case' parameter if present
    const params = new URLSearchParams(window.location.search);
    const caseParam = params.get('case');
    
    let runnerUrl = 'runner.html?t=' + Date.now();
    if (caseParam) {
        runnerUrl += '&case=' + caseParam;
    }
    // Pass Project ID so runner knows where to load assets from
    if (projectId) {
        runnerUrl += '&id=' + projectId;
    }
    
    iframe.src = runnerUrl;
}

function stopSketch() {
    iframe.src = 'about:blank';
}

// --- LINKING ---
function generateShareLink() {
    const fileKeys = Object.keys(projectFiles);
    
    // Check if simple single-file text
    const isSingleText = fileKeys.length === 1 && fileKeys[0] === 'sketch.py' && !isBinary(projectFiles['sketch.py']);
    
    if (isSingleText) {
        const code = projectFiles['sketch.py'];
        const compressed = LZString.compressToEncodedURIComponent(code);
        const url = window.location.origin + window.location.pathname.replace('ide.html', 'view.html') + '?code=' + compressed;
        
        navigator.clipboard.writeText(url).then(() => {
            alert("Link copied to clipboard! Share it with anyone.");
        }).catch(err => {
            prompt("Copy this link:", url);
        });
    } else {
        // Multi-file or Binary -> ZIP
        const zip = new JSZip();
        for (const filename in projectFiles) {
            const content = projectFiles[filename];
             if (isBinary(content)) {
                 const parts = content.split(',');
                 if (parts.length === 2) {
                     zip.file(filename, parts[1], {base64: true});
                 }
             } else {
                 zip.file(filename, content);
             }
        }
        
        zip.generateAsync({type:"base64"}).then(function(base64) {
             const compressed = LZString.compressToEncodedURIComponent(base64);
             const url = window.location.origin + window.location.pathname.replace('ide.html', 'view.html') + '?zip=' + compressed;
             
             // Check length warning
             if (url.length > 2000) {
                 if(!confirm(`Warning: The share link is very long (${url.length} chars) and might not work in some browsers/apps. Continue?`)) return;
             }
             
             navigator.clipboard.writeText(url).then(() => {
                alert("Link copied to clipboard!");
            }).catch(err => {
                prompt("Copy this link:", url);
            });
        });
    }
}



// --- RESIZERS ---
const vResizer = document.getElementById('v-resizer');
const hResizer = document.getElementById('h-resizer');
const editorContainer = document.getElementById('editor-container');
const previewContainer = document.getElementById('preview-container');
const consoleContainer = document.getElementById('console-container');

let isResizingV = false;
vResizer.addEventListener('mousedown', (e) => {
    isResizingV = true;
    vResizer.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    iframe.style.pointerEvents = 'none';
});

let isResizingH = false;
hResizer.addEventListener('mousedown', (e) => {
    isResizingH = true;
    hResizer.classList.add('resizing');
    document.body.style.cursor = 'row-resize';
    iframe.style.pointerEvents = 'none';
});

document.addEventListener('mousemove', (e) => {
    if (isResizingV) {
        const totalWidth = document.querySelector('main').clientWidth;
        const newLeftWidth = e.clientX;
        if (newLeftWidth > 100 && newLeftWidth < totalWidth - 100) {
            editorContainer.style.width = newLeftWidth + 'px';
            previewContainer.style.width = (totalWidth - newLeftWidth - 5) + 'px'; 
        }
    }
    if (isResizingH) {
        const totalHeight = editorContainer.clientHeight; 
        const rect = editorContainer.getBoundingClientRect();
        const newConsoleHeight = rect.bottom - e.clientY;
        
        if (newConsoleHeight > 30 && newConsoleHeight < totalHeight - 50) {
             consoleContainer.style.height = newConsoleHeight + 'px';
        }
    }
});

document.addEventListener('mouseup', () => {
     if (isResizingV) {
         isResizingV = false;
         vResizer.classList.remove('resizing');
         iframe.style.pointerEvents = 'auto'; 
     }
     if (isResizingH) {
         isResizingH = false;
         hResizer.classList.remove('resizing');
         iframe.style.pointerEvents = 'auto';
     }
     document.body.style.cursor = 'default';
});

// --- INITIALIZATION ---
async function initializeIDE() {
    // 0. Initialize Project ID / Routing / Migration
    const shouldContinue = await initProjectID();
    if (!shouldContinue) return; // Redirecting...

    // Init URL/Storage loading
    const params = new URLSearchParams(window.location.search);
    
    // 1. URL Loading (?code, ?sketch)
    const urlLoaded = await loadProjectFromURL({
        onImport: (msg) => logToConsole(msg, 'print'),
        onError: (msg) => logToConsole(msg, 'error'),
        onUpdateUI: () => {
            if (typeof editor !== 'undefined' && projectFiles[currentFile]) {
                isProgrammaticChange = true;
                editor.setValue(projectFiles[currentFile]);
                isProgrammaticChange = false;
                editor.clearSelection();
            }
            updateFileList();
            updateProjectNameUI();
        },
        onLoaded: () => {
             saveProjectAndFiles();
        }
    });

    if (urlLoaded) return;

    // Check for failed URL load (to avoid creating empty project on 404)
    if (params.has('sketch')) {
        alert("The requested sketch or project could not be found.");
        return;
    }

    // 2. LocalStorage (Scoped) - Already loaded by initProjectID into 'projectFiles' state if found
    // We just need to check if 'projectFiles' is populated (beyond default empty).
    // Actually initProjectID tries to populate 'projectFiles'.
    
    // Update UI if we have data
    if (Object.keys(projectFiles).length > 0 && projectFiles['sketch.py']) {
         updateProjectNameUI();
         updateFileList();
         switchToFile(currentFile, false);
         return;
    }
    
    // 3. Default (Fallback)
    // If we are here, initProjectID set ID but found no data (Fresh Project)
    // Load default sketch.py template
    try {
         const response = await fetch('sketch.py'); 
         if (response.ok) {
             const text = await response.text();
             projectFiles['sketch.py'] = text;
             isProgrammaticChange = true;
             editor.setValue(text);
             isProgrammaticChange = false;
             updateFileList();
         } else {
             throw new Error("Default sketch not found");
         }
    } catch(e) {
         const defaultCode = "def setup():\n    p5.createCanvas(400, 400)\n\ndef draw():\n    p5.background(220)";
         projectFiles['sketch.py'] = defaultCode;
         isProgrammaticChange = true;
         editor.setValue(defaultCode);
         isProgrammaticChange = false;
         updateFileList();
    }
    editor.clearSelection();
    
    // Ensure registry updated for this new project
    // DEFERRED: saveProjectAndFiles(); 
    // We do NOT save immediately. Project is ephemeral until first edit.
    updateProjectNameUI();
}
    



// --- GLOBAL EVENT LISTENERS ---
// Editor Change: Handled in editor setup above
// File List Click: Handled in updateFileList

// Editor Save Command (Cmd+S / Ctrl+S)
editor.commands.addCommand({
    name: 'save',
    bindKey: {win: 'Ctrl-S', mac: 'Command-S'},
    exec: function(editor) {
        // Force save immediately
        if (projectFiles[currentFile] && isBinary(projectFiles[currentFile])) return;
        projectFiles[currentFile] = editor.getValue();
        saveProjectAndFiles();
        
        // Visual feedback?
        const status = document.createElement('div');
        status.textContent = "Saved!";
        status.style.position = 'absolute';
        status.style.bottom = '10px';
        status.style.right = '10px';
        status.style.background = '#28a745';
        status.style.color = 'white';
        status.style.padding = '5px 10px';
        status.style.borderRadius = '3px';
        status.style.zIndex = '1000';
        document.body.appendChild(status);
        setTimeout(() => status.remove(), 1000);
    }
});


// Rename File logic (Double click file item?)
// Not implemented yet. Can be added later.


// Close Modal when clicking outside
window.onclick = function(event) {
    if (event.target == document.getElementById('settings-modal')) {
        closeSettings();
    }
}

// Remove previously attached listeners to avoid dupes?
// This script is loaded once, so fine.

// Run Sketch on Load?
// No, user should click Run.


// --- DEPRECATED ASSETS MODAL LOGIC (Removed) ---
// ...


// --- FINALIZE ---
// Make functions global if needed (for HTML onclicks)
window.switchToFile = switchToFile;
window.deleteFile = deleteFile;


// File Upload Helpers
function isBinary(content) {
    return content && content.startsWith("data:");
}


// --- IFRAME MESSAGING ---
window.addEventListener('message', (event) => {
     const data = event.data;
     if (data && data.type === 'print') {
         logToConsole(data.message, 'print');
     } else if (data && data.type === 'error') {
         // Extract filename and line if available
         logToConsole(data.message, 'error', data.filename, data.line);
     }
});
// BIND EVENTS
runBtn.addEventListener('click', runSketch);
stopBtn.addEventListener('click', stopSketch);
clearConsoleBtn.addEventListener('click', () => {
    consoleContent.innerHTML = "";
});
// Bind Export (Save)
// The Save Button (floppy disk) should trigger the Zip Export now?
// User said: "load button will necessarily erase all files... If any file was changed after the last 'Save'".
// This implies the 'Save' button is the way to 'Persist' state as a Zip.
// So yes, Save Button -> triggerExport()
// Bind Export (Download)
if (downloadBtn) {
    downloadBtn.addEventListener('click', triggerExport);
}

newBtn.addEventListener('click', newProject);

loadBtn.addEventListener('click', () => {
    // Check dirty handled by click? No, input click opens dialog immediately.
    // We should check dirty BEFORE clicking input?
    // Browser security prevents programmatic click if not user initiated?
    // Actually we can do it if initiated by user click on button.
    if(checkDirty()) {
        fileInput.click();
    }
}); 
shareBtn.addEventListener('click', generateShareLink);
fileInput.addEventListener('change', (e) => loadProjectFromBlob(e.target.files[0], e.target.files[0].name, {
    onImport: (msg) => logToConsole(msg, 'print'),
    onError: (msg) => logToConsole(msg, 'error'),
    onUpdateUI: () => {
        // Logic to update editor content based on currentFile
        const content = projectFiles[currentFile];
        if (isBinary(content)) {
            editor.setValue(`<< Binary File: ${currentFile} >>`);
            editor.setReadOnly(true);
        } else {
            isProgrammaticChange = true;
            editor.setValue(content);
            isProgrammaticChange = false;
            editor.setReadOnly(false);
        }
        updateFileList();
    }
}));

// Removed assetsBtn listener
// Removed setupExportHandlers call



// Setup Export - REMOVED (using triggerExport directly)
// setupExportHandlers(...)

// Modal Overlay Click - Only for Settings now
document.getElementById('modal-overlay').addEventListener('click', () => {
     document.getElementById('settings-modal').style.display = 'none';
     document.getElementById('modal-overlay').style.display = 'none';
});


// --- SETTINGS LOGIC ---
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const settingsBtn = document.getElementById('settings-btn');
const settingTheme = document.getElementById('setting-theme');
const settingFontSize = document.getElementById('setting-fontsize');
const settingSoftTabs = document.getElementById('setting-softtabs');
const settingInvisibles = document.getElementById('setting-invisibles');

function openSettings() {
    // Populate form with current settings
    settingTheme.value = currentSettings.theme;
    settingFontSize.value = currentSettings.fontSize;
    settingSoftTabs.checked = currentSettings.softTabs;
    settingInvisibles.checked = currentSettings.showInvisibles;
    
    settingsModal.style.display = 'block';
    document.getElementById('modal-overlay').style.display = 'block';
}

function closeSettings() {
    settingsModal.style.display = 'none';
    document.getElementById('modal-overlay').style.display = 'none';
}

settingsBtn.addEventListener('click', openSettings);
closeSettingsBtn.addEventListener('click', closeSettings);

// Bind Inputs
settingTheme.addEventListener('change', (e) => updateSetting('theme', e.target.value));
settingFontSize.addEventListener('change', (e) => updateSetting('fontSize', e.target.value));
settingSoftTabs.addEventListener('change', (e) => updateSetting('softTabs', e.target.checked));

settingInvisibles.addEventListener('change', (e) => updateSetting('showInvisibles', e.target.checked));

// --- PROJECT NAME LOGIC ---
function updateProjectNameUI() {
    if (projectNameLabel) projectNameLabel.textContent = projectName;
}
window.updateProjectNameUI = updateProjectNameUI; // Expose to project_manager.js

renameBtn.addEventListener('click', () => {
    const newName = prompt("Rename Project:", projectName);
    if (newName && newName.trim() !== "") {
        renameProject(newName.trim());
    }
});

// --- PROJECTS MODAL LOGIC ---
const projectsModal = document.getElementById('projects-modal');
const closeProjectsBtn = document.getElementById('close-projects-btn');
const projectList = document.getElementById('project-list');

function openProjectsModal() {
    renderProjectList();
    projectsModal.style.display = 'block';
    document.getElementById('modal-overlay').style.display = 'block';
}

function closeProjectsModal() {
    projectsModal.style.display = 'none';
    document.getElementById('modal-overlay').style.display = 'none';
}

function renderProjectList() {
    projectList.innerHTML = '';
    const registry = getProjectRegistry(); // from project_manager.js
    const ids = Object.keys(registry);
    
    // Sort by lastModified desc
    ids.sort((a, b) => (registry[b].lastModified || 0) - (registry[a].lastModified || 0));
    
    if (ids.length === 0) {
        projectList.innerHTML = '<li style="color:#aaa; padding:10px;">No saved projects.</li>';
        return;
    }
    
    ids.forEach(id => {
        const p = registry[id];
        const li = document.createElement('li');
        li.style.padding = '10px';
        li.style.borderBottom = '1px solid #444';
        li.style.display = 'flex';
        li.style.justifyContent = 'space-between';
        li.style.alignItems = 'center';
        
        // Info Div
        const info = document.createElement('div');
        info.style.cursor = 'pointer';
        info.style.flex = '1';
        info.onclick = () => {
            // Open Project
            console.log(`Opening project: ${p.name} (ID: ${p.id})`);
            if (p.id === projectId) {
                alert("This project is already open.");
                return;
            }
            window.location.href = `ide.html?id=${p.id}`;
        };
        
        const name = document.createElement('div');
        name.style.fontWeight = 'bold';
        name.style.color = '#fff';
        name.textContent = p.name || p.id;
        
        const meta = document.createElement('div');
        meta.style.fontSize = '0.8em';
        meta.style.color = '#aaa';
        const date = p.lastModified ? new Date(p.lastModified).toLocaleString() : 'Unknown';
        meta.textContent = `Last modified: ${date}`;
        
        info.appendChild(name);
        info.appendChild(meta);
        li.appendChild(info);
        
        // Delete Button
        const delBtn = document.createElement('button');
        delBtn.textContent = '🗑';
        delBtn.style.background = 'transparent';
        delBtn.style.border = 'none';
        delBtn.style.color = '#d9534f';
        delBtn.style.cursor = 'pointer';
        delBtn.style.fontSize = '1.2em';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm(`Delete project "${p.name}"? This cannot be undone.`)) {
                deleteProjectFromRegistry(p.id); // from project_manager.js
                renderProjectList(); // Re-render
            }
        };
        
        li.appendChild(delBtn);
        projectList.appendChild(li);
    });
}

openBtn.addEventListener('click', openProjectsModal);
closeProjectsBtn.addEventListener('click', closeProjectsModal);

// Update window.onclick to handle projects modal too
const originalWindowOnClick = window.onclick;
window.onclick = function(event) {
    if (originalWindowOnClick) originalWindowOnClick(event);
    if (event.target == projectsModal) closeProjectsModal();
    if (event.target == document.getElementById('modal-overlay')) {
        closeSettings();
        closeProjectsModal();
    }
}


// Start
initializeIDE();
// --- VIEW BUTTON ---
if (viewBtn) {
    viewBtn.addEventListener('click', () => {
        // 1. Force Save (Sync editor to projectFiles -> LocalStorage)
        projectFiles[currentFile] = editor.getValue();
        saveProjectAndFiles();
        
        // 2. Open View
        if (projectId) {
            window.open(`view.html?id=${projectId}`, '_blank');
        } else {
            alert("Project ID not found. Please save first.");
        }
    });
}
