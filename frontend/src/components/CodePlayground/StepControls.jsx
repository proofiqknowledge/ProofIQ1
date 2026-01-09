import React from 'react';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { COLORS, SPACING, SHADOWS } from '../../constants/designSystem';

const StepControls = ({
    currentStep,
    totalSteps,
    onFirst,
    onPrev,
    onNext,
    onLast
}) => {
    const buttonStyle = (isDisabled) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px 16px',
        fontSize: '14px',
        fontWeight: 600,
        border: `1px solid ${COLORS.mediumGray}`,
        borderRadius: '6px',
        backgroundColor: isDisabled ? COLORS.lightGray : COLORS.white,
        color: isDisabled ? COLORS.textTertiary : COLORS.textPrimary,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        gap: SPACING.xs
    });

    const isFirstStep = currentStep === 0;
    const isLastStep = currentStep === totalSteps - 1;

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: SPACING.md,
                padding: SPACING.md,
                backgroundColor: COLORS.offWhite,
                borderTop: `1px solid ${COLORS.mediumGray}`,
                boxShadow: SHADOWS.sm
            }}
        >
            <button
                onClick={onFirst}
                disabled={isFirstStep}
                style={buttonStyle(isFirstStep)}
                onMouseEnter={(e) => {
                    if (!isFirstStep) {
                        e.target.style.backgroundColor = COLORS.lightGray;
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isFirstStep) {
                        e.target.style.backgroundColor = COLORS.white;
                    }
                }}
            >
                <ChevronsLeft size={16} />
                First
            </button>

            <button
                onClick={onPrev}
                disabled={isFirstStep}
                style={buttonStyle(isFirstStep)}
                onMouseEnter={(e) => {
                    if (!isFirstStep) {
                        e.target.style.backgroundColor = COLORS.lightGray;
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isFirstStep) {
                        e.target.style.backgroundColor = COLORS.white;
                    }
                }}
            >
                <ChevronLeft size={16} />
                Prev
            </button>

            <div
                style={{
                    padding: '8px 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: COLORS.textPrimary,
                    backgroundColor: COLORS.white,
                    border: `2px solid ${COLORS.primary}`,
                    borderRadius: '6px',
                    minWidth: '120px',
                    textAlign: 'center'
                }}
            >
                Step {currentStep + 1} of {totalSteps}
            </div>

            <button
                onClick={onNext}
                disabled={isLastStep}
                style={buttonStyle(isLastStep)}
                onMouseEnter={(e) => {
                    if (!isLastStep) {
                        e.target.style.backgroundColor = COLORS.lightGray;
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isLastStep) {
                        e.target.style.backgroundColor = COLORS.white;
                    }
                }}
            >
                Next
                <ChevronRight size={16} />
            </button>

            <button
                onClick={onLast}
                disabled={isLastStep}
                style={buttonStyle(isLastStep)}
                onMouseEnter={(e) => {
                    if (!isLastStep) {
                        e.target.style.backgroundColor = COLORS.lightGray;
                    }
                }}
                onMouseLeave={(e) => {
                    if (!isLastStep) {
                        e.target.style.backgroundColor = COLORS.white;
                    }
                }}
            >
                Last
                <ChevronsRight size={16} />
            </button>
        </div>
    );
};

export default StepControls;
