import React from 'react';
import { Terminal } from 'lucide-react';
import { COLORS, SPACING, SHADOWS, TYPOGRAPHY } from '../../constants/designSystem';

const OutputDisplay = ({ output }) => {
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
                <Terminal size={16} color={COLORS.textSecondary} />
                <span
                    style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: COLORS.textSecondary
                    }}
                >
                    Print Output
                </span>
            </div>

            {/* Output Content */}
            <div
                style={{
                    flex: 1,
                    padding: SPACING.md,
                    fontFamily: TYPOGRAPHY.fontFamilyCode,
                    fontSize: '13px',
                    lineHeight: '1.6',
                    color: COLORS.textPrimary,
                    backgroundColor: '#FAFAFA',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                }}
            >
                {output ? (
                    output
                ) : (
                    <span style={{ color: COLORS.textTertiary, fontStyle: 'italic' }}>
                        No output yet
                    </span>
                )}
            </div>
        </div>
    );
};

export default OutputDisplay;
