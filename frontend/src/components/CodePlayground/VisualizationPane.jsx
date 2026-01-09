import React, { useState } from 'react';
import CodeEditor from './Editor';
import StepControls from './StepControls';
import OutputDisplay from './OutputDisplay';
import FramesView from './FramesView';
import ObjectsView from './ObjectsView';
import VisualizerRouter from '../visualizers/VisualizerRouter';
import { COLORS, SPACING, SHADOWS } from '../../constants/designSystem';

const VisualizationPane = ({
    code,
    language,
    visualizationData,
    currentStep,
    onStepChange
}) => {

    if (!visualizationData || !visualizationData.steps || visualizationData.steps.length === 0) {
        return (
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '400px',
                    color: COLORS.textTertiary,
                    fontSize: '16px'
                }}
            >
                No visualization data available
            </div>
        );
    }

    const currentStepData = visualizationData.steps[currentStep] || visualizationData.steps[0];
    const totalSteps = visualizationData.steps.length;

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                backgroundColor: COLORS.offWhite,
                position: 'relative'
            }}
        >
            {/* Main Content Area - 4 Column Layout */}
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    gap: SPACING.sm, // Reduced gap to fit all columns
                    padding: SPACING.md,
                    overflow: 'hidden'
                }}
            >
                {/* 1. Code Editor (40%) */}
                <div
                    style={{
                        flex: '0 0 40%',
                        backgroundColor: COLORS.white,
                        borderRadius: '8px',
                        overflow: 'hidden',
                        boxShadow: SHADOWS.md,
                        border: `1px solid ${COLORS.mediumGray}`
                    }}
                >
                    <CodeEditor
                        code={code}
                        language={language}
                        readOnly={true}
                        currentLine={currentStepData.currentLine}
                        executedLines={currentStepData.executedLines || []}
                        height="100%"
                    />
                </div>

                {/* 2. Frames View (25%) */}
                <div style={{ flex: '0 0 25%', minWidth: 0 }}>
                    <FramesView frames={currentStepData.frames || []} />
                </div>

                {/* 3. Objects View (25%) */}
                <div style={{ flex: '0 0 25%', minWidth: 0 }}>
                    <VisualizerRouter
                        objects={currentStepData.objects || []}
                        frames={currentStepData.frames || []}
                    />
                </div>

                {/* 4. Output Display (10%) */}
                <div style={{ flex: '0 0 10%', minWidth: 0 }}>
                    <OutputDisplay output={currentStepData.output || ''} />
                </div>
            </div>

            {/* Step Controls at Bottom */}
            <StepControls
                currentStep={currentStep}
                totalSteps={totalSteps}
                onFirst={() => onStepChange(0)}
                onPrev={() => onStepChange(Math.max(0, currentStep - 1))}
                onNext={() => onStepChange(Math.min(totalSteps - 1, currentStep + 1))}
                onLast={() => onStepChange(totalSteps - 1)}
            />
        </div>
    );
};

export default VisualizationPane;
