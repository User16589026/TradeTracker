'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
    Send, Bot, User, Sparkles, Loader2, Trash2,
    Settings, ChevronLeft, ChevronRight, Zap,
    BarChart2, AlertTriangle, Target, TrendingUp,
    MessageSquare, Plus, Maximize2, Minimize2
} from 'lucide-react';
import { Stats, Trade } from '@/lib/types';
import ReactMarkdown from 'react-markdown';

const API_BASE = 'http://localhost:8000/api';

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    tools_used?: string[];
}

interface ChatSession {
    id: string;
    title: string;
    messages: Message[];
    createdAt: Date;
}

interface AISidePanelProps {
    stats: Stats | null;
    trades: Trade[];
    account: any;
    periods: any;
    isDark?: boolean;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

type AIProvider = 'openai' | 'gemini' | 'deepseek';

const OPENAI_MODELS = [
    { value: 'gpt-4o', label: 'GPT-4o (Tools)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
];

const GEMINI_MODELS = [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
];

const DEEPSEEK_MODELS = [
    { value: 'deepseek-chat', label: 'DeepSeek Chat' },
    { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
];

export default function AISidePanel({
    stats, trades, account, periods, isDark = true,
    isCollapsed = false, onToggleCollapse
}: AISidePanelProps) {
    // Chat state
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    // AI Settings
    const [provider, setProvider] = useState<AIProvider>('openai');
    const [openaiModel, setOpenaiModel] = useState('gpt-4o');
    const [geminiModel, setGeminiModel] = useState('gemini-2.0-flash');
    const [deepseekModel, setDeepseekModel] = useState('deepseek-chat');
    const [openaiKey, setOpenaiKey] = useState('');
    const [geminiKey, setGeminiKey] = useState('');
    const [deepseekKey, setDeepseekKey] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Load settings and chat sessions from localStorage
    useEffect(() => {
        const savedOpenai = localStorage.getItem('openai_api_key') || '';
        const savedGemini = localStorage.getItem('gemini_api_key') || '';
        const savedDeepseek = localStorage.getItem('deepseek_api_key') || '';
        const savedProvider = localStorage.getItem('ai_provider') as AIProvider || 'openai';
        setOpenaiKey(savedOpenai);
        setGeminiKey(savedGemini);
        setDeepseekKey(savedDeepseek);
        setProvider(savedProvider);

        // Load saved chat sessions
        const savedSessions = localStorage.getItem('ai_chat_sessions');
        const savedActiveId = localStorage.getItem('ai_active_session_id');

        if (savedSessions) {
            try {
                const parsed = JSON.parse(savedSessions);
                // Restore dates
                const restored = parsed.map((s: any) => ({
                    ...s,
                    createdAt: new Date(s.createdAt),
                    messages: s.messages.map((m: any) => ({
                        ...m,
                        timestamp: new Date(m.timestamp)
                    }))
                }));
                setSessions(restored);
                if (savedActiveId && restored.find((s: any) => s.id === savedActiveId)) {
                    setActiveSessionId(savedActiveId);
                } else if (restored.length > 0) {
                    setActiveSessionId(restored[0].id);
                }
            } catch (e) {
                console.error('Error loading sessions:', e);
                createNewSession();
            }
        } else {
            createNewSession();
        }
    }, []);

    // Save sessions to localStorage whenever they change
    useEffect(() => {
        if (sessions.length > 0) {
            localStorage.setItem('ai_chat_sessions', JSON.stringify(sessions));
        }
    }, [sessions]);

    // Save active session ID
    useEffect(() => {
        if (activeSessionId) {
            localStorage.setItem('ai_active_session_id', activeSessionId);
        }
    }, [activeSessionId]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [sessions, activeSessionId]);

    const getCurrentSession = () => sessions.find(s => s.id === activeSessionId);
    const getCurrentMessages = () => getCurrentSession()?.messages || [];

    const createNewSession = () => {
        const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newSession: ChatSession = {
            id: uniqueId,
            title: 'New Chat',
            messages: [],
            createdAt: new Date()
        };
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
    };

    const deleteSession = (id: string) => {
        setSessions(prev => prev.filter(s => s.id !== id));
        if (activeSessionId === id) {
            setActiveSessionId(sessions[0]?.id || null);
        }
    };

    const getCurrentApiKey = () => {
        if (provider === 'openai') return openaiKey;
        if (provider === 'deepseek') return deepseekKey;
        return geminiKey;
    };
    const getCurrentModel = () => {
        if (provider === 'openai') return openaiModel;
        if (provider === 'deepseek') return deepseekModel;
        return geminiModel;
    };

    const saveSettings = () => {
        localStorage.setItem('openai_api_key', openaiKey);
        localStorage.setItem('gemini_api_key', geminiKey);
        localStorage.setItem('deepseek_api_key', deepseekKey);
        localStorage.setItem('ai_provider', provider);
        setShowSettings(false);
    };

    // Build comprehensive context with ALL app data
    const buildFullContext = () => {
        const context: any = {
            app: 'TradeTracker - Trading Analytics Dashboard',
            currentData: {}
        };

        if (account) {
            context.currentData.account = {
                login: account.login,
                balance: account.balance,
                equity: account.equity,
                margin: account.margin,
                freeMargin: account.free_margin,
                leverage: account.leverage,
                server: account.server
            };
        }

        if (stats) {
            context.currentData.performance = {
                totalTrades: stats.total_trades,
                winningTrades: stats.winning_trades,
                losingTrades: stats.losing_trades,
                winRate: stats.win_rate_pct,
                profitFactor: stats.profit_factor,
                totalProfit: stats.total_profit,
                avgWin: stats.avg_win,
                avgLoss: stats.avg_loss,
                largestWin: stats.largest_win,
                largestLoss: stats.largest_loss,
                maxDrawdown: stats.max_drawdown_pct,
                sharpeRatio: stats.sharpe_ratio,
                totalGain: stats.absolute_gain_pct,
                expectancy: stats.expectancy,
                zScore: stats.z_score
            };
        }

        if (trades && trades.length > 0) {
            context.currentData.recentTrades = trades.slice(0, 20).map(t => ({
                symbol: t.symbol,
                type: t.type,
                volume: t.volume,
                profit: t.net_profit,
                time: t.time
            }));

            // Symbol breakdown
            const symbolStats: any = {};
            trades.forEach(t => {
                if (!symbolStats[t.symbol]) {
                    symbolStats[t.symbol] = { count: 0, profit: 0, wins: 0 };
                }
                symbolStats[t.symbol].count++;
                symbolStats[t.symbol].profit += t.net_profit;
                if (t.net_profit > 0) symbolStats[t.symbol].wins++;
            });
            context.currentData.symbolBreakdown = symbolStats;
        }

        if (periods) {
            context.currentData.periodPerformance = periods;
        }

        return context;
    };

    const sendMessage = async (customMessage?: string) => {
        const apiKey = getCurrentApiKey();
        if (!apiKey) {
            setShowSettings(true);
            return;
        }

        const messageText = customMessage || input;
        if (!messageText.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: messageText,
            timestamp: new Date()
        };

        // Update session with new message
        setSessions(prev => prev.map(s => {
            if (s.id === activeSessionId) {
                const updatedMessages = [...s.messages, userMessage];
                // Update title if first message
                const title = s.messages.length === 0
                    ? messageText.slice(0, 30) + (messageText.length > 30 ? '...' : '')
                    : s.title;
                return { ...s, messages: updatedMessages, title };
            }
            return s;
        }));

        setInput('');
        setIsLoading(true);

        try {
            const fullContext = buildFullContext();
            const currentMessages = getCurrentMessages();

            const response = await fetch(`${API_BASE}/ai/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({
                    messages: [...currentMessages, userMessage].map(m => ({
                        role: m.role,
                        content: m.content
                    })),
                    provider,
                    api_key: apiKey,
                    model: getCurrentModel(),
                    trading_context: fullContext,
                    session_id: activeSessionId,
                    use_memory: true
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to get response');
            }

            const data = await response.json();

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.response,
                timestamp: new Date(),
                tools_used: data.tools_used
            };

            setSessions(prev => prev.map(s => {
                if (s.id === activeSessionId) {
                    return { ...s, messages: [...s.messages, assistantMessage] };
                }
                return s;
            }));
        } catch (error: any) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `❌ Error: ${error.message}`,
                timestamp: new Date()
            };
            setSessions(prev => prev.map(s => {
                if (s.id === activeSessionId) {
                    return { ...s, messages: [...s.messages, errorMessage] };
                }
                return s;
            }));
        } finally {
            setIsLoading(false);
        }
    };

    const quickActions = [
        { icon: Zap, label: 'Quick Insights', prompt: 'ให้ Quick Insights สำหรับการเทรดของฉัน สรุปสั้นๆ 3 ประเด็นหลัก' },
        { icon: BarChart2, label: 'Full Analysis', prompt: 'วิเคราะห์ผลการเทรดแบบครบถ้วน พร้อมจุดแข็ง จุดอ่อน และ action items' },
        { icon: AlertTriangle, label: 'Risk Check', prompt: 'ประเมินความเสี่ยงในการเทรดของฉัน และแนะนำวิธีลดความเสี่ยง' },
        { icon: Target, label: 'Position Size', prompt: 'คำนวณ position size ที่เหมาะสมสำหรับ trade ถัดไป ใช้ Kelly Criterion' },
    ];

    // Styles
    const bgClass = isDark ? 'bg-[#0f0f0f]' : 'bg-gray-50';
    const borderClass = isDark ? 'border-slate-800' : 'border-gray-200';
    const textClass = isDark ? 'text-slate-200' : 'text-gray-800';
    const mutedClass = isDark ? 'text-slate-400' : 'text-gray-500';
    const inputBg = isDark ? 'bg-slate-800/50' : 'bg-white';

    if (isCollapsed) {
        return (
            <div className={`w-12 ${bgClass} border-l ${borderClass} flex flex-col items-center py-4`}>
                <button
                    onClick={onToggleCollapse}
                    className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-200'} transition`}
                >
                    <ChevronLeft size={20} className={mutedClass} />
                </button>
                <div className="mt-4">
                    <Bot size={24} className="text-purple-500" />
                </div>
            </div>
        );
    }

    return (
        <div className={`${isExpanded ? 'w-[95vw] sm:w-[600px]' : 'w-[85vw] sm:w-[400px]'} ${bgClass} border-l ${borderClass} flex flex-col h-full transition-all duration-300 shadow-2xl lg:shadow-none`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${borderClass}`}>
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600">
                        <Bot size={18} className="text-white" />
                    </div>
                    <div>
                        <h2 className={`font-semibold ${textClass}`}>AI Assistant</h2>
                        <p className={`text-xs ${mutedClass}`}>
                            {provider === 'openai' ? openaiModel : provider === 'deepseek' ? deepseekModel : geminiModel}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={onToggleCollapse}
                        className={`lg:hidden p-2 rounded-lg ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-200'} transition text-rose-500`}
                    >
                        <Minimize2 size={18} />
                    </button>
                    <button
                        onClick={createNewSession}
                        className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-200'} transition`}
                        title="New Chat"
                    >
                        <Plus size={18} className={mutedClass} />
                    </button>
                    {getCurrentMessages().length > 0 && (
                        <button
                            onClick={() => {
                                // Clear current session messages
                                setSessions(prev => prev.map(s =>
                                    s.id === activeSessionId
                                        ? { ...s, messages: [], title: 'New Chat' }
                                        : s
                                ));
                            }}
                            className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800 hover:text-rose-400' : 'hover:bg-gray-200 hover:text-rose-500'} transition`}
                            title="Clear Chat"
                        >
                            <Trash2 size={18} className={mutedClass} />
                        </button>
                    )}
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-200'} transition`}
                        title={isExpanded ? 'ย่อ' : 'ขยาย'}
                    >
                        {isExpanded ? <Minimize2 size={18} className={mutedClass} /> : <Maximize2 size={18} className={mutedClass} />}
                    </button>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-200'} transition`}
                    >
                        <Settings size={18} className={mutedClass} />
                    </button>
                    <button
                        onClick={onToggleCollapse}
                        className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-200'} transition`}
                    >
                        <ChevronRight size={18} className={mutedClass} />
                    </button>
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <div className={`p-4 border-b ${borderClass} space-y-3`}>
                    <div>
                        <label className={`text-xs ${mutedClass}`}>Provider</label>
                        <select
                            value={provider}
                            onChange={(e) => setProvider(e.target.value as AIProvider)}
                            className={`w-full mt-1 px-3 py-2 rounded-lg text-sm ${inputBg} ${textClass} border ${borderClass}`}
                        >
                            <option value="openai">OpenAI</option>
                            <option value="gemini">Gemini</option>
                            <option value="deepseek">DeepSeek</option>
                        </select>
                    </div>
                    <div>
                        <label className={`text-xs ${mutedClass}`}>Model</label>
                        <select
                            value={getCurrentModel()}
                            onChange={(e) => {
                                if (provider === 'openai') setOpenaiModel(e.target.value);
                                else if (provider === 'deepseek') setDeepseekModel(e.target.value);
                                else setGeminiModel(e.target.value);
                            }}
                            className={`w-full mt-1 px-3 py-2 rounded-lg text-sm ${inputBg} ${textClass} border ${borderClass}`}
                        >
                            {(provider === 'openai' ? OPENAI_MODELS : provider === 'deepseek' ? DEEPSEEK_MODELS : GEMINI_MODELS).map(m => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}                        </select>
                    </div>
                    <div>
                        <label className={`text-xs ${mutedClass}`}>API Key</label>
                        <input
                            type="password"
                            value={getCurrentApiKey()}
                            onChange={(e) => {
                                if (provider === 'openai') setOpenaiKey(e.target.value);
                                else if (provider === 'deepseek') setDeepseekKey(e.target.value);
                                else setGeminiKey(e.target.value);
                            }}
                            placeholder={provider === 'deepseek' ? 'sk-...' : provider === 'openai' ? 'sk-...' : 'AI...'}
                            className={`w-full mt-1 px-3 py-2 rounded-lg text-sm ${inputBg} ${textClass} border ${borderClass}`}
                        />
                    </div>
                    <button
                        onClick={saveSettings}
                        className="w-full py-2 rounded-lg bg-purple-600 text-white text-sm hover:bg-purple-700 transition"
                    >
                        Save Settings
                    </button>
                </div>
            )}

            {/* Chat Sessions Tabs */}
            {sessions.length > 1 && (
                <div className={`flex gap-1 px-2 py-2 overflow-x-auto border-b ${borderClass}`}>
                    {sessions.slice(0, 5).map(session => (
                        <button
                            key={session.id}
                            onClick={() => setActiveSessionId(session.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap flex items-center gap-1 ${activeSessionId === session.id
                                ? 'bg-purple-600 text-white'
                                : isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            <MessageSquare size={12} />
                            <span className="max-w-[80px] truncate">
                                {session.title === 'New Chat' ? 'New Chat' : session.title}
                            </span>
                        </button>
                    ))}
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {getCurrentMessages().length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="p-4 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-600/20 mb-4">
                            <Bot size={40} className="text-purple-400" />
                        </div>
                        <h3 className={`font-medium ${textClass} mb-2`}>Trading AI Assistant</h3>
                        <p className={`text-sm ${mutedClass} mb-6 max-w-[280px]`}>
                            ฉันรู้ทุกอย่างเกี่ยวกับการเทรดของคุณ ถามได้เลย!
                        </p>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-2 gap-2 w-full max-w-[300px]">
                            {quickActions.map((action, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => sendMessage(action.prompt)}
                                    disabled={isLoading || !getCurrentApiKey()}
                                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs text-left transition ${isDark
                                        ? 'bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700'
                                        : 'bg-white hover:bg-gray-50 border border-gray-200'
                                        } ${textClass}`}
                                >
                                    <action.icon size={16} className="text-purple-400 flex-shrink-0" />
                                    <span>{action.label}</span>
                                </button>
                            ))}
                        </div>

                        {!getCurrentApiKey() && (
                            <button
                                onClick={() => setShowSettings(true)}
                                className="mt-4 text-xs text-purple-400 hover:text-purple-300"
                            >
                                ⚙️ ตั้งค่า API Key ก่อนใช้งาน
                            </button>
                        )}
                    </div>
                ) : (
                    getCurrentMessages().map((msg) => (
                        <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                            {msg.role === 'assistant' && (
                                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                                    <Bot size={16} className="text-white" />
                                </div>
                            )}
                            <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                                <div className={`px-4 py-3 rounded-2xl text-sm ${msg.role === 'user'
                                    ? 'bg-purple-600 text-white rounded-br-md'
                                    : isDark
                                        ? 'bg-slate-800 text-slate-200 rounded-bl-md'
                                        : 'bg-white text-gray-800 rounded-bl-md border border-gray-200'
                                    }`}>
                                    {msg.role === 'assistant' ? (
                                        <div className="prose prose-sm prose-invert max-w-none">
                                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                                        </div>
                                    ) : (
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                    )}
                                </div>
                                {msg.tools_used && msg.tools_used.length > 0 && (
                                    <div className="flex gap-1 mt-1 flex-wrap">
                                        {msg.tools_used.map((tool, i) => (
                                            <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                                                🔧 {tool}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {msg.role === 'user' && (
                                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-600 flex items-center justify-center">
                                    <User size={16} className="text-white" />
                                </div>
                            )}
                        </div>
                    ))
                )}

                {isLoading && (
                    <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                            <Bot size={16} className="text-white" />
                        </div>
                        <div className={`px-4 py-3 rounded-2xl rounded-bl-md ${isDark ? 'bg-slate-800' : 'bg-white border border-gray-200'}`}>
                            <Loader2 size={18} className="animate-spin text-purple-500" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={`p-4 border-t ${borderClass}`}>
                <div className={`flex items-end gap-2 ${inputBg} rounded-2xl border ${borderClass} p-2`}>
                    <textarea
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage();
                            }
                        }}
                        placeholder="ถามเกี่ยวกับการเทรด..."
                        rows={1}
                        className={`flex-1 bg-transparent resize-none outline-none text-sm ${textClass} placeholder:${mutedClass} max-h-32`}
                        style={{ minHeight: '24px' }}
                    />
                    <button
                        onClick={() => sendMessage()}
                        disabled={!input.trim() || isLoading}
                        className={`p-2 rounded-xl transition ${input.trim() && !isLoading
                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                            : isDark ? 'bg-slate-700 text-slate-500' : 'bg-gray-200 text-gray-400'
                            }`}
                    >
                        <Send size={18} />
                    </button>
                </div>
                <p className={`text-[10px] ${mutedClass} text-center mt-2`}>
                    AI มีข้อมูล: {stats?.total_trades || 0} trades, Balance: ${account?.balance?.toLocaleString() || 'N/A'}
                </p>
            </div>
        </div>
    );
}
