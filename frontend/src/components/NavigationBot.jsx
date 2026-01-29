import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { MessageSquare, X, Send, Navigation, Minus } from 'lucide-react';
import { COLORS } from '../constants/designSystem';
import { BOT_NAME, ROUTE_CONFIG, FALLBACK_MESSAGES, GREETING_MESSAGE, ROLE_ACTIONS } from '../constants/chatbotConfig';
import MentyxAvatar from './MentyxAvatar';
import BotAvatarIcon from './BotAvatarIcon'; // Minimal Avatar for Chat

export default function NavigationBot() {
    const { user } = useSelector((state) => state.auth);
    const location = useLocation();
    const navigate = useNavigate();
    const messagesEndRef = useRef(null);

    // --- HELPER: Get Options Scope ---
    // Calculates valid actions based on a target path (to exclude current page)
    const getOptionsForPath = (path) => {
        const userRole = user?.role || 'Guest';
        const allRoleActions = ROLE_ACTIONS[userRole] || ROLE_ACTIONS['Guest'];

        // Robust filter: strict match + overlap check
        return allRoleActions.filter(action => {
            return action.path !== path && !path.includes(action.path + '/');
        });
    };

    // --- STATE ---
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    // Initialize messages with options based on INITIAL load path
    const [messages, setMessages] = useState([]);

    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showGreeting, setShowGreeting] = useState(false);
    const [isVisible, setIsVisible] = useState(true);

    // Initialize Greeting on Mount & Reset on Login/Logout
    useEffect(() => {
        setMessages([{
            type: 'bot',
            text: GREETING_MESSAGE,
            options: getOptionsForPath(location.pathname)
        }]);
    }, [user?._id || user?.id]); // Reset when Auth ID changes

    // Show Login Greeting Bubble
    useEffect(() => {
        const timer = setTimeout(() => setShowGreeting(true), 1000);
        const hideTimer = setTimeout(() => setShowGreeting(false), 5000);
        return () => { clearTimeout(timer); clearTimeout(hideTimer); };
    }, []);

    // 1️⃣ EXCLUSION LOGIC
    const isExcluded =
        (location.pathname.includes('/take') && location.pathname.includes('/exams/')) ||
        location.pathname === '/login' ||
        location.pathname === '/register' ||
        location.pathname === '/' ||
        location.pathname.startsWith('/auth');

    // Auto-scroll logic
    useEffect(() => {
        if (isOpen && !isMinimized) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen, isMinimized]);

    // 🎹 Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.ctrlKey && e.key.toLowerCase() === 'h') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'b') {
                e.preventDefault();
                setIsVisible(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    if (isExcluded || !isVisible) return null;

    // --- HANDLERS ---

    const handleSend = async () => {
        if (!inputText.trim()) return;
        const userText = inputText.trim();
        setInputText('');
        setMessages(prev => [...prev, { type: 'user', text: userText }]);
        setIsTyping(true);
        setTimeout(() => {
            resolveIntent(userText);
            setIsTyping(false);
        }, 600);
    };

    const handleActionClick = (action) => {
        setMessages(prev => [...prev, { type: 'user', text: action.label }]);
        setIsTyping(true);

        setTimeout(() => {
            // 1. Bot Confirmation
            setMessages(prev => [...prev, {
                type: 'bot',
                text: `Opening ${action.label}...`,
                action: 'navigating'
            }]);
            setIsTyping(false);

            // 2. Navigation & Re-Prompt
            setTimeout(() => {
                navigate(action.path);

                // 3. Add Persistent Menu (Context Aware for NEW path)
                setTimeout(() => {
                    setMessages(prev => [...prev, {
                        type: 'bot',
                        text: GREETING_MESSAGE,
                        options: getOptionsForPath(action.path) // Filter out the page we just went to
                    }]);
                }, 600);
            }, 800);
        }, 500);
    };

    // Intent Resolution
    const getLevenshteinDistance = (a, b) => {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
                }
            }
        }
        return matrix[b.length][a.length];
    };

    const isMatch = (inputWord, keyword) => {
        if (inputWord.includes(keyword) || keyword.includes(inputWord)) return true;
        const distance = getLevenshteinDistance(inputWord, keyword);
        const allowedErrors = keyword.length > 5 ? 2 : 1;
        return distance <= allowedErrors;
    };

    const resolveIntent = (text) => {
        const role = user?.role || 'Student';
        const roleRoutes = ROUTE_CONFIG[role];

        if (!roleRoutes) {
            setMessages(prev => [...prev, { type: 'bot', text: "Please log in to access navigation features." }]);
            return;
        }

        const lowerText = text.toLowerCase().trim();
        if (lowerText === 'clear' || lowerText === 'clear chat') {
            setMessages([{
                type: 'bot',
                text: GREETING_MESSAGE,
                options: getOptionsForPath(location.pathname) // Reset to current
            }]);
            return;
        }
        if (lowerText === 'close' || lowerText === 'exit') {
            setIsOpen(false);
            return;
        }

        let match = null;
        const words = lowerText.split(/\s+/);
        for (const key in roleRoutes) {
            const route = roleRoutes[key];
            const hasMatch = route.keywords.some(keyword =>
                words.some(word => isMatch(word, keyword.toLowerCase()))
            );
            if (hasMatch) {
                match = route;
                break;
            }
        }

        if (match) {
            setMessages(prev => [...prev, {
                type: 'bot',
                text: `Opening ${match.label}...`,
                action: 'navigating'
            }]);

            setTimeout(() => {
                navigate(match.path);
                // Re-Prompt with Context Aware Options
                setTimeout(() => {
                    setMessages(prev => [...prev, {
                        type: 'bot',
                        text: GREETING_MESSAGE,
                        options: getOptionsForPath(match.path)
                    }]);
                }, 600);
            }, 1000);
        } else {
            const randomFallback = FALLBACK_MESSAGES[Math.floor(Math.random() * FALLBACK_MESSAGES.length)];
            setMessages(prev => [...prev, { type: 'bot', text: randomFallback }]);
        }
    };

    // --- RENDER ---
    if (!isOpen) {
        return (
            <>
                {showGreeting && (
                    <div style={{
                        position: 'fixed', bottom: '105px', right: '85px',
                        backgroundColor: '#f1f5f9', color: '#0f172a',
                        padding: '6px 10px', borderRadius: '10px',
                        maxWidth: '140px', fontSize: '13px', lineHeight: '1.2',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                        zIndex: 10000, animation: 'fadeIn 0.3s ease-out', pointerEvents: 'none',
                    }}>
                        Need a hand?
                        <div style={{
                            position: 'absolute', bottom: '-4px', right: '12px',
                            width: '8px', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '50%'
                        }} />
                    </div>
                )}
                <div
                    onClick={() => setIsOpen(true)}
                    style={{
                        position: 'fixed', bottom: '30px', right: '30px',
                        width: '90px', height: '90px',
                        zIndex: 9990, cursor: 'pointer', transition: 'transform 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <MentyxAvatar />
                </div>
            </>
        );
    }

    return (
        <div style={{
            position: 'fixed', bottom: '30px', right: '30px',
            width: '350px', height: isMinimized ? '60px' : '500px',
            backgroundColor: '#fff', borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            zIndex: 9990, border: '1px solid #e0e0e0', transition: 'height 0.3s ease-in-out'
        }}>
            {/* Header */}
            <div style={{
                backgroundColor: '#7a1222', color: '#fff', height: '48px',
                padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}
                onClick={() => !isMinimized ? null : setIsMinimized(false)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Navigation size={16} />
                    <span style={{ fontWeight: '600', fontSize: '14px', letterSpacing: '0.5px' }}>MENTYX</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <Minus size={18} style={{ cursor: 'pointer', opacity: 0.8 }} onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} />
                    <X size={18} style={{ cursor: 'pointer', opacity: 0.8 }} onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} />
                </div>
            </div>

            {/* Chat Content */}
            {!isMinimized && (
                <>
                    <div style={{
                        flex: 1, padding: '15px', overflowY: 'auto',
                        backgroundColor: '#FAFAFA',
                        display: 'flex', flexDirection: 'column', gap: '14px'
                    }}>
                        {messages.map((msg, idx) => (
                            <React.Fragment key={idx}>
                                <div style={{
                                    display: 'flex',
                                    flexDirection: msg.type === 'user' ? 'row-reverse' : 'row',
                                    alignItems: 'flex-start',
                                    gap: '8px',
                                    animation: 'fadeIn 0.2s ease-out'
                                }}>
                                    {msg.type === 'bot' && <BotAvatarIcon />}
                                    <div style={{
                                        maxWidth: msg.type === 'user' ? '70%' : '75%',
                                        backgroundColor: msg.type === 'user' ? '#7a1222' : '#f8fafc',
                                        color: msg.type === 'user' ? '#fff' : '#0f172a',
                                        padding: '10px 14px',
                                        borderRadius: '14px',
                                        borderTopLeftRadius: msg.type === 'bot' ? '4px' : '14px',
                                        borderTopRightRadius: msg.type === 'user' ? '4px' : '14px',
                                        fontSize: '13.5px',
                                        lineHeight: '1.4',
                                        boxShadow: msg.type === 'bot' ? '0 2px 8px rgba(0,0,0,0.04)' : 'none',
                                    }}>
                                        {msg.text}
                                    </div>
                                </div>
                                {/* Message-Scoped Action Chips */}
                                {msg.options && (
                                    <div style={{
                                        display: 'flex', flexWrap: 'wrap', gap: '8px',
                                        marginLeft: '36px', marginTop: '-4px'
                                    }}>
                                        {msg.options.map((action, i) => (
                                            <div key={i}
                                                onClick={() => handleActionClick(action)}
                                                style={{
                                                    backgroundColor: '#fff',
                                                    border: '1px solid #e5e7eb',
                                                    borderRadius: '12px',
                                                    padding: '6px 12px',
                                                    fontSize: '13px',
                                                    color: '#334155',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                                    e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
                                                    e.currentTarget.style.borderColor = '#cbd5e1';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                                                    e.currentTarget.style.borderColor = '#e5e7eb';
                                                }}
                                            >
                                                {action.label}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                        {isTyping && (
                            <div style={{ display: 'flex', gap: '8px', marginLeft: '2px' }}>
                                <div style={{ width: '28px' }} />
                                <div style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>
                                    MENTYX is thinking...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div style={{
                        padding: '12px 16px', backgroundColor: '#fff',
                        display: 'flex', gap: '10px', alignItems: 'center',
                        borderTop: '1px solid #f1f5f9'
                    }}>
                        <input
                            type="text" value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Type multiple words..."
                            style={{
                                flex: 1, padding: '10px 14px', borderRadius: '16px',
                                border: '1px solid #e2e8f0', outline: 'none',
                                fontSize: '14px', backgroundColor: '#ffffff',
                                transition: 'box-shadow 0.2s'
                            }}
                            onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px rgba(122, 18, 34, 0.05)'}
                            onBlur={(e) => e.target.style.boxShadow = 'none'}
                        />
                        <button onClick={handleSend}
                            style={{
                                backgroundColor: '#7a1222', color: '#fff', border: 'none',
                                borderRadius: '50%', width: '36px', height: '36px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'transform 0.1s, filter 0.2s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <Send size={16} />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
