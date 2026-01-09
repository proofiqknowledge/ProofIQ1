import React, { useMemo } from 'react';
import { Share2 } from 'lucide-react';
import { COLORS, SPACING, SHADOWS } from '../../constants/designSystem';

const GraphVisualizer = ({ objects, rootId }) => {

    // Force-Directed Layout Simulation
    const { nodes, edges } = useMemo(() => {
        if (!objects || objects.length === 0) return { nodes: [], edges: [] };

        // 1. Identify Nodes (Exclude Variables and Primitives)
        const nodeList = objects.filter(o =>
            o.type !== 'Variable' &&
            o.value && typeof o.value === 'object'
        );

        if (nodeList.length === 0) return { nodes: [], edges: [] };

        const nodeMap = new Map();

        // Initial Random Positions
        const graphNodes = nodeList.map((obj, i) => {
            return {
                id: obj.id,
                x: 400 + (Math.random() - 0.5) * 200,
                y: 300 + (Math.random() - 0.5) * 200,
                vx: 0, vy: 0,
                val: obj.value.val || obj.value.value || obj.value.data || obj.id.replace('obj', ''),
                obj
            };
        });

        graphNodes.forEach(n => nodeMap.set(n.id, n));
        const graphEdges = [];

        // 2. Identify Edges
        graphNodes.forEach(sourceNode => {
            const val = sourceNode.obj.value;
            const processProp = (propValue) => {
                if (typeof propValue === 'string' && propValue.startsWith('obj') && nodeMap.has(propValue)) {
                    graphEdges.push({ source: sourceNode, target: nodeMap.get(propValue) });
                }
            };

            if (val && typeof val === 'object') {
                Object.values(val).forEach(prop => {
                    processProp(prop);
                    // Adjacency List handling
                    if (Array.isArray(prop)) {
                        prop.forEach(item => processProp(item));
                    }
                });
            }
        });

        // 3. Simulation Loop (Simple Fruchterman-Reingold)
        const ITERATIONS = 100;
        const K = 200; // Optimal distance
        const REPULSION = 50000;
        const ATTRACTION = 0.05;
        const CENTER_GRAVITY = 0.02;

        for (let iter = 0; iter < ITERATIONS; iter++) {
            // Repulsion
            for (let i = 0; i < graphNodes.length; i++) {
                for (let j = i + 1; j < graphNodes.length; j++) {
                    const n1 = graphNodes[i];
                    const n2 = graphNodes[j];
                    const dx = n1.x - n2.x;
                    const dy = n1.y - n2.y;
                    const distSq = dx * dx + dy * dy || 0.1;
                    const dist = Math.sqrt(distSq);

                    const f = REPULSION / distSq;
                    const fx = (dx / dist) * f;
                    const fy = (dy / dist) * f;

                    n1.vx += fx; n1.vy += fy;
                    n2.vx -= fx; n2.vy -= fy;
                }
            }

            // Attraction (Edges)
            graphEdges.forEach(e => {
                const dx = e.target.x - e.source.x;
                const dy = e.target.y - e.source.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;

                const f = (dist - K) * ATTRACTION;
                const fx = (dx / dist) * f;
                const fy = (dy / dist) * f;

                e.source.vx += fx; e.source.vy += fy;
                e.target.vx -= fx; e.target.vy -= fy;
            });

            // Gravity (Center)
            graphNodes.forEach(n => {
                n.vx += (400 - n.x) * CENTER_GRAVITY;
                n.vy += (300 - n.y) * CENTER_GRAVITY;

                // Apply Velocity (Damped)
                n.vx *= 0.6;
                n.vy *= 0.6;
                n.x += n.vx;
                n.y += n.vy;
            });
        }

        // Normalize Edges for Rendering
        const renderEdges = graphEdges.map(e => ({
            x1: e.source.x, y1: e.source.y,
            x2: e.target.x, y2: e.target.y
        }));

        return { nodes: graphNodes, edges: renderEdges };
    }, [objects]);

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
                <span style={{ fontWeight: 600, color: COLORS.primary }}>
                    Graph Visualization (Force Layout)
                </span>
            </div>

            <div style={{ flex: 1, minHeight: '300px', overflow: 'auto', position: 'relative' }}>
                <svg width="800" height="600">
                    <defs>
                        <marker id="arrowhead" markerWidth="10" markerHeight="7"
                            refX="24" refY="3.5" orient="auto">
                            <polygon points="0 0, 10 3.5, 0 7" fill="#999" />
                        </marker>
                    </defs>

                    {edges.map((edge, i) => (
                        <line
                            key={i}
                            x1={edge.x1} y1={edge.y1}
                            x2={edge.x2} y2={edge.y2}
                            stroke="#ccc"
                            strokeWidth="2"
                            markerEnd="url(#arrowhead)"
                        />
                    ))}

                    {nodes.map(node => (
                        <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                            <circle r="20" fill={COLORS.white} stroke={COLORS.primary} strokeWidth="2" />
                            <text dy=".3em" textAnchor="middle" fontSize="12" fontWeight="bold">
                                {String(node.val).substring(0, 5)}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>
        </div>
    );
};

export default GraphVisualizer;
