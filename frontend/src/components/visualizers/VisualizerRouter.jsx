import React, { useMemo } from 'react';
import GenericHeapVisualizer from './GenericHeapVisualizer';
import LinkedListVisualizer from './LinkedListVisualizer';
import TreeVisualizer from './TreeVisualizer';
import ArrayVisualizer from './ArrayVisualizer';
import GraphVisualizer from './GraphVisualizer';
import { detectStructure, STRUCTURE_TYPES } from '../../utils/structureDetector';

const VisualizerRouter = ({ objects: inputObjects, frames }) => {

    // 1. Normalize objects to Array (Handle Object/Map input)
    const objects = useMemo(() => {
        if (Array.isArray(inputObjects)) return inputObjects;
        if (inputObjects && typeof inputObjects === 'object') {
            return Object.entries(inputObjects).map(([id, val]) => ({ id, ...val }));
        }
        return [];
    }, [inputObjects]);

    // 2. Variable Mirroring Strategy
    // The user wants ALl variables (even primitives) to appear in the Heap View as boxes.
    // We create "Virtual Objects" for every variable in the top stack frame.
    const objectsWithVars = useMemo(() => {
        if (!frames || frames.length === 0) return objects;

        const topFrame = frames[frames.length - 1]; // Active frame
        if (!topFrame || !topFrame.variables) return objects;

        const varObjects = Object.entries(topFrame.variables)
            // Filter out internal tracer messages/metadata
            .filter(([name]) => !['Status', 'Note', 'Message', 'Error', 'Exception'].includes(name))
            .map(([name, val]) => ({
                id: `var_${name}`, // Unique ID for variable mirror
                type: 'Variable',  // Special type for renderer
                label: name,       // Variable Name
                value: val         // Variable Value
            }));

        // Filter out variables that are already pointers to existing objects to avoid duplication?
        // User said "if i get any variables it should create a box". 
        // If 'sc' is an object, frames has 'sc': 'obj0x...'.
        // If we make a box for 'sc', it will show "obj0x...". This is okay, or we can resolve it.
        // For primitives, it shows value.

        return [...varObjects, ...objects];
    }, [objects, frames]);

    const { structureType, rootId } = useMemo(() => {
        return detectStructure(objects, frames);
    }, [objects, frames]);

    // Pass ENHANCED objects to visualizers
    const vizProps = { objects: objectsWithVars, frames, rootId };

    // console.log('Detected Structure:', structureType, rootId);

    switch (structureType) {
        case STRUCTURE_TYPES.LINKED_LIST:
            return <LinkedListVisualizer objects={objectsWithVars} frames={frames} rootId={rootId} />;

        case STRUCTURE_TYPES.TREE:
            return <TreeVisualizer objects={objectsWithVars} rootId={rootId} />;

        case STRUCTURE_TYPES.ARRAY:
            return <ArrayVisualizer objects={objectsWithVars} rootId={rootId} />;

        case STRUCTURE_TYPES.GRAPH:
            return <GraphVisualizer objects={objectsWithVars} rootId={rootId} />;

        case STRUCTURE_TYPES.GENERIC:
        default:
            return <GenericHeapVisualizer objects={objectsWithVars} frames={frames} />;
    }
};

export default VisualizerRouter;
