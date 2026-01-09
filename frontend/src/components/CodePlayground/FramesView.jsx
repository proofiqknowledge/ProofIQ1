import React from 'react';
import { Layers } from 'lucide-react';
import { COLORS, SPACING, SHADOWS } from '../../constants/designSystem';

const FramesView = ({ frames = [] }) => {
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
                    gap: SPACING.sm,
                    padding: SPACING.sm,
                    backgroundColor: COLORS.offWhite,
                    borderBottom: `1px solid ${COLORS.mediumGray}`
                }}
            >
                <Layers size={16} color={COLORS.textSecondary} />
                <span
                    style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: COLORS.textSecondary
                    }}
                >
                    Frames
                </span>
            </div>

            {/* Frames Content */}
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
                {frames.length === 0 ? (
                    <div
                        style={{
                            color: COLORS.textTertiary,
                            fontStyle: 'italic',
                            fontSize: '13px',
                            textAlign: 'center',
                            padding: SPACING.lg
                        }}
                    >
                        No frames to display
                    </div>
                ) : (
                    frames.map((frame, index) => (
                        <div
                            key={index}
                            style={{
                                backgroundColor: COLORS.offWhite,
                                border: `2px solid ${COLORS.primary}`,
                                borderRadius: '6px',
                                padding: SPACING.md,
                                transition: 'all 0.3s ease'
                            }}
                        >
                            {/* Frame Name */}
                            <div
                                style={{
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    color: COLORS.primary,
                                    marginBottom: SPACING.sm,
                                    borderBottom: `1px solid ${COLORS.mediumGray}`,
                                    paddingBottom: SPACING.xs
                                }}
                            >
                                {frame.name}
                            </div>

                            {/* Variables */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACING.xs }}>
                                {Object.keys(frame.variables || {}).length === 0 ? (
                                    <div
                                        style={{
                                            fontSize: '12px',
                                            color: COLORS.textTertiary,
                                            fontStyle: 'italic'
                                        }}
                                    >
                                        (no variables)
                                    </div>
                                ) : (
                                    Object.entries(frame.variables).map(([key, value]) => (
                                        <div
                                            key={key}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                fontSize: '13px',
                                                gap: SPACING.sm
                                            }}
                                        >
                                            <span
                                                style={{
                                                    fontWeight: 600,
                                                    color: COLORS.textPrimary,
                                                    fontFamily: 'monospace'
                                                }}
                                            >
                                                {key}:
                                            </span>
                                            <span
                                                style={{
                                                    color: COLORS.secondary,
                                                    fontFamily: 'monospace'
                                                }}
                                            >
                                                {typeof value === 'object'
                                                    ? JSON.stringify(value)
                                                    : String(value)}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default FramesView;
