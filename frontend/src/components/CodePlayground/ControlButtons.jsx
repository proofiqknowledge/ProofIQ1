import React from 'react';
import { Play, Eye } from 'lucide-react';
import { COLORS, SPACING } from '../../constants/designSystem';

const ControlButtons = ({
    onRun,
    onVisualize,
    isRunning = false,
    isVisualizing = false,
    disabled = false
}) => {
    const buttonStyle = (isPrimary = false) => ({
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.sm,
        padding: '10px 20px',
        fontSize: '14px',
        fontWeight: 600,
        border: 'none',
        borderRadius: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        backgroundColor: disabled
            ? COLORS.mediumGray
            : isPrimary
                ? COLORS.primary
                : COLORS.secondary,
        color: COLORS.white,
        opacity: disabled ? 0.6 : 1
    });

    const hoverStyle = {
        ':hover': {
            backgroundColor: COLORS.primaryHover
        }
    };

    return (
        <div style={{ display: 'flex', gap: SPACING.md }}>
            <button
                onClick={onRun}
                disabled={disabled || isRunning}
                style={buttonStyle(false)}
                onMouseEnter={(e) => {
                    if (!disabled && !isRunning) {
                        e.target.style.backgroundColor = COLORS.secondaryDark;
                    }
                }}
                onMouseLeave={(e) => {
                    if (!disabled && !isRunning) {
                        e.target.style.backgroundColor = COLORS.secondary;
                    }
                }}
            >
                <Play size={16} />
                {isRunning ? 'Running...' : 'Run'}
            </button>

            <button
                onClick={onVisualize}
                disabled={disabled || isVisualizing}
                style={buttonStyle(true)}
                onMouseEnter={(e) => {
                    if (!disabled && !isVisualizing) {
                        e.target.style.backgroundColor = COLORS.primaryHover;
                    }
                }}
                onMouseLeave={(e) => {
                    if (!disabled && !isVisualizing) {
                        e.target.style.backgroundColor = COLORS.primary;
                    }
                }}
            >
                <Eye size={16} />
                {isVisualizing ? 'Visualizing...' : 'Visualize'}
            </button>
        </div>
    );
};

export default ControlButtons;
