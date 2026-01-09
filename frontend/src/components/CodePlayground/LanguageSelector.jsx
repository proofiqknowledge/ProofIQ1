import React from 'react';
import { COLORS, FONT_SIZES } from '../../constants/designSystem';

const SUPPORTED_LANGUAGES = [
    { value: 'python', label: 'Python' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'c', label: 'C' },
    { value: 'cpp', label: 'C++' },
    { value: 'java', label: 'Java' }
];

const LanguageSelector = ({ value, onChange, disabled = false }) => {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label
                style={{
                    fontSize: FONT_SIZES.bodySm,
                    fontWeight: 600,
                    color: COLORS.textSecondary
                }}
            >
                Language:
            </label>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                style={{
                    padding: '8px 12px',
                    fontSize: FONT_SIZES.body,
                    border: `1px solid ${COLORS.mediumGray}`,
                    borderRadius: '8px',
                    backgroundColor: disabled ? COLORS.lightGray : COLORS.white,
                    color: COLORS.textPrimary,
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    outline: 'none',
                    transition: 'all 0.3s ease'
                }}
            >
                {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                        {lang.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default LanguageSelector;
