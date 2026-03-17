import React, { useState, useEffect } from 'react';
import CharacterCreation from './components/CharacterCreation';
import GameInterface from './components/GameInterface';
import { initChat, sendMessage, resumeChat } from './services/geminiService';
import ErrorBoundary from './components/ErrorBoundary';

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

export default function App() {
  const [gameState, setGameState] = useState<'creation' | 'playing'>('creation');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveSlots, setSaveSlots] = useState<SaveSlot[]>([]);
  const [currentSlotId, setCurrentSlotId] = useState<string | null>(null);

  useEffect(() => {
    const slots = localStorage.getItem('omni_dm_slots');
    if (slots) {
      try {
        setSaveSlots(JSON.parse(slots));
      } catch (e) {
        console.error("Failed to parse slots", e);
        setSaveSlots([]);
      }
    }
  }, []);

  useEffect(() => {
    if (gameState === 'playing' && messages.length > 0 && currentSlotId) {
      // Update the actual save data
      localStorage.setItem(`omni_dm_save_${currentSlotId}`, JSON.stringify({ messages }));
      
      // Update the slot metadata
      setSaveSlots(prev => {
        const lastMsg = messages[messages.length - 1].text;
        const truncatedMsg = lastMsg.length > 60 ? lastMsg.substring(0, 57) + '...' : lastMsg;
        
        const updatedSlots = prev.map(slot => {
          if (slot.id === currentSlotId) {
            return {
              ...slot,
              date: new Date().toLocaleString(),
              lastMessage: truncatedMsg
            };
          }
          return slot;
        });
        
        localStorage.setItem('omni_dm_slots', JSON.stringify(updatedSlots));
        return updatedSlots;
      });
    }
  }, [messages, gameState, currentSlotId]);

  const handleLoadGame = (slotId: string) => {
    const save = localStorage.getItem(`omni_dm_save_${slotId}`);
    if (save) {
      try {
        const parsed = JSON.parse(save);
        setMessages(parsed.messages);
        setCurrentSlotId(slotId);
        resumeChat(parsed.messages);
        setGameState('playing');
      } catch (e) {
        console.error("Failed to load save", e);
        handleClearSave(slotId);
      }
    }
  };

  const handleClearSave = (slotId: string) => {
    localStorage.removeItem(`omni_dm_save_${slotId}`);
    setSaveSlots(prev => {
      const updated = prev.filter(s => s.id !== slotId);
      localStorage.setItem('omni_dm_slots', JSON.stringify(updated));
      return updated;
    });
  };

  const handleCharacterComplete = async (profile: string, charName: string, setting: string) => {
    const newSlotId = Date.now().toString();
    const newSlot: SaveSlot = {
      id: newSlotId,
      name: charName,
      date: new Date().toLocaleString(),
      lastMessage: 'Campaign Started',
      setting: setting
    };

    setSaveSlots(prev => {
      const updated = [newSlot, ...prev];
      localStorage.setItem('omni_dm_slots', JSON.stringify(updated));
      return updated;
    });
    
    setCurrentSlotId(newSlotId);
    setGameState('playing');
    setIsLoading(true);
    try {
      const stream = await initChat(profile);
      let fullText = '';
      setMessages([{ role: 'model', text: '' }]);
      
      for await (const chunk of stream) {
        const text = chunk.text || '';
        fullText += text;
        setMessages([{ role: 'model', text: fullText }]);
      }
    } catch (error: any) {
      console.error("Failed to initialize chat:", error);
      let errorMessage = "Error: Could not connect to the UDM. Please check your API key.";
      const errStr = typeof error === 'string' ? error : JSON.stringify(error, Object.getOwnPropertyNames(error));
      if (errStr.includes('429') || errStr.includes('quota') || errStr.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = "Error: System overload. You have exceeded your API quota or rate limit. Please wait a moment and try again, or check your Gemini API billing details.";
      }
      setMessages([{ role: 'model', text: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (text: string, isRetry = false) => {
    if (!isRetry) {
      setMessages(prev => [...prev, { role: 'user', text }]);
    }
    setIsLoading(true);
    try {
      const stream = await sendMessage(text);
      let fullText = '';
      
      // Add an empty model message that we'll fill up
      setMessages(prev => {
        const newMessages = isRetry ? prev.filter((_, idx) => idx !== prev.length - 1) : prev;
        return [...newMessages, { role: 'model', text: '' }];
      });

      for await (const chunk of stream) {
        const chunkText = chunk.text || '';
        fullText += chunkText;
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'model', text: fullText };
          return updated;
        });
      }
    } catch (error: any) {
      console.error("Failed to send message:", error);
      let errorMessage = "Error: The UDM is unresponsive.";
      const errStr = typeof error === 'string' ? error : JSON.stringify(error, Object.getOwnPropertyNames(error));
      if (errStr.includes('429') || errStr.includes('quota') || errStr.includes('RESOURCE_EXHAUSTED')) {
        errorMessage = "Error: System overload. You have exceeded your API quota or rate limit. Please wait a moment and try again, or check your Gemini API billing details.";
      }
      setMessages(prev => [...prev, { role: 'model', text: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      handleSendMessage(lastUserMessage.text, true);
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#050505] text-zinc-300 font-sans overflow-x-hidden">
        {gameState === 'creation' ? (
          <CharacterCreation 
            onComplete={handleCharacterComplete} 
            saveSlots={saveSlots}
            onLoadGame={handleLoadGame}
            onClearSave={handleClearSave}
          />
        ) : (
          <GameInterface 
            messages={messages} 
            onSendMessage={handleSendMessage} 
            onRetry={handleRetry}
            isLoading={isLoading} 
            saveSlots={saveSlots}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
