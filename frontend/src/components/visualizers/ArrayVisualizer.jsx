import React from 'react';
import { Box } from 'lucide-react';
import { COLORS, SPACING, SHADOWS } from '../../constants/designSystem';

const ArrayVisualizer = ({ objects, rootId }) => {
    const arrayObj = objects.find(o => o.id === rootId);
    if (!arrayObj || arrayObj.type !== 'array') return null;

    const values = arrayObj.value || [];

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
                padding: SPACING.sm,
                backgroundColor: COLORS.offWhite,
                borderBottom: `1px solid ${COLORS.mediumGray}`,
                display: 'flex',
                gap: SPACING.sm,
                alignItems: 'center'
            }}>
                <Box size={16} color={COLORS.primary} />
                <span style={{ fontWeight: 600, color: COLORS.primary }}>Array Visualization ({arrayObj.id})</span>
            </div>

            <div style={{
                flex: 1,
                padding: SPACING.lg,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'auto'
            }}>
                <div style={{
                    display: 'flex',
                    border: '2px solid #000',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                    {values.map((val, idx) => (
                        <div key={idx} style={{
                            width: '70px',
                            minWidth: '50px',
                            height: '70px',
                            borderRight: idx < values.length - 1 ? '1px solid #000' : 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            position: 'relative',
                            backgroundColor: COLORS.white,
                            transition: 'background-color 0.3s ease'
                        }}>
                            <span style={{
                                fontSize: '20px',
                                fontWeight: 'bold',
                                color: val === null ? COLORS.mediumGray : COLORS.textPrimary
                            }}>
                                {val === null ? '?' : (typeof val === 'object' ? 'obj' : val)}
                            </span>
                            <span style={{
                                position: 'absolute',
                                bottom: '2px',
                                fontSize: '10px',
                                fontWeight: '600',
                                color: COLORS.darkGray
                            }}>{idx}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{
                padding: SPACING.xs,
                textAlign: 'center',
                fontSize: '11px',
                color: COLORS.darkGray,
                backgroundColor: COLORS.offWhite,
                borderTop: `1px solid ${COLORS.mediumGray}`
            }}>
                Tip: Elements are accessed sequentially in memory for C/C++.
            </div>
        </div>
    );
};

export default ArrayVisualizer;
