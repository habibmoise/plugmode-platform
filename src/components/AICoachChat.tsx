// src/components/AICoachChat.tsx
import React, { useState, useRef, useEffect } from 'react';

// Define our simple icon components to avoid Lucide import issues
const MessageCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22,2 15,22 11,13 2,9"/>
  </svg>
);

const MicIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const MicOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="2" y1="2" x2="22" y2="22"/>
    <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/>
    <path d="M12 19a7 7 0 0 1-7-7v-2"/>
    <path d="M12 1a3 3 0 0 0-3 3v4l6 6V4a3 3 0 0 0-3-3z"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const Volume2Icon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>
);

const VolumeXIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="11,5 6,9 2,9 2,15 6,15 11,19"/>
    <line x1="23" y1="9" x2="17" y2="15"/>
    <line x1="17" y1="9" x2="23" y2="15"/>
  </svg>
);

// Message type interface
interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// Chat service function that works with your existing backend
const chatWithAI = async (message: string, userId: string) => {
  try {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        message,
        userId,
        conversationId: `chat-${Date.now()}`
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      // Handle rate limiting specifically
      if (response.status === 429) {
        throw new Error(`Monthly limit reached: ${errorData.used}/${errorData.limit} messages used this month. Upgrade to ${errorData.tier === 'starter' ? 'Professional' : 'Career OS'} for more messages.`);
      }
      
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { 
      message: data.response || 'I apologize, but I encountered an issue. Please try again.',
      remainingUses: data.remainingUses,
      tier: data.tier
    };
  } catch (error) {
    console.error('Chat API error:', error);
    throw error; // Re-throw to handle in component
  }
};

const AICoachChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState<{[key: number]: boolean}>({});
  const [userTier, setUserTier] = useState<string>('career_os'); // Will be updated from backend
  const [remainingUses, setRemainingUses] = useState<number>(-1);
  const [userId] = useState('demo-user-123'); // Replace with actual user ID from auth
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        alert('Voice recognition error. Please check microphone permissions.');
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const playAudioResponse = async (text: string, messageId: number) => {
    try {
      setIsPlaying(prev => ({ ...prev, [messageId]: true }));

      const response = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          voiceId: '9BWtsMINqrJLrRacOk9x' // Aria voice from your API response
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('TTS API Error:', response.status, errorText);
        throw new Error(`TTS API error: ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        setIsPlaying(prev => ({ ...prev, [messageId]: false }));
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = (error) => {
        console.error('Audio playback error:', error);
        setIsPlaying(prev => ({ ...prev, [messageId]: false }));
        URL.revokeObjectURL(audioUrl);
        alert('Audio playback failed. Please try again.');
      };

      await audio.play();
    } catch (error) {
      console.error('Text-to-speech failed:', error);
      setIsPlaying(prev => ({ ...prev, [messageId]: false }));
      alert('Voice generation failed. Please try again.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatWithAI(input.trim(), userId);
      
      const aiMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.message,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Update usage tracking
      setRemainingUses(response.remainingUses);
      setUserTier(response.tier);

      // Auto-play audio for Career OS users
      if (response.tier === 'career_os') {
        setTimeout(() => {
          playAudioResponse(response.message, aiMessage.id);
        }, 500);
      }

    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: error instanceof Error ? error.message : 'I apologize, but I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const isVoiceEnabled = userTier === 'career_os';

  return (
    <div className="flex flex-col h-[600px] max-w-4xl mx-auto bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-purple-600 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <MessageCircleIcon />
          <h3 className="font-semibold">AI Career Coach</h3>
        </div>
        {isVoiceEnabled && (
          <div className="text-sm text-purple-200 flex items-center gap-2">
            🎤 Voice enabled
            {remainingUses >= 0 && (
              <span className="text-xs">({remainingUses} messages left)</span>
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <MessageCircleIcon />
            <p className="text-lg font-medium mb-2">Welcome to your AI Career Coach!</p>
            <p className="text-sm">Ask me anything about your career, job search, or professional development.</p>
            {isVoiceEnabled && (
              <p className="text-sm text-purple-600 mt-2">🎤 You can speak or type your questions</p>
            )}
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-lg p-3 ${
              message.role === 'user' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              
              {/* Audio controls for AI messages */}
              {message.role === 'assistant' && isVoiceEnabled && (
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => playAudioResponse(message.content, message.id)}
                    disabled={isPlaying[message.id]}
                    className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 disabled:opacity-50"
                  >
                    {isPlaying[message.id] ? (
                      <>
                        <VolumeXIcon />
                        Playing...
                      </>
                    ) : (
                      <>
                        <Volume2Icon />
                        Play Audio
                      </>
                    )}
                  </button>
                </div>
              )}
              
              <div className="text-xs opacity-70 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 max-w-[80%]">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span className="text-sm text-gray-600">AI is thinking...</span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isVoiceEnabled ? "Type your message or use the microphone..." : "Type your message..."}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={isLoading}
            />
          </div>

          {/* Voice Input Button - Only for Career OS */}
          {isVoiceEnabled && (
            <button
              type="button"
              onClick={toggleRecording}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title={isRecording ? 'Stop recording' : 'Start voice input'}
            >
              {isRecording ? (
                <div className="flex items-center gap-1">
                  <MicOffIcon />
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                    <div className="w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              ) : (
                <MicIcon />
              )}
            </button>
          )}

          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <SendIcon />
          </button>
        </div>

        {isRecording && (
          <div className="mt-2 text-center">
            <p className="text-sm text-red-600 animate-pulse">🔴 Recording... Speak now</p>
          </div>
        )}
      </form>
    </div>
  );
};

export default AICoachChat;