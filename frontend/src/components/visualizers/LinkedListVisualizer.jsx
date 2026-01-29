import React, { useMemo } from 'react';
import { Share2 } from 'lucide-react';
import { COLORS, SPACING, SHADOWS } from '../../constants/designSystem';

const LinkedListVisualizer = ({ objects, frames, rootId }) => {

    const { nodes, edges } = useMemo(() => {
        if (!rootId || !objects) return { nodes: [], edges: [] };

        const objectMap = new Map(objects.map(o => [o.id, o]));

        // 1. Identify Stack Pointers (e.g. head, temp -> Node)
        const nodePointers = new Map(); // nodeId -> [varNames]
        if (frames && frames.length > 0) {
            const topFrame = frames[frames.length - 1];
            if (topFrame.variables) {
                Object.entries(topFrame.variables).forEach(([name, val]) => {
                    if (typeof val === 'string' && val.startsWith('obj')) {
                        if (!nodePointers.has(val)) nodePointers.set(val, []);
                        nodePointers.get(val).push(name);
                    }
                });
            }
        }

        const listNodes = [];
        const listEdges = [];

        let currentId = rootId;
        let x = 50;
        const y = 80;
        const nodeWidth = 120;
        const nodeHeight = 60;
        const gap = 60;

        const visited = new Set();

        while (currentId && objectMap.has(currentId)) {
            if (visited.has(currentId)) {
                // Cycle detected - draw edge back and stop
                const targetIndex = listNodes.findIndex(n => n.id === currentId);
                if (targetIndex !== -1) {
                    const sourceX = x - gap - nodeWidth; // previous node
                    const targetNode = listNodes[targetIndex];
                    // Curve back
                    listEdges.push({
                        x1: sourceX + nodeWidth, y1: y + nodeHeight / 2,
                        x2: targetNode.x + nodeWidth / 2, y2: targetNode.y + nodeHeight,
                        isCycle: true
                    });
                }
                break;
            }
            visited.add(currentId);

            const obj = objectMap.get(currentId);
            const val = obj.value.val || obj.value.value || obj.value.data || '?';

            listNodes.push({
                id: currentId,
                val: String(val),
                x, y,
                obj, // keep ref
                pointers: nodePointers.get(currentId) || [] // Inject stack pointers
            });

            // Edge to next
            // Edge to next
            const nextProp = ['next', 'nxt', 'link'].find(p => p in obj.value);
            const nextId = nextProp ? obj.value[nextProp] : null;

            if (nextId && typeof nextId === 'string' && nextId.startsWith('obj')) {
                // Draw arrow to next position
                listEdges.push({
                    x1: x + nodeWidth,
                    y1: y + nodeHeight / 2,
                    x2: x + nodeWidth + gap,
                    y2: y + nodeHeight / 2,
                    isCycle: false
                });
                x += nodeWidth + gap;
                currentId = nextId;
            } else {
                // End of list (null)
                // Draw small null box
                listNodes.push({
                    id: 'null-' + currentId,
                    val: 'NULL',
                    x: x + nodeWidth + gap,
                    y: y + 15, // center vertically roughly
                    isNull: true
                });
                listEdges.push({
                    x1: x + nodeWidth, y1: y + nodeHeight / 2,
                    x2: x + nodeWidth + gap, y2: y + nodeHeight / 2
                });
                currentId = null;
            }
        }

        return { nodes: listNodes, edges: listEdges };
    }, [objects, rootId]);

    return (
        <div style={{
            backgroundColor: COLORS.white,
            border: `1px solid ${COLORS.mediumGray}`,
            borderRadius: '8px',
            overflow: 'auto',
            boxShadow: SHADOWS.sm,
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{
                padding: SPACING.sm, backgroundColor: COLORS.offWhite, borderBottom: `1px solid ${COLORS.mediumGray}`,
                display: 'flex', gap: SPACING.sm, alignItems: 'center'
            }}>
                <Share2 size={16} color={COLORS.primary} />
                <span style={{ fontWeight: 600, color: COLORS.primary }}>Linked List Visualization</span>
            </div>

            <div style={{ flex: 1, minHeight: '300px', overflow: 'auto', position: 'relative' }}>
                <svg width={Math.max(800, nodes.length * 180)} height="100%">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7"
                            refX="9" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#000" />
                        </marker>
                    </defs>

                    {edges.map((edge, i) => (
                        <path
                            key={i}
                            d={edge.isCycle
                                ? `M ${edge.x1} ${edge.y1} Q ${(edge.x1 + edge.x2) / 2} ${edge.y1 + 100} ${edge.x2} ${edge.y2}`
                                : `M ${edge.x1} ${edge.y1} L ${edge.x2} ${edge.y2}`
                            }
                            stroke="#000"
                            strokeWidth="3"
                            fill="none"
                            markerEnd="url(#arrowhead)"
                        />
                    ))}

                    {nodes.map(node => (
                        <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                            {/* Stack Pointers (Variables pointing to this node) */}
                            {node.pointers && node.pointers.length > 0 && (
                                <g transform="translate(50, -10)">
                                    {node.pointers.map((ptr, idx) => (
                                        <g key={ptr} transform={`translate(0, ${-idx * 25})`}>
                                            <text x="0" y="-15" textAnchor="middle" fontSize="14" fontWeight="600" fill={COLORS.textPrimary}>{ptr}</text>
                                            <line x1="0" y1="-10" x2="0" y2="0" stroke={COLORS.textPrimary} strokeWidth="2" markerEnd="url(#arrowhead)" />
                                        </g>
                                    ))}
                                </g>
                            )}

                            {node.isNull ? (
                                <>
                                    {/* Null Box */}
                                    <rect width="60" height="40" rx="4" fill="#d9534f" stroke="#d43f3a" strokeWidth="2" />
                                    <text x="30" y="25" textAnchor="middle" fontSize="14" fill="white" fontWeight="bold">NULL</text>
                                </>
                            ) : (
                                <>
                                    {/* Node Box */}
                                    <rect width="100" height="60" rx="4" fill={COLORS.white} stroke="#000" strokeWidth="2" />

                                    {/* Value */}
                                    <text x="50" y="38" textAnchor="middle" fontSize="20" fontWeight="bold" fontFamily="monospace">{node.val}</text>

                                    {/* Next Pointer Box/Dot */}
                                    <rect x="70" y="0" width="30" height="60" fill="transparent" stroke="none" />
                                </>
                            )}
                        </g>

                    ))}
                </svg>
            </div >
        </div >
    );
};

export default LinkedListVisualizer;
