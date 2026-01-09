/**
 * Structure Detector
 * Analyzes heap patterns to classify data structures.
 */

export const STRUCTURE_TYPES = {
    ARRAY: 'ARRAY',
    LINKED_LIST: 'LINKED_LIST',
    TREE: 'TREE',
    GRAPH: 'GRAPH',
    GENERIC: 'GENERIC'
};

/**
 * Main detection entry point
 * @param {Array} objects - Heap objects [{id, type, value}, ...]
 * @param {Array} frames - Stack frames
 * @returns {Object} { structureType, rootId, validNodes }
 */
export const detectStructure = (inputObjects, frames) => {
    // 1. Normalize objects to Array (Handle Object/Map input from legacy/unfixed backends)
    let objects = inputObjects;
    if (!Array.isArray(inputObjects)) {
        if (inputObjects && typeof inputObjects === 'object') {
            objects = Object.entries(inputObjects).map(([id, val]) => ({ id, ...val }));
        } else {
            return { structureType: STRUCTURE_TYPES.GENERIC };
        }
    }

    if (objects.length === 0) return { structureType: STRUCTURE_TYPES.GENERIC };

    // 1. Detect Arrays (Backend usually handles this, but we verify)
    // If the *primary* focus is an array, return Array type.
    // However, usually arrays are just objects.
    // If we have a single large array that is referenced by a local variable, we might visualize it specially.
    // For now, let's look for Linked Lists and Trees.

    const candidates = findCandidates(objects, frames);

    // Sort candidates by complexity/likelihood
    // We prioritize specific structures over generic ones.

    // Check for Arrays/Lists
    // We prioritize arrays if they are large or explicitly typed
    for (const rootId of candidates) {
        if (isArray(rootId, objects)) {
            return { structureType: STRUCTURE_TYPES.ARRAY, rootId };
        }
    }

    // Check for Tree
    for (const rootId of candidates) {
        if (isTree(rootId, objects)) {
            return { structureType: STRUCTURE_TYPES.TREE, rootId };
        }
    }

    // Check for Linked List
    for (const rootId of candidates) {
        if (isLinkedList(rootId, objects)) {
            return { structureType: STRUCTURE_TYPES.LINKED_LIST, rootId };
        }
    }

    // Check for Graph
    for (const rootId of candidates) {
        if (isGraph(rootId, objects)) {
            return { structureType: STRUCTURE_TYPES.GRAPH, rootId };
        }
    }

    return { structureType: STRUCTURE_TYPES.GENERIC };
};

// --- Helpers ---

/**
 * Find potential root objects referenced by stack frames
 */
const findCandidates = (objects, frames) => {
    const candidates = new Set();
    const objectMap = new Map(objects.map(o => [o.id, o]));

    frames.forEach(frame => {
        if (!frame.variables) return;
        Object.values(frame.variables).forEach(val => {
            if (typeof val === 'string' && val.startsWith('obj')) {
                // It's a reference. Check if it points to a valid object.
                if (objectMap.has(val)) {
                    candidates.add(val);
                }
            }
        });
    });

    return Array.from(candidates);
};

const getObject = (id, objects) => objects.find(o => o.id === id);

/**
 * Linked List Heuristics:
 * - Nodes must have a 'next' pointer.
 * - Nodes should NOT have 'left'/'right' (that's a tree).
 * - Linear structure (mostly).
 */
const isLinkedList = (rootId, objects) => {
    const objectMap = new Map(objects.map(o => [o.id, o]));
    let current = objectMap.get(rootId);
    let count = 0;
    const visited = new Set();

    while (current) {
        if (visited.has(current.id)) return true; // Cycle detected, still valid LL (circular)
        visited.add(current.id);
        count++;

        if (!current.value || typeof current.value !== 'object') return false;

        // Must have 'next' or alias
        const nextProp = ['next', 'nxt', 'link', 'ptr', 'forward', 'pNext', '_next'].find(p => p in current.value);
        if (!nextProp) return false;

        // specific disqualifiers
        if ('left' in current.value || 'right' in current.value || 'leftPtr' in current.value || 'rightPtr' in current.value) return false;

        // DLL needs next (already checked)
        if ('prev' in current.value && !nextProp) return false;

        const nextId = current.value[nextProp];
        if (nextId === 'null' || nextId === null || nextId === 'None') {
            return count > 0; // End of list
        }

        if (typeof nextId === 'string' && nextId.startsWith('obj')) {
            current = objectMap.get(nextId);
        } else {
            // 'next' is not a pointer/null?
            return false;
        }
    }
    return count > 0;
};

/**
 * Tree Heuristics:
 * - Nodes have 'left' and 'right' (Binary) OR 'children' list (N-ary)
 * - 'val' or 'value' field often present
 * - No cycles (strict tree)
 */
const isTree = (rootId, objects) => {
    const objectMap = new Map(objects.map(o => [o.id, o]));
    const root = objectMap.get(rootId);

    if (!root || !root.value) return false;

    // Must look like a node
    // Binary Tree
    const hasLeft = 'left' in root.value || 'leftPtr' in root.value || 'pLeft' in root.value;
    const hasRight = 'right' in root.value || 'rightPtr' in root.value || 'pRight' in root.value;

    if (!hasLeft && !hasRight) return false; // Single leaf is not enough evidence usually

    // Traverse to verify structure consistency
    const stack = [rootId];
    const visited = new Set();
    let nodeCount = 0;

    while (stack.length > 0) {
        const currId = stack.pop();
        if (visited.has(currId)) return false; // Cycles not allowed in strict trees (use Graph for that)
        visited.add(currId);
        nodeCount++;

        const node = objectMap.get(currId);
        if (!node) continue;

        // Check consistency
        const l = node.value.left || node.value.leftPtr || node.value.pLeft;
        const r = node.value.right || node.value.rightPtr || node.value.pRight;

        if (l && typeof l === 'string' && l.startsWith('obj')) stack.push(l);
        if (r && typeof r === 'string' && r.startsWith('obj')) stack.push(r);
    }

    return nodeCount >= 1;
};

/**
 * Array Heuristics:
 * - Backend type is 'list', 'tuple', 'set', or 'Array'
 * - Value is an array
 */
const isArray = (rootId, objects) => {
    const obj = getObject(rootId, objects);
    if (!obj) return false;

    // Check type
    const lowType = (obj.type || '').toLowerCase();
    if (['list', 'tuple', 'set', 'array', 'vector'].includes(lowType)) return true;
    if (Array.isArray(obj.value)) return true;

    return false;
};

/**
 * Graph Heuristics:
 * - Adjacency list (dict/array of lists)
 * - Objects with multiple references that form cycles (and failed Tree check)
 * - Nodes with 'neighbors', 'adj', or generic connections
 */
const isGraph = (rootId, objects) => {
    const obj = getObject(rootId, objects);
    if (!obj || !obj.value) return false;

    // 1. Adjacency List (Dict<Node, List<Node>>)
    if (obj.type === 'dict') {
        // Check if values are lists of pointers
        const values = Object.values(obj.value);
        if (values.length > 0 && Array.isArray(values[0])) {
            // Likely adjacency list
            return true;
        }
    }

    // 2. Node-based Graph (like Tree but with cycles or 'neighbors')
    // We already checked for Tree above. If it failed Tree but looks like a structure with pointers, it might be a Graph.
    const graphFields = ['neighbors', 'adj', 'children', 'adjList', 'edges', 'links'];
    if (graphFields.some(f => f in obj.value)) {
        return true;
    }

    return false;
};
