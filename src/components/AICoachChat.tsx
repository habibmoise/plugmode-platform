import React, { useState, useEffect, useRef } from 'react';
import { generateCareerCoaching, ChatMessage } from '../lib/ai-coach';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

// Simple icon components (instead of lucide-react to avoid import issues)
const MicIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const MicOffIcon = () => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 5.586A2 2 0 015 7v6a7 7 0 0011.95 4.95M5.586 5.586L19.414 19.414M12 18v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const VolumeIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" />
  </svg>
);

const SendIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
);

const LoaderIcon = () => (
  <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

// Voice service - simplified version that doesn't require external import
const voiceService = {
  async textToSpeech(text: string): Promise<string | null> {
    try {
      // Check if ElevenLabs is available in environment
      const apiKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
      const voiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID || 'uYXf8XasLslADfZ2MB4u';
      
      if (!apiKey) {
        console.log('ElevenLabs API key not available');
        return null;
      }

      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text: text.substring(0, 500), // Limit length
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      });

      if (!response.ok) {
        throw new Error(`ElevenLabs API error: ${response.status}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });
      return URL.createObjectURL(audioBlob);
    } catch (error) {
      console.error('Text-to-speech failed:', error);
      return null;
    }
  }
};

interface AICoachChatProps {
  className?: string;
}

const AICoachChat: React.FC<AICoachChatProps> = ({ className = '' }) => {
  // Existing state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [remainingUses, setRemainingUses] = useState<number>(-1);
  const [userTier, setUserTier] = useState<string>('starter');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // New voice state
  const [isRecording, setIsRecording] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const { user } = useAuth();
  const { showToast } = useToast();

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add user tier loading effect - Simple demo account detection
  useEffect(() => {
    if (user?.email) {
      // For demo accounts, always set to career_os
      if (user.email.includes('demo') || user.email.includes('judge')) {
        setUserTier('career_os');
      } else {
        // For other users, you could check their actual subscription
        // For now, default to career_os for testing
        setUserTier('career_os');
      }
    }
  }, [user]);

  // Add welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: "Hello! I'm your AI career coach. I specialize in helping professionals in underserved regions access global remote opportunities. How can I help you today?",
        timestamp: new Date()
      }]);
    }
  }, [messages.length]);

  // Voice recording using Web Speech API
  const startVoiceRecording = async () => {
    try {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        showToast({
          type: 'error',
          title: 'Speech Recognition Not Supported',
          message: 'Please use a supported browser or type your message.'
        });
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setCurrentMessage(transcript);
        setIsRecording(false);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsRecording(false);
        showToast({
          type: 'error',
          title: 'Voice Recognition Failed',
          message: 'Please try again or type your message.'
        });
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognition.start();
    } catch (error) {
      console.error('Error starting voice recording:', error);
      showToast({
        type: 'error',
        title: 'Microphone Access Failed',
        message: 'Please check your microphone permissions.'
      });
    }
  };

  const stopVoiceRecording = () => {
    setIsRecording(false);
  };

  // Play AI response as audio
  const playAudioResponse = async (text: string) => {
    try {
      setIsPlayingAudio(true);
      const audioUrl = await voiceService.textToSpeech(text);
      
      if (audioUrl && audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();
        
        audioRef.current.onended = () => {
          setIsPlayingAudio(false);
          URL.revokeObjectURL(audioUrl); // Clean up
        };
      } else {
        setIsPlayingAudio(false);
        showToast({
          type: 'info',
          title: 'Audio Not Available',
          message: 'Voice response could not be generated.'
        });
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlayingAudio(false);
      showToast({
        type: 'error',
        title: 'Audio Playback Failed',
        message: 'Could not play audio response.'
      });
    }
  };

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || !user?.id || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const result = await generateCareerCoaching(currentMessage.trim(), user.id);
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: result.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
      setRemainingUses(result.remainingUses);
      setUserTier(result.tier);

      // Auto-play voice response for Career OS tier users
      if (userTier === 'career_os') {
        setTimeout(() => {
          playAudioResponse(result.response);
        }, 500);
      }

      if (result.remainingUses === 0 && result.tier !== 'career_os') {
        showToast({
          type: 'warning',
          title: 'Monthly Limit Reached',
          message: 'You have reached your monthly AI coaching limit. Upgrade for unlimited access!'
        });
      }

    } catch (error) {
      console.error('Chat error:', error);
      showToast({
        type: 'error',
        title: 'Chat Error',
        message: error instanceof Error ? error.message : 'Failed to get AI response'
      });
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!user) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <p className="text-gray-600">Please log in to access AI career coaching.</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full max-h-[600px] bg-white rounded-lg border ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            AI Career Coach
            {isPlayingAudio && (
              <span className="text-sm text-blue-600 flex items-center gap-1">
                <VolumeIcon />
                Speaking...
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-600">
            Get personalized career advice
            {userTier === 'career_os' && (
              <span className="text-blue-600 ml-1">• Voice enabled</span>
            )}
          </p>
        </div>
        {remainingUses !== -1 && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Remaining this month</p>
            <p className="font-medium text-blue-600">{remainingUses}</p>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.role === 'assistant' && userTier === 'career_os' && (
                <button
                  onClick={() => playAudioResponse(message.content)}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  disabled={isPlayingAudio}
                >
                  <VolumeIcon />
                  {isPlayingAudio ? 'Playing...' : 'Play Audio'}
                </button>
              )}
              <p className="text-xs mt-1 opacity-70">
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-lg">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        {remainingUses === 0 && userTier !== 'career_os' ? (
          <div className="text-center py-4">
            <p className="text-gray-600 mb-2">Monthly limit reached</p>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Upgrade for Unlimited Access
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <textarea
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isRecording ? "Listening..." : "Ask me about your career goals, remote work strategies, job applications..."}
                  className={`w-full p-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isRecording ? 'bg-red-50 border-red-300' : 'border-gray-300'
                  }`}
                  rows={2}
                  disabled={isLoading || isRecording}
                />
                {isRecording && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-50 bg-opacity-90 rounded-lg">
                    <div className="flex items-center gap-2 text-red-600">
                      <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium">Listening...</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Voice Button - Only show for Career OS users */}
              {userTier === 'career_os' && (
                <button
                  onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                  className={`p-2 rounded-lg transition-colors ${
                    isRecording 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                  disabled={isLoading}
                  title={isRecording ? "Stop recording" : "Start voice input"}
                >
                  {isRecording ? <MicOffIcon /> : <MicIcon />}
                </button>
              )}

              <button
                onClick={handleSendMessage}
                disabled={!currentMessage.trim() || isLoading || isRecording}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <LoaderIcon />
                    Sending...
                  </>
                ) : (
                  <>
                    <SendIcon />
                    Send
                  </>
                )}
              </button>
            </div>
            
            {/* Voice indicator */}
            {isRecording && (
              <div className="text-sm text-red-600 flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 bg-red-500 rounded-full animate-bounce"></div>
                  <div className="h-2 w-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="h-2 w-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span>Speak now... Click the microphone again to stop</span>
              </div>
            )}

            {/* Voice features promotion for non-Career OS users */}
            {userTier !== 'career_os' && (
              <div className="text-xs text-gray-500 text-center">
                💡 Upgrade to Career OS for voice conversations and unlimited AI coaching
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden audio element for playing responses */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
};

export default AICoachChat;