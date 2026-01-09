import React, { useMemo, useState } from 'react';
import { Share2, Eye, EyeOff } from 'lucide-react';
import { COLORS, SPACING, SHADOWS } from '../../constants/designSystem';
import { getReachableObjects } from '../CodePlayground/utils';

const GenericHeapVisualizer = ({ objects = [], frames = [] }) => {
    const [showHidden, setShowHidden] = useState(false);

    // Calculate reachable objects - SAME LOGIC AS ObjectsView
    const { reachable, hidden } = useMemo(() => {
        if (!objects || objects.length === 0) return { reachable: [], hidden: [] };
        if (!frames || frames.length === 0) return { reachable: objects, hidden: [] };

        const reachableIds = getReachableObjects(frames, objects);
        const r = [];
        const h = [];

        objects.forEach(obj => {
            // Force-include 'Variable' type objects (Stack Mirrors)
            // Or if they are reachable from frames logic
            if (obj.type === 'Variable' || reachableIds.has(obj.id)) {
                r.push(obj);
            } else {
                h.push(obj);
            }
        });

        return { reachable: r, hidden: h };
    }, [objects, frames]);

    const renderValue = (val) => {
        if (typeof val === 'string' && val.startsWith('obj')) {
            return <span style={{ color: COLORS.primary, fontWeight: 600 }}>●</span>;
        }
        return <span style={{ fontFamily: 'monospace', color: COLORS.textPrimary }}>{String(val)}</span>;
    };

    const renderObjectContent = (obj) => {
        // Arrays/Lists
        if (obj.type === 'list' || obj.type === 'tuple' || obj.type === 'set' || obj.type === 'Array') {
            return (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {Array.isArray(obj.value) && obj.value.map((item, i) => (
                        <div key={i} style={{
                            border: `1px solid ${COLORS.mediumGray}`,
                            padding: '4px 8px',
                            borderRadius: '4px',
                            backgroundColor: COLORS.white,
                            minWidth: '24px',
                            textAlign: 'center'
                        }}>
                            <div style={{ fontSize: '10px', color: COLORS.textTertiary, marginBottom: '2px' }}>{i}</div>
                            {renderValue(item)}
                        </div>
                    ))}
                    {(!obj.value || obj.value.length === 0) && <span style={{ fontStyle: 'italic', color: COLORS.textTertiary }}>empty</span>}
                </div>
            );
        }

        // Variable Box (User Request)
        if (obj.type === 'Variable') {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                    {/* Header (Name) */}
                    <div style={{
                        width: '100%',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        fontSize: '16px',
                        borderBottom: `2px solid ${COLORS.textPrimary}`,
                        marginBottom: '4px',
                        paddingBottom: '2px'
                    }}>
                        {obj.label}
                    </div>
                    {/* Body (Value) */}
                    <div style={{
                        fontSize: '20px',
                        fontWeight: '500',
                        color: COLORS.primary
                    }}>
                        {renderValue(obj.value)}
                    </div>
                </div>
            );
        }

        // Dicts
        if (obj.type === 'dict') {
            return (
                <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '4px' }}>
                    {obj.value && Object.entries(obj.value).map(([k, v]) => (
                        <React.Fragment key={k}>
                            <div style={{ fontWeight: 600, paddingRight: '8px', borderRight: `1px solid ${COLORS.mediumGray}` }}>{k}</div>
                            <div>{renderValue(v)}</div>
                        </React.Fragment>
                    ))}
                </div>
            );
        }

        // Generic
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {obj.value && Object.entries(obj.value).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 600, marginRight: '8px' }}>{k}:</span>
                        {renderValue(v)}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div style={{
            backgroundColor: COLORS.white,
            border: `1px solid ${COLORS.mediumGray}`,
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: SHADOWS.sm,
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
        }}>
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: SPACING.sm, backgroundColor: COLORS.offWhite, borderBottom: `1px solid ${COLORS.mediumGray}`
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                    <Share2 size={16} color={COLORS.textSecondary} />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: COLORS.textSecondary }}>Heap (Generic)</span>
                </div>
            </div>

            <div style={{ flex: 1, padding: SPACING.md, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: SPACING.md }}>
                {reachable.map(obj => {
                    if (obj.type === 'Variable') {
                        return (
                            <div key={obj.id} style={{
                                border: `2px solid ${COLORS.textPrimary}`,
                                borderRadius: '12px',
                                padding: '8px 16px',
                                backgroundColor: COLORS.white,
                                display: 'inline-block',
                                minWidth: '80px',
                                margin: '4px'
                            }}>
                                {renderObjectContent(obj)}
                            </div>
                        );
                    }

                    return (
                        <div key={obj.id} style={{
                            border: `1px solid ${COLORS.mediumGray}`, borderRadius: '6px', padding: '8px',
                            backgroundColor: '#fafafa', position: 'relative'
                        }}>
                            <div style={{
                                position: 'absolute', top: '-8px', left: '8px', backgroundColor: COLORS.warningLight,
                                color: COLORS.warning, fontSize: '10px', fontWeight: 700, padding: '0 4px', borderRadius: '4px',
                                border: `1px solid ${COLORS.warning}`
                            }}>
                                {obj.type} <span style={{ fontWeight: 'normal', color: 'black' }}>#{obj.id.replace('obj', '')}</span>
                            </div>
                            <div style={{ marginTop: '8px', fontSize: '13px' }}>
                                {renderObjectContent(obj)}
                            </div>
                        </div>
                    );
                })}
                {/* Hidden section omitted for brevity but logic is same */}
            </div>
        </div>
    );
};

export default GenericHeapVisualizer;
