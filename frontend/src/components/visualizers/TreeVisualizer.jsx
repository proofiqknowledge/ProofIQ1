import React, { useMemo } from 'react';
import Tree from 'react-d3-tree';
import { Share2 } from 'lucide-react';
import { COLORS, SPACING, SHADOWS } from '../../constants/designSystem';

const TreeVisualizer = ({ objects, rootId }) => {

    const treeData = useMemo(() => {
        if (!rootId || !objects) return null;
        const objectMap = new Map(objects.map(o => [o.id, o]));

        const buildNode = (id, visited = new Set()) => {
            if (!id || !objectMap.has(id)) return null;
            if (visited.has(id)) return { name: 'Cycle', attributes: { id } }; // Stop cycles

            visited.add(id);
            const obj = objectMap.get(id);
            const val = obj.value.val || obj.value.value || obj.value.data || obj.id;

            const node = {
                name: String(val),
                attributes: {
                    id: id.replace('obj', '')
                },
                children: []
            };

            // Binary Tree
            if ('left' in obj.value) {
                const l = obj.value.left;
                if (l && l !== 'null' && l !== 'None') {
                    const child = buildNode(l, new Set(visited));
                    if (child) node.children.push(child);
                }
            }
            if ('right' in obj.value) {
                const r = obj.value.right;
                if (r && r !== 'null' && r !== 'None') {
                    const child = buildNode(r, new Set(visited));
                    if (child) node.children.push(child);
                }
            }

            // N-ary Tree (children array)
            if ('children' in obj.value && Array.isArray(obj.value.children)) {
                obj.value.children.forEach(childId => {
                    if (childId && childId !== 'null') {
                        const child = buildNode(childId, new Set(visited));
                        if (child) node.children.push(child);
                    }
                });
            }

            return node;
        };

        return buildNode(rootId);
    }, [objects, rootId]);

    if (!treeData) return <div>No Tree Data</div>;

    return (
        <div style={{
            backgroundColor: COLORS.white,
            border: `1px solid ${COLORS.mediumGray}`,
            borderRadius: '8px',
            overflow: 'hidden',
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
                <span style={{ fontWeight: 600, color: COLORS.primary }}>Tree Visualization</span>
            </div>

            <div style={{ flex: 1, width: '100%', height: '100%' }}>
                <Tree
                    data={treeData}
                    orientation="vertical"
                    pathFunc="step"
                    translate={{ x: 200, y: 50 }}
                    nodeSize={{ x: 100, y: 100 }}
                    renderCustomNodeElement={rd3tProps => (
                        <g>
                            <circle r="25" fill={COLORS.white} stroke={COLORS.primary} strokeWidth="2" />
                            <text dy=".31em" x="-30" textAnchor="end" fontSize="10" fill={COLORS.textTertiary}>#{rd3tProps.nodeDatum.attributes?.id}</text>
                            <text dy=".31em" textAnchor="middle" fontWeight="bold" fontSize="14">
                                {rd3tProps.nodeDatum.name}
                            </text>
                        </g>
                    )}
                />
            </div>
        </div>
    );
};

export default TreeVisualizer;
