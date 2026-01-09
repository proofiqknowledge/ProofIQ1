/**
 * CodePlayground Utilities
 */

/**
 * Determines which heap objects are reachable from the current stack frames.
 * Used to filter out "internal" or unreferenced objects in the visualization.
 * 
 * @param {Array} frames - The current stack frames from the trace 
 * @param {Array} objects - The complete list of heap objects
 * @returns {Set<string>} - A Set containing the IDs (e.g., "obj1") of all reachable objects
 */
export const getReachableObjects = (frames, objects) => {
    if (!frames || !objects) return new Set();

    const reachableIds = new Set();
    const visitedIds = new Set();

    // 1. Collect all root references from Stack Frames
    // Variables in frames can point to objects (e.g., value: "obj123")
    const roots = [];
    frames.forEach(frame => {
        if (frame.variables) {
            Object.values(frame.variables).forEach(val => {
                // Check if value is a reference string (starts with "obj")
                // Note: The backend typically sends "objX" for references.
                if (typeof val === 'string' && val.startsWith('obj')) {
                    roots.push(val);
                }
                // Handle special cases if value wraps the ref, e.g. ['REF', 'obj1'] - depends on backend format
                // Based on ObjectsView.jsx, it seems direct: val.startsWith('obj')
            });
        }
    });

    // 2. Traverse from roots to find all reachable objects (BFS/DFS)
    const queue = [...roots];

    while (queue.length > 0) {
        const currentId = queue.shift();

        // If we've already processed this object, skip
        if (visitedIds.has(currentId)) continue;

        visitedIds.add(currentId);

        // Find the object data
        const objData = objects.find(o => `obj${o.id.replace('obj', '')}` === currentId || o.id === currentId);

        if (objData) {
            reachableIds.add(objData.id); // Add strict ID match

            // 3. Find references within this object
            // Lists, tuples, sets: check elements
            if (['list', 'tuple', 'set'].includes(objData.type)) {
                if (Array.isArray(objData.value)) {
                    objData.value.forEach(item => {
                        if (typeof item === 'string' && item.startsWith('obj')) {
                            queue.push(item);
                        }
                    });
                }
            }
            // Dicts: check content (keys and values can be objects, though keys usually primitive)
            else if (objData.type === 'dict') {
                if (objData.value) {
                    Object.entries(objData.value).forEach(([k, v]) => {
                        if (typeof k === 'string' && k.startsWith('obj')) queue.push(k);
                        if (typeof v === 'string' && v.startsWith('obj')) queue.push(v);
                    });
                }
            }
            // Class instances: check attributes
            else if (objData.type === 'instance' || objData.type === 'class' || objData.type === 'module') {
                if (objData.value) {
                    Object.values(objData.value).forEach(v => {
                        if (typeof v === 'string' && v.startsWith('obj')) {
                            queue.push(v);
                        }
                    });
                }
            }
            // Other generic types
            else {
                if (objData.value && typeof objData.value === 'object') {
                    Object.values(objData.value).forEach(v => {
                        if (typeof v === 'string' && v.startsWith('obj')) {
                            queue.push(v);
                        }
                    });
                }
            }
        }
    }

    return reachableIds;
};
