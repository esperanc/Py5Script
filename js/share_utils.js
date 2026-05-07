/**
 * share_utils.js
 * Utility functions for generating Py5Script share URLs.
 */

/**
 * Encapsulates the logic for creating the 'code=' url parameter.
 * Requires LZString to be loaded in the environment.
 * 
 * @param {string} sketch - The source code of the sketch.
 * @returns {string} The URL parameter string (e.g., 'code=CYUw...').
 */
function createSketchCode(sketch) {
    if (typeof LZString === 'undefined') {
        console.error("LZString library is required but not loaded.");
        return "";
    }
    return 'code=' + LZString.compressToEncodedURIComponent(sketch);
}

// Export for Node.js/CommonJS environments if used as a module
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createSketchCode };
}
