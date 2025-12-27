
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
const newBtn = document.getElementById('new-btn');
const loadBtn = document.getElementById('load-btn');
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

// Auto-save logic (Debounced)
let autoSaveTimeout;
editor.session.on('change', function(delta) {
    isDirty = true; // Mark dirty immediately on edit
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
        // Prevent overwriting binary files with placeholder
        if (projectFiles[currentFile] && isBinary(projectFiles[currentFile])) return;

        projectFiles[currentFile] = editor.getValue();
        saveProjectAndFiles();
    }, 2000); 
});

// --- FILE PANEL ---
toggleSidebarBtn.addEventListener('click', () => {
     if (filePanelEl.style.display === 'flex') {
         filePanelEl.style.display = 'none';
         toggleSidebarBtn.textContent = '>';
     } else {
         filePanelEl.style.display = 'flex';
         toggleSidebarBtn.textContent = '<';
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
            delBtn.textContent = '✖';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                deleteFile(filename);
            };
            li.appendChild(delBtn);
        }

        fileListEl.appendChild(li);
    }
}

function switchToFile(filename, saveCurrent = true) {
    // Save current content first if it was text
    if (saveCurrent && projectFiles[currentFile] !== undefined && !isBinary(projectFiles[currentFile])) {
        projectFiles[currentFile] = editor.getValue();
    }

    currentFile = filename;
    
    const content = projectFiles[currentFile];
    if (isBinary(content)) {
        // Show placeholder or read-only
        editor.setValue(`<< Binary File: ${filename} >>\n<< Content hidden >>`);
        editor.setReadOnly(true);
    } else {
        editor.setValue(content || "");
        editor.setReadOnly(false);
    }
    
    editor.clearSelection();
    updateFileList();
    // No saveProjectAndFiles() needed here? Actually we might want to sync if we changed file.
    // But saveProjectAndFiles checks if binary anyway.
    saveProjectAndFiles();
}

function addFile() {
    const name = prompt("Enter new filename (ending in .py):", "new_module.py");
    if (!name) return;
    if (!name.endsWith('.py')) {
        alert("Filename must end with .py");
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
    
    iframe.src = runnerUrl;
}

function stopSketch() {
    iframe.src = 'about:blank';
}

// --- LINKING ---
function generateShareLink() {
    const code = editor.getValue();
    const compressed = LZString.compressToEncodedURIComponent(code);
    const url = window.location.origin + window.location.pathname.replace('ide.html', 'view.html') + '?code=' + compressed;
    
    navigator.clipboard.writeText(url).then(() => {
        alert("Link copied to clipboard! Share it with anyone.");
    }).catch(err => {
        prompt("Copy this link:", url);
    });
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
    // Init URL/Storage loading
    const params = new URLSearchParams(window.location.search);
    
    // 1. URL Loading (?code, ?sketch)
    const urlLoaded = await loadProjectFromURL({
        onImport: (msg) => logToConsole(msg, 'print'),
        onError: (msg) => logToConsole(msg, 'error'),
        onUpdateUI: () => {
            if (typeof editor !== 'undefined' && projectFiles[currentFile]) {
                editor.setValue(projectFiles[currentFile]);
                editor.clearSelection();
            }
            updateFileList();
        },
        onLoaded: () => {
             // For ?sketch=... we might want to trigger a save to persist it?
             // Or maybe not, keep it read-only until user edits?
             // Previous logic saved it. Let's save.
             saveProjectAndFiles();
        }
    });

    if (urlLoaded) return;

    // 2. LocalStorage
    const savedProject = localStorage.getItem(PROJECT_KEY);
    if (savedProject) {
        try {
            projectFiles = JSON.parse(savedProject);
            // Ensure sketch.py exists
            if (!projectFiles['sketch.py']) {
                projectFiles['sketch.py'] = "";
            }
            // Ensure valid currentFile
            if (!projectFiles[currentFile]) {
                currentFile = 'sketch.py';
            }
            

            updateFileList(); // Refresh UI list
            switchToFile(currentFile, false); // Load content
            
            // Load Project Name
            const savedName = localStorage.getItem(PROJECT_NAME_KEY);
            if (savedName) projectName = savedName;
            updateProjectNameUI();
            
            return; // STOP here if loaded successfully
            
        } catch (e) {
            console.error("Failed to parse project:", e);
            // Fallback
        }
    }
    
    // 2.a Legacy Migration (Only if no new project found)
    if (!savedProject) {
        const oldSavedCode = localStorage.getItem('py5script_autosave'); 
        if (oldSavedCode) {
             console.log("Migrating legacy autosave...");
             projectFiles['sketch.py'] = oldSavedCode;
             editor.setValue(oldSavedCode);
             updateFileList();
             saveProjectAndFiles(); // Migrate to new format
             localStorage.removeItem('py5script_autosave'); // Clean up
             return;
        }
    }
    
    // 3. Default
    try {
         const response = await fetch('sketch.py'); 
         if (response.ok) {
             const text = await response.text();
             projectFiles['sketch.py'] = text;
             editor.setValue(text);
             updateFileList();
         } else {
             throw new Error("Default sketch not found");
         }
    } catch(e) {
         const defaultCode = "def setup():\n    p5.createCanvas(400, 400)\n\ndef draw():\n    p5.background(220)";
         projectFiles['sketch.py'] = defaultCode;
         editor.setValue(defaultCode);
         updateFileList();
    }
    editor.clearSelection();
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
const saveBtn = document.getElementById('save-btn');
saveBtn.addEventListener('click', triggerExport);

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
            editor.setValue(content);
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
        projectName = newName.trim();
        isDirty = true;
        saveProjectAndFiles(); // Persist changes
    }
});

// Start
initializeIDE();

