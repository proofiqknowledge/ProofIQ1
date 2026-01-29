import React, { useMemo, useState } from 'react';
import { Box as BoxIcon, List as ListIcon, Share2, Eye, EyeOff } from 'lucide-react';
import { COLORS, SPACING, SHADOWS } from '../../constants/designSystem';
import { getReachableObjects } from './utils';

const ObjectsView = ({ objects = [], frames = [] }) => {
    const [showHidden, setShowHidden] = useState(false);

    // Calculate reachable objects
    const { reachable, hidden } = useMemo(() => {
        if (!objects || objects.length === 0) return { reachable: [], hidden: [] };

        // If no frames, assume everything is reachable (or nothing, but let's show all for safety)
        if (!frames || frames.length === 0) return { reachable: objects, hidden: [] };

        const reachableIds = getReachableObjects(frames, objects);

        const r = [];
        const h = [];

        objects.forEach(obj => {
            if (reachableIds.has(obj.id)) {
                r.push(obj);
            } else {
                h.push(obj);
            }
        });

        return { reachable: r, hidden: h };
    }, [objects, frames]);


    // Helper to render value, potentially as a reference
    const renderValue = (val) => {
        if (typeof val === 'string' && val.startsWith('obj')) {
            return <span style={{ color: COLORS.primary, fontWeight: 600 }}>●</span>; // Dot for pointer
        }
        return <span style={{ fontFamily: 'monospace', color: COLORS.textPrimary }}>{String(val)}</span>;
    };

    const renderObjectContent = (obj) => {
        if (obj.type === 'list' || obj.type === 'tuple' || obj.type === 'set') {
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

        if (obj.type === 'dict') {
            return (
                <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', gap: '4px' }}>
                    {obj.value && Object.entries(obj.value).map(([k, v]) => (
                        <React.Fragment key={k}>
                            <div style={{ fontWeight: 600, paddingRight: '8px', borderRight: `1px solid ${COLORS.mediumGray}` }}>{k}</div>
                            <div>{renderValue(v)}</div>
                        </React.Fragment>
                    ))}
                    {(!obj.value || Object.keys(obj.value).length === 0) && <span style={{ fontStyle: 'italic', color: COLORS.textTertiary }}>empty</span>}
                </div>
            );
        }

        // Generic Object / Class Instance
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

    const renderObjectList = (list, isHiddenSection = false) => {
        return list.map((obj) => (
            <div key={obj.id} style={{
                border: `1px solid ${COLORS.mediumGray}`,
                borderRadius: '6px',
                padding: '8px',
                backgroundColor: isHiddenSection ? '#f5f5f5' : '#fafafa',
                position: 'relative',
                opacity: isHiddenSection ? 0.7 : 1
            }}>
                <div style={{
                    position: 'absolute',
                    top: '-8px',
                    left: '8px',
                    backgroundColor: isHiddenSection ? '#ccc' : COLORS.warningLight,
                    color: isHiddenSection ? '#666' : COLORS.warning,
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '0 4px',
                    borderRadius: '4px',
                    border: `1px solid ${isHiddenSection ? '#bbb' : COLORS.warning}`
                }}>
                    {obj.type} <span style={{ fontWeight: 'normal', color: 'black' }}>#{obj.id.replace('obj', '')}</span>
                </div>

                <div style={{ marginTop: '8px', fontSize: '13px' }}>
                    {renderObjectContent(obj)}
                </div>
            </div>
        ));
    };

    return (
        <div
            style={{
                backgroundColor: COLORS.white,
                border: `1px solid ${COLORS.mediumGray}`,
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: SHADOWS.sm,
                display: 'flex',
                flexDirection: 'column',
                height: '100%'
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: SPACING.sm,
                    backgroundColor: COLORS.offWhite,
                    borderBottom: `1px solid ${COLORS.mediumGray}`
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                    <Share2 size={16} color={COLORS.textSecondary} />
                    <span
                        style={{
                            fontSize: '14px',
                            fontWeight: 600,
                            color: COLORS.textSecondary
                        }}
                    >
                        Heap Objects
                    </span>
                </div>
            </div>

            {/* Objects Content */}
            <div
                style={{
                    flex: 1,
                    padding: SPACING.md,
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: SPACING.md
                }}
            >
                {reachable.length === 0 && hidden.length === 0 ? (
                    <div
                        style={{
                            color: COLORS.textTertiary,
                            fontStyle: 'italic',
                            fontSize: '13px',
                            textAlign: 'center',
                            marginTop: '20px'
                        }}
                    >
                        No heap objects active
                    </div>
                ) : (
                    <>
                        {renderObjectList(reachable)}

                        {hidden.length > 0 && (
                            <div style={{ marginTop: '10px' }}>
                                <button
                                    onClick={() => setShowHidden(!showHidden)}
                                    style={{
                                        width: '100%',
                                        padding: '6px',
                                        fontSize: '12px',
                                        color: COLORS.textSecondary,
                                        backgroundColor: '#e0e0e0',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    {showHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                                    {showHidden ? 'Hide' : 'Show'} {hidden.length} Hidden Object{hidden.length !== 1 ? 's' : ''}
                                </button>

                                {showHidden && (
                                    <div style={{
                                        marginTop: '10px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: SPACING.md,
                                        paddingTop: '10px',
                                        borderTop: '1px dashed #ccc'
                                    }}>
                                        {renderObjectList(hidden, true)}
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ObjectsView;
