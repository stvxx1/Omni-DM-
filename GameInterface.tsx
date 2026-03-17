import React, { useState, useEffect, useRef } from 'react';
import { Send, Terminal, Shield, Crosshair, Heart, Brain, Sparkles, Package, Image as ImageIcon, Users, Swords, Menu, X, Cpu, Ghost, MessageSquare, BookOpen } from 'lucide-react';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { generateSceneImage } from '../services/geminiService';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface SaveSlot {
  id: string;
  name: string;
  date: string;
  lastMessage: string;
  setting: string;
}

interface GameInterfaceProps {
  messages: Message[];
  onSendMessage: (msg: string) => void;
  onRetry: () => void;
  isLoading: boolean;
  saveSlots: SaveSlot[];
}

const LoreLink = ({ name, slot }: { name: string, slot: SaveSlot }) => {
  const [isOpen, setIsOpen] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <span className="relative inline-block">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="text-red-500 hover:text-red-400 underline decoration-dotted cursor-help font-bold transition-colors"
      >
        {name}
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            ref={popupRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-72 p-5 bg-zinc-900 border border-red-900/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[100] text-left overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50"></div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-red-500">Lore Entry</span>
              </div>
              <span className="text-[8px] font-mono text-zinc-600">{slot.date}</span>
            </div>
            <h4 className="text-lg font-bold text-zinc-100 uppercase tracking-widest mb-1 font-serif">{slot.name}</h4>
            <div className={`text-[9px] uppercase tracking-widest font-bold mb-3 ${slot.setting === 'fantasy' ? 'text-red-400' : 'text-cyan-400'}`}>
              {slot.setting === 'fantasy' ? 'Blood-Sands Survivor' : 'Chrome-Gut Operative'}
            </div>
            <div className="space-y-2">
              <div className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">Campaign Exploits</div>
              <p className="text-xs text-zinc-400 italic leading-relaxed">"{slot.lastMessage}"</p>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
               <span className="text-[8px] text-zinc-600 uppercase tracking-widest">Chronicle ID: {slot.id.slice(-6)}</span>
               <button onClick={() => setIsOpen(false)} className="text-[8px] text-red-500 hover:text-red-400 uppercase tracking-widest font-bold">Close</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
};

const LoreParagraph = ({ children, saveSlots }: { children: any, saveSlots: SaveSlot[] }) => {
  const processNode = (node: any): any => {
    if (typeof node === 'string') {
      const names = saveSlots.map(s => s.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      if (names.length === 0) return node;

      const regex = new RegExp(`\\b(${names.join('|')})\\b`, 'g');
      const parts = node.split(regex);

      return parts.map((part, i) => {
        const slot = saveSlots.find(s => s.name === part);
        if (slot) {
          return <LoreLink key={i} name={part} slot={slot} />;
        }
        return part;
      });
    }
    
    if (Array.isArray(node)) {
      return node.map((child, i) => <React.Fragment key={i}>{processNode(child)}</React.Fragment>);
    }

    if (React.isValidElement(node)) {
      const children = (node.props as any).children;
      if (children) {
        return React.cloneElement(node, node.props as any, processNode(children));
      }
    }

    return node;
  };

  return <p className="mb-4 last:mb-0">{processNode(children)}</p>;
};

export default function GameInterface({ messages, onSendMessage, onRetry, isLoading, saveSlots }: GameInterfaceProps) {
  const [input, setInput] = useState('');
  const [sceneImages, setSceneImages] = useState<Record<number, string>>({});
  const [isGeneratingImage, setIsGeneratingImage] = useState<number | null>(null);
  const [autoVisualize, setAutoVisualize] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isCommsMinimized, setIsCommsMinimized] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'restart' | 'purge' | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'visuals' | 'lore'>('status');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    
    // Auto-visualize logic
    if (autoVisualize && messages.length > 0 && !isLoading) {
      const lastIdx = messages.length - 1;
      const lastMsg = messages[lastIdx];
      if (lastMsg.role === 'model' && !sceneImages[lastIdx] && isGeneratingImage !== lastIdx && !lastMsg.text.startsWith('Error:')) {
        handleGenerateImage(lastIdx, stripStatus(lastMsg.text));
      }
    }
  }, [messages, isLoading, autoVisualize]);

  useEffect(() => {
    const handleScroll = () => {
      if (chatContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
        setShowScrollButton(!isNearBottom);
      }
    };

    const container = chatContainerRef.current;
    container?.addEventListener('scroll', handleScroll);
    return () => container?.removeEventListener('scroll', handleScroll);
  }, []);

  const resetTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!input.trim() || isLoading) return;
      onSendMessage(input);
      setInput('');
      setImageError(null);
      resetTextareaHeight();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    if (input.startsWith('/v ') || input.startsWith('/visualize ')) {
      const prompt = input.replace(/^\/(v|visualize)\s+/, '');
      const lastModelIdx = [...messages].map((m, i) => ({m, i})).reverse().find(x => x.m.role === 'model')?.i;
      if (lastModelIdx !== undefined) {
        handleGenerateImage(lastModelIdx, prompt);
        setInput('');
        resetTextareaHeight();
        return;
      }
    }

    setImageError(null);
    onSendMessage(input);
    setInput('');
    resetTextareaHeight();
  };

  const handleGenerateImage = async (index: number, text: string) => {
    setIsGeneratingImage(index);
    setImageError(null);
    try {
      const imageUrl = await generateSceneImage(text);
      if (imageUrl) {
        setSceneImages(prev => ({ ...prev, [index]: imageUrl }));
      }
    } catch (error: any) {
      console.error("Failed to generate image", error);
      const errStr = typeof error === 'string' ? error : JSON.stringify(error, Object.getOwnPropertyNames(error));
      if (errStr.includes('429') || errStr.includes('quota') || errStr.includes('RESOURCE_EXHAUSTED')) {
        setImageError("Image generation failed: API quota exceeded. Please check your billing details.");
      } else {
        setImageError("Image generation failed. Please try again.");
      }
      setTimeout(() => setImageError(null), 5000);
    } finally {
      setIsGeneratingImage(null);
    }
  };

  // Parse latest status from the last model message
  const lastModelMessage = [...messages].reverse().find(m => m.role === 'model');
  let status = {
    levelXp: '1/0',
    stats: '10/10/10/10/10',
    health: '100/100',
    armor: 'None (0)',
    skills: 'None',
    inventory: 'None',
    npcs: 'None',
    companion: {
      name: 'None',
      lvlXp: '1/0',
      ability: 'None',
      commentary: ''
    },
    activeState: 'None',
    combat: null as { turn: string, order: string[], enemies: { name: string, hp: string, morale: string, status: string[] }[] } | null,
    challenge: null as { name: string, successes: string, failures: string, status: string[] } | null
  };

  if (lastModelMessage) {
    const text = lastModelMessage.text;
    const statusMatch = text.match(/---STATUS---([\s\S]*?)---END STATUS---/);
    
    if (statusMatch) {
      const statusText = statusMatch[1];
      const lines = statusText.split('\n').map(l => l.trim()).filter(l => l.includes(':'));
      
      lines.forEach(line => {
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();
        const cleanKey = key.toLowerCase();

        if (cleanKey.includes('level')) status.levelXp = value;
        else if (cleanKey.includes('stats')) status.stats = value;
        else if (cleanKey.includes('health')) status.health = value;
        else if (cleanKey.includes('armor')) status.armor = value;
        else if (cleanKey.includes('skills')) status.skills = value;
        else if (cleanKey.includes('inventory')) status.inventory = value;
        else if (cleanKey.includes('npcs')) status.npcs = value;
        else if (cleanKey.includes('companion')) {
          // Parse companion: [Name (Lvl: X, XP: Y/500), Ability: [Name (Effect)], Commentary: "Quote"]
          const nameMatch = value.match(/\[(.*?)\s*\(/);
          if (nameMatch) status.companion.name = nameMatch[1];
          
          const lvlXpMatch = value.match(/Lvl: (.*?), XP: (.*?)\)/);
          if (lvlXpMatch) status.companion.lvlXp = `${lvlXpMatch[1]}/${lvlXpMatch[2]}`;
          
          const abilityMatch = value.match(/Ability: \[(.*?)\]/);
          if (abilityMatch) status.companion.ability = abilityMatch[1];
          
          const commentaryMatch = value.match(/Commentary: "(.*?)"/);
          if (commentaryMatch) status.companion.commentary = commentaryMatch[1];
        } else if (cleanKey.includes('active state')) {
          status.activeState = value;
          if (value.toLowerCase().includes('combat:')) {
            try {
              const turnMatch = value.match(/Turn:\s*([^,]*)/i);
              const orderMatch = value.match(/Order:\s*\[(.*?)\]/i);
              const enemyMatches = value.matchAll(/Enemy:\s*\[(.*?)\]/gi);
              
              status.combat = {
                turn: turnMatch ? turnMatch[1].trim() : '1',
                order: orderMatch ? orderMatch[1].split(',').map(s => s.trim()).filter(Boolean) : [],
                enemies: Array.from(enemyMatches).map(m => {
                  const parts = m[1].split(',').map(s => s.trim());
                  // parts: [Name, HP/MaxHP, Morale, Status: [Effect|...]]
                  const statusPart = m[1].match(/Status:\s*\[(.*?)\]/i);
                  return {
                    name: parts[0],
                    hp: parts[1],
                    morale: parts[2],
                    status: statusPart ? statusPart[1].split('|').map(s => s.trim()).filter(Boolean) : []
                  };
                })
              };
            } catch (e) {
              console.error("Failed to parse combat status", e);
            }
          } else if (value.toLowerCase().includes('challenge:')) {
            try {
              const challengeMatch = value.match(/Challenge:\s*\((.*?)\)/i);
              if (challengeMatch) {
                const content = challengeMatch[1];
                const parts = content.split(',').map(s => s.trim());
                const successesMatch = content.match(/Successes:\s*(\d+\/\d+)/i);
                const failuresMatch = content.match(/Failures:\s*(\d+\/\d+)/i);
                const statusPart = content.match(/Status:\s*\[(.*?)\]/i);
                
                status.challenge = {
                  name: parts[0],
                  successes: successesMatch ? successesMatch[1] : '0/0',
                  failures: failuresMatch ? failuresMatch[1] : '0/0',
                  status: statusPart ? statusPart[1].split('|').map(s => s.trim()).filter(Boolean) : []
                };
              }
            } catch (e) {
              console.error("Failed to parse challenge status", e);
            }
          }
        }
      });
    }
  }

  const statValues = status.stats.split('/').map(s => s.trim());
  
  let inventorySlots = "0/10";
  let inventoryItems = status.inventory;
  const slotsMatch = status.inventory.match(/\[Slots:\s*(.*?)\]/i);
  if (slotsMatch) {
    inventorySlots = slotsMatch[1];
    inventoryItems = status.inventory.replace(slotsMatch[0], '').trim();
  }

  // Helper to strip status block from displayed text
  const stripStatus = (text: string) => {
    return text.replace(/---STATUS---[\s\S]*?---END STATUS---/g, '').trim();
  };

  return (
    <div className="flex h-screen bg-[#050505] text-zinc-300 font-sans overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/grimdark/1920/1080?blur=10')] opacity-10 bg-cover bg-center mix-blend-overlay pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/50 to-[#050505] pointer-events-none"></div>

        {/* Floating Companion Comms */}
        <AnimatePresence>
          {status.companion.commentary && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className={`absolute top-24 right-4 z-20 w-[calc(100%-2rem)] max-w-[320px] pointer-events-none transition-all duration-500 ${isStatusOpen ? 'right-[300px] md:right-[330px] lg:right-[350px]' : 'right-4'}`}
            >
              <div className={`pointer-events-auto glass-panel p-4 border-cyan-500/30 bg-cyan-950/20 shadow-[0_0_20px_rgba(6,182,212,0.1)] rounded-xl overflow-hidden relative group ${isCommsMinimized ? 'h-12 w-12 !p-2 rounded-full overflow-hidden' : ''}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none"></div>
                
                <div className="flex items-center justify-between mb-2 border-b border-cyan-500/20 pb-2 relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
                    {!isCommsMinimized && (
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">
                        {status.companion.name} // COMMS
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsCommsMinimized(!isCommsMinimized); }}
                    className="p-1 hover:bg-cyan-500/20 rounded transition-colors text-cyan-500"
                  >
                    {isCommsMinimized ? <MessageSquare className="w-4 h-4" /> : <X className="w-3 h-3" />}
                  </button>
                </div>

                {!isCommsMinimized && (
                  <div className="relative z-10">
                    <div className="flex gap-3 items-start">
                      <div className="shrink-0 p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                        {status.companion.name.toLowerCase().includes('vera') ? <Cpu className="w-4 h-4 text-cyan-400" /> : <Ghost className="w-4 h-4 text-cyan-400" />}
                      </div>
                      <div className="text-[11px] font-mono text-cyan-100/90 leading-relaxed italic">
                        "{status.companion.commentary}"
                      </div>
                    </div>
                  </div>
                )}

                {/* Scanline effect */}
                <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.1)_50%)] bg-[length:100%_4px] opacity-20"></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <header className="glass-panel border-b border-white/5 p-4 md:p-5 flex items-center justify-between z-10 shrink-0 relative">
          <div className="flex items-center space-x-3 md:space-x-4 min-w-0">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-900/20 border border-red-900/50 flex items-center justify-center shrink-0">
              <Terminal className="text-red-500 w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-xl font-bold uppercase tracking-[0.2em] text-zinc-100 font-serif truncate">Omni-DM</h1>
              <div className="text-[8px] md:text-[10px] text-red-500/70 uppercase tracking-[0.3em] truncate">The Definitive Chronicles</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setAutoVisualize(!autoVisualize)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-[10px] uppercase tracking-widest font-bold ${autoVisualize ? 'bg-red-900/40 border-red-500 text-red-100 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-zinc-900/50 border-white/5 text-zinc-500 hover:text-zinc-300'}`}
              title={autoVisualize ? "Auto-Visualize Enabled" : "Auto-Visualize Disabled"}
            >
              <Sparkles className={`w-3.5 h-3.5 ${autoVisualize ? 'animate-pulse text-red-400' : ''}`} />
              <span className="hidden sm:inline">Auto-Vis</span>
            </button>
            <button 
              className="lg:hidden p-2 text-zinc-400 hover:text-zinc-100 bg-zinc-900/50 rounded-lg border border-white/5"
              onClick={() => setIsStatusOpen(!isStatusOpen)}
            >
              {isStatusOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>

        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 md:space-y-12 z-10 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent relative"
        >
          {/* Error Notification */}
          <AnimatePresence>
            {imageError && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md"
              >
                <div className="bg-red-950/90 border border-red-500/50 backdrop-blur-md p-4 rounded-xl shadow-2xl flex items-center gap-3">
                  <Terminal className="w-5 h-5 text-red-500 shrink-0" />
                  <p className="text-xs md:text-sm text-red-200 font-mono">{imageError}</p>
                  <button onClick={() => setImageError(null)} className="ml-auto text-red-400 hover:text-red-200">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Floating Scroll Button */}
          <AnimatePresence>
            {showScrollButton && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={scrollToBottom}
                className="fixed bottom-32 right-8 md:right-[420px] z-20 bg-zinc-800/80 hover:bg-zinc-700 backdrop-blur border border-white/10 p-3 rounded-full shadow-xl text-zinc-400 hover:text-zinc-200 transition-all"
              >
                <Terminal className="w-5 h-5 rotate-90" />
              </motion.button>
            )}
          </AnimatePresence>
          {messages.map((msg, i) => (
            <div key={i} className={`flex w-full min-w-0 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-4xl w-full min-w-0 ${msg.role === 'user' ? 'bg-zinc-900/80 border border-zinc-800 text-zinc-200 ml-auto max-w-2xl' : 'bg-transparent text-zinc-300'} rounded-xl p-3 md:p-6 break-words overflow-hidden`}>
                {msg.role === 'user' ? (
                  <div className="text-lg font-mono text-zinc-400">
                    <span className="text-red-500 mr-2">{'>'}</span>{msg.text}
                  </div>
                ) : (
                    <div className="flex flex-col gap-6">
                      <div className="markdown-body max-w-full overflow-hidden">
                        <Markdown components={{ p: ({ children }) => <LoreParagraph saveSlots={saveSlots}>{children}</LoreParagraph> }}>
                          {stripStatus(msg.text)}
                        </Markdown>
                      </div>
                      
                      {msg.text.startsWith('Error:') ? (
                        <div className="mt-4 flex items-center gap-4">
                          <button 
                            onClick={onRetry}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-red-900/20 border border-red-500/30 text-red-400 rounded-lg text-xs font-mono hover:bg-red-900/40 transition-all disabled:opacity-50"
                          >
                            <Terminal className="w-3 h-3" /> Retry Connection
                          </button>
                        </div>
                      ) : (
                      <>
                        {sceneImages[i] ? (
                          <div className="relative group rounded-xl overflow-hidden border border-white/10 shadow-2xl mt-4">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <img src={sceneImages[i]} alt="Scene Visualization" className="w-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        ) : (
                          <button 
                            type="button"
                            onClick={() => handleGenerateImage(i, stripStatus(msg.text))}
                            disabled={isGeneratingImage === i}
                            className="self-start flex items-center space-x-3 text-xs uppercase tracking-widest bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 py-3 px-5 rounded-lg border border-white/5 transition-all disabled:opacity-50 mt-2"
                          >
                            <ImageIcon className="w-4 h-4" />
                            <span>{isGeneratingImage === i ? 'Visualizing...' : 'Visualize Scene'}</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-transparent text-zinc-500 p-6 flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse delay-75"></div>
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse delay-150"></div>
                <span className="ml-2 text-sm uppercase tracking-widest">UDM is processing...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} className="h-4 md:h-8" />
        </div>

        <div className="p-4 md:p-6 glass-panel border-t border-white/5 z-10 shrink-0 min-w-0">
          {/* Quick Actions for Mobile/Tablet */}
          <div className="flex overflow-x-auto gap-2 mb-4 pb-2 scrollbar-none lg:hidden">
            <QuickAction label="Look Around" onClick={() => onSendMessage("Look around the area.")} icon={<Crosshair className="w-3 h-3" />} />
            <QuickAction label="Check Gear" onClick={() => onSendMessage("Check my current inventory and gear status.")} icon={<Package className="w-3 h-3" />} />
            <QuickAction label="Talk to Companion" onClick={() => onSendMessage(`Talk to ${status.companion.name}.`)} icon={<MessageSquare className="w-3 h-3" />} />
            <QuickAction label="Status Report" onClick={() => onSendMessage("Provide a full status report on my condition and environment.")} icon={<Terminal className="w-3 h-3" />} />
          </div>

          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative flex items-end gap-2">
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What do you do?"
                rows={1}
                className="w-full bg-zinc-900/50 backdrop-blur border border-white/10 rounded-xl py-3 md:py-4 pl-4 md:pl-6 pr-4 text-sm md:text-base text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-red-600/50 focus:ring-1 focus:ring-red-600/50 transition-all font-mono resize-none min-h-[52px] max-h-[200px] overflow-y-auto"
                disabled={isLoading}
                style={{ height: 'auto' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
                }}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 md:px-5 h-[52px] bg-red-900/40 hover:bg-red-800/60 text-red-100 rounded-lg flex items-center justify-center disabled:opacity-50 transition-all border border-red-900/50 shrink-0"
            >
              <Send className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Overlay for mobile status panel */}
      {isStatusOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setIsStatusOpen(false)}
        />
      )}

      {/* Status Panel */}
      <div className={`fixed lg:static inset-y-0 right-0 w-72 md:w-80 lg:w-84 glass-panel border-l border-white/5 flex flex-col z-30 shadow-[-20px_0_40px_rgba(0,0,0,0.5)] transform transition-transform duration-300 ease-in-out ${isStatusOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
        <div className="p-4 md:p-6 border-b border-white/5 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="hud-text">Neural Link</h2>
            <button 
              className="lg:hidden text-zinc-500 hover:text-zinc-300"
              onClick={() => setIsStatusOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-white/5">
            <button 
              onClick={() => setActiveTab('status')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'status' ? 'bg-zinc-800 text-zinc-100 shadow-inner' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <Terminal className="w-3 h-3" /> Status
            </button>
            <button 
              onClick={() => setActiveTab('visuals')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'visuals' ? 'bg-zinc-800 text-zinc-100 shadow-inner' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <ImageIcon className="w-3 h-3" /> Visuals
            </button>
            <button 
              onClick={() => setActiveTab('lore')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'lore' ? 'bg-zinc-800 text-zinc-100 shadow-inner' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              <BookOpen className="w-3 h-3" /> Lore
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          {activeTab === 'status' ? (
            <div className="p-6 md:p-8 space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
              <section>
                <h2 className="hud-text mb-6">Vitals</h2>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-xs mb-2 uppercase tracking-wider font-mono">
                      <span className="text-zinc-500">Level / XP</span>
                      <span className="text-zinc-200">{status.levelXp}</span>
                    </div>
                    <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-600/80 w-1/3 shadow-[0_0_10px_rgba(8,145,178,0.5)]"></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-2 uppercase tracking-wider font-mono">
                      <span className="text-zinc-500">Health</span>
                      <span className="text-red-400">{status.health}</span>
                    </div>
                    <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-red-600/80 w-full shadow-[0_0_10px_rgba(220,38,38,0.5)]"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/30 border border-white/5">
                    <div className="flex items-center space-x-3">
                      <Shield className="w-4 h-4 text-zinc-500" />
                      <span className="hud-text">Armor</span>
                    </div>
                    <span className="font-mono text-zinc-300 text-xs">{status.armor}</span>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="hud-text mb-6">Attributes</h2>
                <div className="space-y-2">
                  <StatRow icon={<Shield className="w-4 h-4 text-zinc-500" />} label="STR" value={statValues[0] || '10'} />
                  <StatRow icon={<Crosshair className="w-4 h-4 text-zinc-500" />} label="AGI" value={statValues[1] || '10'} />
                  <StatRow icon={<Heart className="w-4 h-4 text-zinc-500" />} label="CON" value={statValues[2] || '10'} />
                  <StatRow icon={<Brain className="w-4 h-4 text-zinc-500" />} label="INT" value={statValues[3] || '10'} />
                  <StatRow icon={<Sparkles className="w-4 h-4 text-zinc-500" />} label="CHA" value={statValues[4] || '10'} />
                </div>
              </section>

              <section>
                <h2 className="hud-text mb-4">Skills & Talents</h2>
                <div className="bg-zinc-900/30 border border-white/5 rounded-lg p-4 text-xs text-zinc-400 leading-relaxed flex items-start space-x-3 font-mono">
                  <Swords className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
                  <span>{status.skills}</span>
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="hud-text">Inventory</h2>
                  <span className="text-xs font-mono text-zinc-500">Slots: {inventorySlots}</span>
                </div>
                <div className="bg-zinc-900/30 border border-white/5 rounded-lg p-4 text-xs text-zinc-400 leading-relaxed flex items-start space-x-3 font-mono">
                  <Package className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
                  <span>{inventoryItems || 'Empty'}</span>
                </div>
              </section>

              <section>
                <h2 className="hud-text mb-4">NPC Relationships</h2>
                <div className="bg-zinc-900/30 border-white/5 rounded-lg p-4 text-xs text-zinc-400 leading-relaxed flex items-start space-x-3 font-mono">
                  <Users className="w-4 h-4 text-zinc-600 shrink-0 mt-0.5" />
                  <span>{status.npcs}</span>
                </div>
              </section>

              <section>
                <h2 className="hud-text mb-4">Companion: {status.companion.name}</h2>
                <div className="space-y-4">
                  <div className="bg-zinc-900/30 border border-white/5 rounded-lg p-4">
                    <div className="flex justify-between text-[10px] mb-2 uppercase tracking-wider font-mono">
                      <span className="text-zinc-500">Lvl / XP</span>
                      <span className="text-cyan-400">{status.companion.lvlXp}</span>
                    </div>
                    <div className="h-1 bg-zinc-900 rounded-full overflow-hidden mb-4">
                      <div className="h-full bg-cyan-600/80 w-1/4 shadow-[0_0_10px_rgba(8,145,178,0.5)]"></div>
                    </div>
                    <div className="flex items-center space-x-3 text-xs font-mono text-zinc-400">
                      <Sparkles className="w-3 h-3 text-cyan-500" />
                      <span>Ability: <span className="text-zinc-200">{status.companion.ability}</span></span>
                    </div>
                  </div>
                  {status.companion.commentary && (
                    <div className="bg-cyan-900/5 border border-cyan-500/20 rounded-lg p-4 text-[11px] italic text-cyan-200/70 font-mono leading-relaxed relative group">
                      "{status.companion.commentary}"
                      <button 
                        onClick={() => onSendMessage(`[Request Guidance from ${status.companion.name}]`)}
                        disabled={isLoading}
                        className="absolute -bottom-2 -right-2 bg-cyan-900 border border-cyan-500/50 text-cyan-400 px-2 py-1 rounded text-[8px] uppercase font-bold tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      >
                        Request Guidance
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {status.activeState !== 'None' && (
                <section>
                  <h2 className="hud-text mb-4">Active Engagement</h2>
                  
                  {status.combat ? (
                    <div className="space-y-4">
                      <div className="bg-red-900/10 border border-red-500/30 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center space-x-2">
                            <Swords className="w-4 h-4 text-red-500" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-red-400">Combat Protocol</span>
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500">Turn: {status.combat.turn}</span>
                        </div>

                        {status.combat.order.length > 0 && (
                          <div className="mb-4 pb-4 border-b border-red-500/10">
                            <div className="text-[8px] uppercase tracking-wider text-zinc-500 mb-2">Initiative Order</div>
                            <div className="flex flex-wrap gap-2">
                              {status.combat.order.map((name, idx) => (
                                <div key={idx} className={`px-2 py-0.5 rounded text-[9px] font-mono border ${idx === 0 ? 'bg-red-500/20 border-red-500 text-red-100' : 'bg-zinc-900/50 border-white/5 text-zinc-400'}`}>
                                  {name}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="space-y-4">
                          {status.combat.enemies.map((enemy, idx) => {
                            const [currHp, maxHp] = enemy.hp.split('/').map(n => parseInt(n) || 0);
                            const hpPercent = maxHp > 0 ? (currHp / maxHp) * 100 : 0;
                            
                            return (
                              <div key={idx} className="space-y-2">
                                <div className="flex justify-between items-end">
                                  <span className="text-xs font-bold text-zinc-200">{enemy.name}</span>
                                  <span className="text-[10px] font-mono text-red-400">{enemy.hp} HP</span>
                                </div>
                                <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-white/5">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${hpPercent}%` }}
                                    className={`h-full ${hpPercent > 50 ? 'bg-red-600' : hpPercent > 20 ? 'bg-amber-500' : 'bg-red-800'} shadow-[0_0_8px_rgba(220,38,38,0.3)]`}
                                  />
                                </div>
                                <div className="flex justify-between items-center text-[9px] font-mono">
                                  <span className="text-zinc-500 uppercase tracking-tighter">Morale: {enemy.morale}</span>
                                  <div className="flex gap-1">
                                    {enemy.status.map((eff, eIdx) => (
                                      <span key={eIdx} className="px-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded flex items-center gap-1">
                                        <Sparkles className="w-2 h-2" /> {eff}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : status.challenge ? (
                    <div className="bg-amber-900/10 border border-amber-500/30 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-4">
                        <Brain className="w-4 h-4 text-amber-500" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Skill Challenge</span>
                      </div>
                      
                      <div className="text-xs font-bold text-zinc-200 mb-4">{status.challenge.name}</div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-[9px] font-mono uppercase text-emerald-500">
                            <span>Successes</span>
                            <span>{status.challenge.successes}</span>
                          </div>
                          <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                            {(() => {
                              const [curr, max] = status.challenge.successes.split('/').map(n => parseInt(n) || 0);
                              const pct = max > 0 ? (curr / max) * 100 : 0;
                              return <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" />;
                            })()}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[9px] font-mono uppercase text-red-500">
                            <span>Failures</span>
                            <span>{status.challenge.failures}</span>
                          </div>
                          <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                            {(() => {
                              const [curr, max] = status.challenge.failures.split('/').map(n => parseInt(n) || 0);
                              const pct = max > 0 ? (curr / max) * 100 : 0;
                              return <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="h-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]" />;
                            })()}
                          </div>
                        </div>
                      </div>

                      {status.challenge.status.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {status.challenge.status.map((eff, idx) => (
                            <span key={idx} className="px-1 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded text-[8px] font-mono flex items-center gap-1">
                              <Sparkles className="w-2 h-2" /> {eff}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`p-4 rounded-lg border font-mono text-xs ${status.activeState.toLowerCase().includes('combat') ? 'bg-red-900/10 border-red-500/30 text-red-200' : 'bg-amber-900/10 border-amber-500/30 text-amber-200'}`}>
                      <div className="flex items-center space-x-2 mb-2">
                        <Swords className={`w-4 h-4 ${status.activeState.toLowerCase().includes('combat') ? 'text-red-500' : 'text-amber-500'}`} />
                        <span className="uppercase tracking-widest font-bold">
                          {status.activeState.toLowerCase().includes('combat') ? 'Combat Protocol' : 'Skill Challenge'}
                        </span>
                      </div>
                      <div className="leading-relaxed opacity-90">
                        {status.activeState}
                      </div>
                    </div>
                  )}
                </section>
              )}

              <section className="pt-8 border-t border-white/5 pb-10">
                <h2 className="hud-text mb-4">System Control</h2>
                <div className="grid grid-cols-1 gap-3">
                  {confirmAction === 'restart' ? (
                    <div className="bg-zinc-900/80 border border-zinc-700 p-4 rounded-lg space-y-3">
                      <p className="text-[10px] font-mono text-zinc-400">Restart simulation? Unsaved progress will be lost.</p>
                      <div className="flex gap-2">
                        <button onClick={() => window.location.reload()} className="flex-1 py-2 bg-zinc-700 text-white rounded text-[10px] font-bold uppercase">Confirm</button>
                        <button onClick={() => setConfirmAction(null)} className="flex-1 py-2 bg-zinc-900 text-zinc-500 rounded text-[10px] font-bold uppercase">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setConfirmAction('restart')}
                      className="flex items-center justify-center gap-2 p-3 bg-zinc-900/50 border border-white/10 rounded-lg text-xs font-mono text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-all"
                    >
                      <Terminal className="w-4 h-4" /> Restart Simulation
                    </button>
                  )}

                  {confirmAction === 'purge' ? (
                    <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-lg space-y-3">
                      <p className="text-[10px] font-mono text-red-400">Purge all neural save data? This is permanent.</p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            localStorage.removeItem('omni_dm_save');
                            window.location.reload();
                          }} 
                          className="flex-1 py-2 bg-red-900 text-white rounded text-[10px] font-bold uppercase"
                        >
                          Purge
                        </button>
                        <button onClick={() => setConfirmAction(null)} className="flex-1 py-2 bg-zinc-900 text-zinc-500 rounded text-[10px] font-bold uppercase">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setConfirmAction('purge')}
                      className="flex items-center justify-center gap-2 p-3 bg-red-900/10 border border-red-900/30 rounded-lg text-xs font-mono text-red-400 hover:bg-red-900/20 transition-all"
                    >
                      <X className="w-4 h-4" /> Purge Save Data
                    </button>
                  )}
                </div>
              </section>
            </div>
          ) : activeTab === 'visuals' ? (
            <div className="p-6 md:p-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between mb-6">
                <h2 className="hud-text">Scene Visuals</h2>
                <span className="text-[10px] font-mono text-zinc-500">{Object.keys(sceneImages).length} Assets</span>
              </div>
              
              {Object.keys(sceneImages).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center border border-white/5">
                    <ImageIcon className="w-6 h-6 text-zinc-700" />
                  </div>
                  <p className="text-xs font-mono text-zinc-500 max-w-[200px]">No visual assets generated for this campaign yet.</p>
                  <button 
                    onClick={() => {
                      const lastModelIdx = [...messages].map((m, i) => ({m, i})).reverse().find(x => x.m.role === 'model')?.i;
                      if (lastModelIdx !== undefined) {
                        handleGenerateImage(lastModelIdx, stripStatus(messages[lastModelIdx].text));
                      }
                    }}
                    disabled={isLoading || isGeneratingImage !== null}
                    className="text-[10px] uppercase tracking-widest font-bold text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                  >
                    Generate Current Scene
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {[...Object.entries(sceneImages)].reverse().map(([idx, url]) => (
                    <div key={idx} className="group relative rounded-xl overflow-hidden border border-white/10 bg-zinc-900/50 shadow-xl">
                      <img src={url} alt={`Scene ${idx}`} className="w-full aspect-video object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 p-4 flex flex-col justify-end">
                        <div className="text-[10px] font-mono text-zinc-400 mb-1">Scene #{idx}</div>
                        <div className="text-[11px] text-zinc-200 line-clamp-2 italic">
                          {stripStatus(messages[parseInt(idx)].text).substring(0, 100)}...
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-10 p-4 bg-zinc-900/30 border border-white/5 rounded-xl">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">Manual Generation</h3>
                <p className="text-[10px] font-mono text-zinc-600 mb-4">Use the command <code className="text-red-500/70">/v [prompt]</code> in the chat to generate custom visual assets at any time.</p>
                <div className="flex items-center gap-2 text-[9px] text-zinc-500">
                  <Sparkles className="w-3 h-3" />
                  <span>Images are generated using Gemini 2.5 Flash</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 md:p-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between mb-4">
                <h2 className="hud-text">The Chronicle of Souls</h2>
                <div className="flex items-center gap-2 text-[8px] text-zinc-500 uppercase tracking-widest font-bold">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-600"></div>
                  {saveSlots.length} Entries
                </div>
              </div>
              
              <p className="text-[10px] text-zinc-500 italic leading-relaxed mb-6 border-l-2 border-red-900/30 pl-4">
                "The void remembers every soul that has dared to walk its path. Their names are etched in the blood-sands and the neon-gut, a testament to their struggle."
              </p>

              <div className="space-y-4">
                {saveSlots.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-white/5 rounded-xl">
                    <p className="text-xs text-zinc-600 uppercase tracking-widest">The book is currently empty.</p>
                  </div>
                ) : (
                  saveSlots.map(slot => (
                    <div key={slot.id} className="p-4 bg-zinc-900/40 border border-white/5 rounded-xl hover:border-red-900/30 transition-all group">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest group-hover:text-red-500 transition-colors">{slot.name}</h3>
                        <span className="text-[8px] font-mono text-zinc-600">{slot.date}</span>
                      </div>
                      <div className={`text-[9px] uppercase tracking-widest font-bold mb-3 ${slot.setting === 'fantasy' ? 'text-red-400/70' : 'text-cyan-400/70'}`}>
                        {slot.setting === 'fantasy' ? 'Blood-Sands' : 'Chrome-Gut'}
                      </div>
                      <p className="text-[10px] text-zinc-500 italic line-clamp-2">"{slot.lastMessage}"</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatRow({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/20 border border-white/5 hover:bg-zinc-900/40 transition-colors">
      <div className="flex items-center space-x-3">
        {icon}
        <span className="hud-text">{label}</span>
      </div>
      <span className="font-mono font-bold text-zinc-200">{value}</span>
    </div>
  );
}

function QuickAction({ label, onClick, icon }: { label: string, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 bg-zinc-900/50 border border-white/10 rounded-full text-[10px] font-mono text-zinc-400 whitespace-nowrap hover:bg-zinc-800 hover:text-zinc-200 transition-all active:scale-95"
    >
      {icon}
      {label}
    </button>
  );
}
