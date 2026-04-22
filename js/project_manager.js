// =============================================================================
// PROJECT MANAGER — Hybrid storage: Registry in localStorage, Files in IndexedDB
// =============================================================================
// Registry (small metadata: id, name, timestamps) → localStorage, synchronous
// Files    (large data: sketch code, images, shaders) → IndexedDB, async
//
// DB layout (IndexedDB):
//   "files"  objectStore  keyPath:"id"  → { id, files: { filename → string|dataURL } }
//
// localStorage keys:
//   py5script_projects_index  → JSON registry { [id]: { id, name, lastModified, ... } }
// =============================================================================

const DB_NAME     = 'py5script_db';
const DB_VERSION  = 1;
const STORE_FILES = 'files';

// Legacy localStorage constants (kept for migration compatibility)
const LS_REGISTRY_KEY   = 'py5script_projects_index';
const LS_PROJECT_PREFIX = 'project_';

// In-memory state
let projectId    = null;
let projectFiles = { 'sketch.py': '' };
let projectName  = 'My Project';
let currentFile  = 'sketch.py';
let isDirty      = false;

// Shared DB handle
let _dbPromise = null;

// =============================================================================
// IDB HELPERS
// =============================================================================
function openDB() {
    if (_dbPromise) return _dbPromise;
    _dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            console.log(`[IDB] onupgradeneeded fired (${e.oldVersion} → ${e.newVersion}). Stores: [${[...db.objectStoreNames].join(', ')}]`);
            // Only the files store — registry lives in localStorage
            if (!db.objectStoreNames.contains(STORE_FILES)) {
                db.createObjectStore(STORE_FILES, { keyPath: 'id' });
                console.log('[IDB] Created object store: files');
            }
            // Remove legacy registry store if it exists from a previous version
            if (db.objectStoreNames.contains('registry')) {
                db.deleteObjectStore('registry');
                console.log('[IDB] Removed legacy object store: registry');
            }
        };

        req.onsuccess = (e) => {
            const db = e.target.result;
            console.log(`[IDB] Opened successfully. Stores: [${[...db.objectStoreNames].join(', ')}]`);
            resolve(db);
        };
        req.onerror   = (e) => {
            console.error('[IDB] Open failed:', e.target.error);
            _dbPromise = null; // allow retry
            reject(e.target.error);
        };
        req.onblocked = () => {
            console.warn('[IDB] Open blocked — another tab may need to be closed.');
        };
    });
    return _dbPromise;
}

function idbGet(key) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx  = db.transaction(STORE_FILES, 'readonly');
        const req = tx.objectStore(STORE_FILES).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror   = () => reject(req.error);
    }));
}

// Resolves on tx.oncomplete (fully committed) not req.onsuccess (request done,
// tx may still be pending). This prevents subsequent reads from seeing stale data.
function idbPut(value) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx  = db.transaction(STORE_FILES, 'readwrite');
        const req = tx.objectStore(STORE_FILES).put(value);
        tx.oncomplete = () => resolve(req.result);
        tx.onerror    = () => reject(tx.error);
        req.onerror   = () => reject(req.error);
    }));
}

function idbDelete(key) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx  = db.transaction(STORE_FILES, 'readwrite');
        tx.objectStore(STORE_FILES).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror    = () => reject(tx.error);
    }));
}

// =============================================================================
// REGISTRY HELPERS — synchronous, stored in localStorage
// =============================================================================
function getProjectRegistry() {
    try {
        const data = localStorage.getItem(LS_REGISTRY_KEY);
        return data ? JSON.parse(data) : {};
    } catch (e) {
        console.error('Registry parse error:', e);
        return {};
    }
}

function saveProjectRegistry(registry) {
    try {
        localStorage.setItem(LS_REGISTRY_KEY, JSON.stringify(registry));
    } catch (e) {
        console.warn('Failed to save registry to localStorage:', e);
    }
}

function updateRegistryEntry(id, name, lastExported = null) {
    const registry = getProjectRegistry();
    if (!registry[id]) registry[id] = {};
    registry[id].id           = id;
    registry[id].name         = name;
    registry[id].lastModified = Date.now();
    if (lastExported) registry[id].lastExported = lastExported;
    saveProjectRegistry(registry);
}

// Removes the registry entry (sync) and deletes file data from IDB (async, fire-and-forget).
function deleteProjectFromRegistry(id) {
    const registry = getProjectRegistry();
    if (registry[id]) {
        delete registry[id];
        saveProjectRegistry(registry);
    }
    return idbDelete(id).catch(e => console.warn(`IDB delete failed for "${id}":`, e));
}

// =============================================================================
// MIGRATION: old per-project localStorage → IndexedDB files
// =============================================================================
async function migrateFromLocalStorage() {
    // Always scan — no one-shot flag. Picks up projects created in older app versions
    // even after a previous migration has run.
    const registry = getProjectRegistry();
    const ids = Object.keys(registry);
    if (ids.length === 0) return;

    console.log(`[Migration] Found ${ids.length} project(s) in registry: [${ids.join(', ')}]`);

    let migratedCount = 0;
    for (const id of ids) {
        const rawFiles = localStorage.getItem(`${LS_PROJECT_PREFIX}${id}_files`);
        if (!rawFiles) {
            console.log(`[Migration] "${id}" — no _files LS key, skipping (already migrated or LS cleared).`);
            continue;
        }

        try {
            // Check if already in IDB
            const existing = await idbGet(id);
            if (existing && existing.files) {
                console.log(`[Migration] "${id}" — already in IDB, cleaning up LS keys.`);
                localStorage.removeItem(`${LS_PROJECT_PREFIX}${id}_files`);
                localStorage.removeItem(`${LS_PROJECT_PREFIX}${id}_name`);
                localStorage.removeItem(`${LS_PROJECT_PREFIX}${id}_dirty`);
                continue;
            }

            // Parse LS data
            let files;
            try {
                files = JSON.parse(rawFiles);
            } catch (parseErr) {
                console.error(`[Migration] "${id}" — JSON.parse failed:`, parseErr);
                continue;
            }

            // Write to IDB
            console.log(`[Migration] "${id}" — writing to IDB (${Object.keys(files).length} files)...`);
            await idbPut({ id, files });

            // Verify the write by reading back before removing the LS key
            const verify = await idbGet(id);
            if (verify && verify.files) {
                console.log(`[Migration] "${id}" — IDB write verified. Removing LS keys.`);
                localStorage.removeItem(`${LS_PROJECT_PREFIX}${id}_files`);
                localStorage.removeItem(`${LS_PROJECT_PREFIX}${id}_name`);
                localStorage.removeItem(`${LS_PROJECT_PREFIX}${id}_dirty`);
                migratedCount++;
            } else {
                console.error(`[Migration] "${id}" — IDB write could NOT be verified! Keeping LS keys as fallback.`);
            }

        } catch (e) {
            console.error(`[Migration] "${id}" — exception:`, e);
            // Don't remove LS keys — they stay as fallback
        }
    }

    // Handle very old single-project key (pre-registry)
    const legacySingle = localStorage.getItem('py5script_project');
    if (legacySingle) {
        const oldName = localStorage.getItem('py5script_project_name') || 'Migrated Project';
        const slugify = makeSlugify();
        const id = slugify(oldName) || 'migrated-project';
        try {
            const existing = await idbGet(id);
            if (!existing) {
                const files = JSON.parse(legacySingle);
                await idbPut({ id, files });
                const verify = await idbGet(id);
                if (verify) {
                    updateRegistryEntry(id, oldName);
                    localStorage.removeItem('py5script_project');
                    localStorage.removeItem('py5script_project_name');
                    localStorage.removeItem('py5script_is_dirty');
                }
            }
        } catch (e) {
            console.warn('[Migration] Failed to migrate legacy single project:', e);
        }
    }

    if (migratedCount > 0) {
        console.log(`[Migration] Complete: ${migratedCount} project(s) moved to IndexedDB.`);
    }
}

// =============================================================================
// FILE MANAGEMENT
// =============================================================================
function isBinary(content) {
    return content && content.startsWith('data:');
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
        if (!confirm(`File is large (${(file.size / 1024 / 1024).toFixed(1)} MB). Continue?`)) {
            event.target.value = '';
            return;
        }
    }

    const textExts = ['.py', '.txt', '.csv', '.json', '.md', '.xml', '.yaml',
                      '.gsdict', '.vert', '.frag', '.glsl', '.toml'];
    const isText   = textExts.some(ext => file.name.toLowerCase().endsWith(ext));
    const reader   = new FileReader();

    reader.onload = (e) => {
        projectFiles[file.name] = e.target.result;
        isDirty = true;
        saveProjectAndFiles();
        if (typeof updateFileList === 'function') updateFileList();
        event.target.value = '';
    };

    isText ? reader.readAsText(file) : reader.readAsDataURL(file);
}

// =============================================================================
// PROJECT SAVE / LOAD
// =============================================================================
function getCurrentCode() {
    if (typeof editor !== 'undefined' && editor.getValue && !isBinary(projectFiles[currentFile])) {
        return editor.getValue();
    }
    return projectFiles[currentFile] || '';
}

async function saveProjectAndFiles() {
    if (!projectId) {
        console.warn('No Project ID set, skipping save.');
        return;
    }

    // Sync editor content
    if (typeof editor !== 'undefined' && editor.getValue && !isBinary(projectFiles[currentFile])) {
        projectFiles[currentFile] = editor.getValue();
    }

    try {
        await idbPut({ id: projectId, files: projectFiles });
        updateRegistryEntry(projectId, projectName); // sync
    } catch (e) {
        console.error('saveProjectAndFiles error:', e);
        alert(`Failed to save project: ${e.message}`);
    }

    if (typeof updateProjectNameUI === 'function') updateProjectNameUI();
}

// --- Rename ---
async function renameProject(newName) {
    if (!newName || !newName.trim()) return;
    const slugify = makeSlugify();
    const newId   = slugify(newName);
    if (!newId) { alert('Invalid project name.'); return; }

    if (newId === projectId) {
        projectName = newName;
        isDirty = true;
        await saveProjectAndFiles();
        return;
    }

    const registry = getProjectRegistry();
    if (registry[newId]) {
        alert(`Project "${newName}" already exists. Please choose another name.`);
        return;
    }
    if (!confirm(`This will rename the project to "${newId}" and reload. Continue?`)) return;

    const oldId = projectId;

    // Sync editor
    if (typeof editor !== 'undefined' && editor.getValue && !isBinary(projectFiles[currentFile])) {
        projectFiles[currentFile] = editor.getValue();
    }

    await idbPut({ id: newId, files: projectFiles });
    updateRegistryEntry(newId, newName);
    deleteProjectFromRegistry(oldId); // also deletes old IDB entry

    window.location.href = `ide.html?id=${newId}`;
}

// --- Save As ---
async function saveProjectAs(newName) {
    if (!newName || !newName.trim()) return;
    const slugify = makeSlugify();
    const newId   = slugify(newName);
    if (!newId)           { alert('Invalid project name.'); return; }
    if (newId === projectId) { alert('Please choose a different name for "Save As".'); return; }

    const registry = getProjectRegistry();
    if (registry[newId]) {
        alert(`Project "${newName}" already exists. Please choose another name.`);
        return;
    }

    if (typeof editor !== 'undefined' && editor.getValue && !isBinary(projectFiles[currentFile])) {
        projectFiles[currentFile] = editor.getValue();
    }

    await idbPut({ id: newId, files: { ...projectFiles } });
    updateRegistryEntry(newId, newName);

    window.location.href = `ide.html?id=${newId}`;
}

// --- Dirty check ---
function checkDirty() {
    if (isDirty) {
        return confirm('You have unsaved changes. They will be lost if you proceed. Continue?');
    }
    return true;
}

// =============================================================================
// IMPORT FROM BLOB (ZIP or .py)
// =============================================================================
async function loadProjectFromBlob(blob, filenameHint, callbacks = {}, options = {}) {
    const shouldRedirect = options.redirect !== false;
    const skipRegistry   = options.skipRegistry === true;
    const log = callbacks.onImport || console.log;
    const err = callbacks.onError  || console.error;

    if (!blob) return;

    let newProjectFiles = {};
    let newProjectName  = 'Imported Project';

    if (filenameHint.endsWith('.zip')) {
        try {
            const zip      = await JSZip.loadAsync(blob);
            const textExts = ['.py', '.txt', '.csv', '.json', '.md', '.xml', '.yaml',
                              '.gsdict', '.vert', '.frag', '.glsl', '.toml'];
            let foundPy    = false;

            for (const filename in zip.files) {
                if (zip.files[filename].dir) continue;
                const file   = zip.file(filename);
                const isText = textExts.some(ext => filename.toLowerCase().endsWith(ext));

                if (isText) {
                    newProjectFiles[filename] = await file.async('string');
                } else {
                    const b64 = await file.async('base64');
                    let mime  = 'application/octet-stream';
                    if (filename.endsWith('.png'))                               mime = 'image/png';
                    else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) mime = 'image/jpeg';
                    else if (filename.endsWith('.gif'))                          mime = 'image/gif';
                    newProjectFiles[filename] = `data:${mime};base64,${b64}`;
                }
                if (filename.endsWith('.py')) foundPy = true;
            }

            // Enforce sketch.py entry point
            if (!newProjectFiles['sketch.py']) {
                const pyFile = Object.keys(newProjectFiles).find(k => k === 'main.py') ||
                               Object.keys(newProjectFiles).find(k => k.endsWith('.py'));
                if (pyFile) {
                    newProjectFiles['sketch.py'] = newProjectFiles[pyFile];
                    delete newProjectFiles[pyFile];
                }
            }
            if (!newProjectFiles['sketch.py']) newProjectFiles['sketch.py'] = '';
            if (!foundPy) err('Warning: No Python file found in ZIP.');
            newProjectName = filenameHint.replace(/\.zip$/i, '');

        } catch (e) {
            console.error('ZIP Import Error:', e);
            alert(`Error reading ZIP file: ${e.message}`);
            return;
        }
    } else {
        const text = await blob.text();
        newProjectFiles = { 'sketch.py': text };
        newProjectName  = (filenameHint && filenameHint !== 'sketch.py')
            ? filenameHint.replace(/\.[^/.]+$/, '') || 'My Sketch'
            : 'My Sketch';
    }

    // Resolve ID + collisions
    const slugify    = makeSlugify();
    let newId        = slugify(newProjectName) || ('imported-' + Date.now());
    const registry   = getProjectRegistry();
    const originalId = newId;
    let counter      = 1;
    while (registry[newId]) { newId = `${originalId}-${counter}`; counter++; }
    if (newId !== originalId) newProjectName = `${newProjectName} (${counter - 1})`;

    try {
        await idbPut({ id: newId, files: newProjectFiles });
        if (!skipRegistry) updateRegistryEntry(newId, newProjectName);
    } catch (e) {
        console.error('Failed to save imported project:', e);
        alert(`Failed to save imported project: ${e.message}`);
        return;
    }

    if (callbacks.onImport) callbacks.onImport(`Project imported as "${newProjectName}".`);

    if (shouldRedirect) {
        window.location.href = `ide.html?id=${newId}`;
    } else {
        projectId    = newId;
        projectName  = newProjectName;
        projectFiles = newProjectFiles;
        isDirty      = false;
        if (!projectFiles[currentFile]) {
            const keys = Object.keys(projectFiles);
            currentFile = keys.length > 0 ? keys[0] : 'sketch.py';
        }
    }
}

// =============================================================================
// EXPORT (Download)
// =============================================================================
function triggerExport() {
    try {
        if (typeof editor !== 'undefined' && editor.getValue && !isBinary(projectFiles[currentFile])) {
            projectFiles[currentFile] = editor.getValue();
        }

        const fileKeys = Object.keys(projectFiles);
        if (fileKeys.length === 0) { alert('Project is empty!'); return; }

        updateRegistryEntry(projectId, projectName, Date.now());

        if (fileKeys.length === 1 && fileKeys[0] === 'sketch.py') {
            const blob = new Blob([projectFiles['sketch.py']], { type: 'text/plain;charset=utf-8' });
            const a    = document.createElement('a');
            a.href     = URL.createObjectURL(blob);
            a.download = `${projectName}.py`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
            isDirty = false;
            saveProjectAndFiles();
            return;
        }

        if (typeof JSZip === 'undefined') { alert('JSZip library not loaded!'); return; }
        const zip = new JSZip();
        for (const filename in projectFiles) {
            const content = projectFiles[filename];
            if (isBinary(content)) {
                const parts = content.split(',');
                if (parts.length === 2) zip.file(filename, parts[1], { base64: true });
                else                    zip.file(filename, content);
            } else {
                zip.file(filename, content);
            }
        }

        zip.generateAsync({ type: 'blob' }).then(zblob => {
            const a    = document.createElement('a');
            a.href     = URL.createObjectURL(zblob);
            a.download = `${projectName}.zip`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
            isDirty = false;
            saveProjectAndFiles();
        }).catch(e => alert('Failed to generate ZIP: ' + e.message));

    } catch (e) {
        alert('Export failed: ' + e.message);
    }
}

// =============================================================================
// URL LOADING (?code, ?zip, ?sketch)
// =============================================================================
async function loadProjectFromURL(callbacks = {}) {
    const log    = callbacks.onImport || console.log;
    const err    = callbacks.onError  || console.error;
    const params = new URLSearchParams(window.location.search);
    let   loaded = false;

    const resolveCollision = (name) => {
        const registry = getProjectRegistry();
        const slugify  = makeSlugify();
        let   id       = slugify(name);
        if (registry[id]) {
            if (confirm(`A project named "${name}" already exists. Overwrite it?\n\nClick Cancel to create a copy instead.`)) {
                return { id, name };
            } else {
                let counter = 1;
                while (registry[slugify(`${name} (${counter})`)]) counter++;
                const finalName = `${name} (${counter})`;
                return { id: slugify(finalName), name: finalName };
            }
        }
        return { id, name };
    };

    // 1. ?code=
    if (params.has('code')) {
        const code = LZString.decompressFromEncodedURIComponent(params.get('code'));
        if (code) {
            const resolved = resolveCollision(params.get('name') || 'Shared Project');
            projectId    = resolved.id;
            projectName  = resolved.name;
            projectFiles = { 'sketch.py': code };
            currentFile  = 'sketch.py';
            loaded = true;
        }
    }

    // 2. ?zip=
    if (!loaded && params.has('zip')) {
        const base64 = LZString.decompressFromEncodedURIComponent(params.get('zip'));
        if (base64) {
            try {
                const zip            = await JSZip.loadAsync(base64, { base64: true });
                const newProjectFiles = {};
                const textExts        = ['.py', '.txt', '.csv', '.json', '.md', '.xml', '.yaml',
                                         '.gsdict', '.vert', '.frag', '.glsl', '.toml'];
                for (const filename in zip.files) {
                    if (zip.files[filename].dir) continue;
                    const file   = zip.file(filename);
                    const isText = textExts.some(ext => filename.toLowerCase().endsWith(ext));
                    if (isText) {
                        newProjectFiles[filename] = await file.async('string');
                    } else {
                        const b64 = await file.async('base64');
                        let mime  = 'application/octet-stream';
                        if (filename.endsWith('.png'))                               mime = 'image/png';
                        else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) mime = 'image/jpeg';
                        else if (filename.endsWith('.gif'))                          mime = 'image/gif';
                        newProjectFiles[filename] = `data:${mime};base64,${b64}`;
                    }
                }
                const resolved = resolveCollision(params.get('name') || 'Shared Project');
                projectId    = resolved.id;
                projectName  = resolved.name;
                projectFiles = newProjectFiles;
                currentFile  = projectFiles['sketch.py'] ? 'sketch.py' : (Object.keys(projectFiles)[0] || 'sketch.py');
                loaded = true;
            } catch (e) { err(`Error decompressing ZIP URL: ${e}`); }
        }
    }

    // 3. ?sketch=
    else if (params.has('sketch')) {
        const sketchUrl = params.get('sketch');
        const filename  = sketchUrl.split('/').pop() || 'sketch.py';
        try {
            const response = await fetch(sketchUrl);
            if (response.ok) {
                const blob = await response.blob();
                await loadProjectFromBlob(blob, filename, callbacks,
                    { redirect: false, skipRegistry: callbacks.skipRegistry });
                loaded = true;
            } else {
                err(`Failed to fetch sketch: ${sketchUrl} (${response.status})`);
            }
        } catch (e) { err(`Error fetching sketch: ${e.message}`); }
    }

    if (loaded) {
        if (callbacks.onUpdateUI) callbacks.onUpdateUI();
        if (callbacks.onLoaded)   callbacks.onLoaded();
    }
    return loaded;
}

// =============================================================================
// NEW PROJECT
// =============================================================================
async function newProject() {
    window.location.href = `ide.html?id=${generateProjectName()}`;
}

// =============================================================================
// INITIALIZATION
// =============================================================================
async function initProjectID() {
    // Run migration (always, idempotent)
    await migrateFromLocalStorage();

    const params  = new URLSearchParams(window.location.search);
    const idParam = params.get('id');

    if (idParam) {
        projectId = idParam;

        // --- 1. Try IndexedDB (primary store) ---
        let loadedFromDB = false;
        try {
            const rec = await idbGet(projectId);
            if (rec && rec.files) {
                projectFiles  = rec.files;
                isDirty       = false;
                loadedFromDB  = true;
            }
        } catch (e) {
            console.error('IDB read failed in initProjectID:', e);
        }

        // --- 2. Fallback: localStorage _files key (in case migration didn't run or failed) ---
        if (!loadedFromDB) {
            try {
                const rawFiles = localStorage.getItem(`${LS_PROJECT_PREFIX}${projectId}_files`);
                if (rawFiles) {
                    console.warn(`[initProjectID] "${projectId}" not in IDB — loading from localStorage fallback.`);
                    const files = JSON.parse(rawFiles);
                    projectFiles = files;
                    isDirty = true;
                    // Write to IDB now so future loads use IDB
                    await idbPut({ id: projectId, files });
                    localStorage.removeItem(`${LS_PROJECT_PREFIX}${projectId}_files`);
                    localStorage.removeItem(`${LS_PROJECT_PREFIX}${projectId}_name`);
                } else {
                    // --- 3. Orphan detection ---
                    // Registry has this project but neither IDB nor LS has file data.
                    // This was caused by a previous buggy migration that removed the LS
                    // _files key before confirming the IDB write succeeded.
                    // The project data is gone. Remove the orphan registry entry so
                    // the project list doesn't show a ghost that always loads as template.
                    const registry = getProjectRegistry();
                    if (registry[projectId]) {
                        console.error(`[initProjectID] "${projectId}" is an orphan — data gone from both IDB and LS. Removing registry entry.`);
                        deleteProjectFromRegistry(projectId);
                    }
                }
            } catch (e) {
                console.warn('[initProjectID] localStorage fallback failed:', e);
            }
        }

        // --- Load name from registry (sync) ---
        const registry = getProjectRegistry();
        if (registry[projectId] && registry[projectId].name) {
            projectName = registry[projectId].name;
        } else if (!registry[projectId]) {
            // Truly new project — derive readable name from ID
            projectName = projectId.split('-')
                .map(s => s.charAt(0).toUpperCase() + s.slice(1))
                .join(' ');
        }

    } else {
        // No ?id → generate one and redirect
        let newId;
        const sketchParam = params.get('sketch');
        if (sketchParam) {
            const parts = sketchParam.split('/');
            newId = parts[parts.length - 1].split('.')[0];
        } else {
            newId = generateProjectName();
        }
        params.set('id', newId);
        window.location.search = params.toString();
        return false;
    }

    return true;
}

// =============================================================================
// UTILITIES
// =============================================================================
function makeSlugify() {
    return (text) => text.toString().toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

// =============================================================================
// EXPORTS
// =============================================================================
window.renameProject             = renameProject;
window.saveProjectAs             = saveProjectAs;
window.getProjectRegistry        = getProjectRegistry;
window.deleteProjectFromRegistry = deleteProjectFromRegistry;
