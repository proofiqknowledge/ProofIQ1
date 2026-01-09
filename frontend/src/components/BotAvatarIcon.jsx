import React from 'react';

/**
 * MENTYX Avatar Icon (CSS Version)
 * Static 2D representation of the 3D orb for chat messages.
 * Matches MENTYX v3 colors: Charcoal Body + Neon Aqua Eyes.
 */
const BotAvatarIcon = () => {
    return (
        <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            // Charcoal Body with slight gradient
            background: 'radial-gradient(circle at 35% 35%, #2c3e50, #0f172a)',
            position: 'relative',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2), inset 0 1px 2px rgba(255,255,255,0.1)',
            flexShrink: 0,
            marginTop: '2px' // Visual alignment with text
        }}>
            {/* Soft Outer Glow Ring (Static) */}
            <div style={{
                position: 'absolute',
                top: '-2px', left: '-2px', right: '-2px', bottom: '-2px',
                borderRadius: '50%',
                border: '1px solid rgba(56, 249, 255, 0.15)', // Soft Aqua
            }} />

            {/* Eyes Container */}
            <div style={{
                position: 'absolute',
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '16px',
                height: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                {/* Left Eye */}
                <div style={{
                    width: '5px', height: '5px',
                    borderRadius: '50%',
                    backgroundColor: '#38f9ff', // Neon Aqua
                    boxShadow: '0 0 4px rgba(56, 249, 255, 0.6)'
                }} />
                {/* Right Eye */}
                <div style={{
                    width: '5px', height: '5px',
                    borderRadius: '50%',
                    backgroundColor: '#38f9ff',
                    boxShadow: '0 0 4px rgba(56, 249, 255, 0.6)'
                }} />
            </div>
        </div>
    );
};

export default BotAvatarIcon;
