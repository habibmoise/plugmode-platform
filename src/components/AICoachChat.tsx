import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, Globe, Crown, Star, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useToast } from '../contexts/ToastContext';
import { aiCareerCoach, CoachingResponse } from '../lib/ai-coach';
import { lingoService } from '../lib/lingo';
import { FeatureGate } from './FeatureGate';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  translatedContent?: string;
  audioUrl?: string;
  timestamp: Date;
}

interface AICoachChatProps {
  className?: string;
  userProfile?: any;
}

export function AICoachChat({ className = '', userProfile }: AICoachChatProps) {
  const { user } = useAuth();
  const { subscriptionStatus } = useSubscription();
  const { showToast } = useToast();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [includeVoice, setIncludeVoice] = useState(false);
  const [usageRemaining, setUsageRemaining] = useState<number | null>(null);
  const [isProcessingSpeech, setIsProcessingSpeech] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Add welcome message
    if (messages.length === 0) {
      setMessages([{
        id: '1',
        role: 'assistant',
        content: `Hello${userProfile?.name ? ` ${userProfile.name}` : ''}! I'm your AI Career Coach. I'm here to help you navigate your global remote career journey. What would you like to discuss today?`,
        timestamp: new Date()
      }]);
    }
  }, [userProfile, messages.length]);

  const supportedLanguages = lingoService.getSupportedLanguages();
  const userRegion = userProfile?.location ? lingoService.getRegionFromLocation(userProfile.location) : 'africa';
  const availableLanguages = supportedLanguages[userRegion] || supportedLanguages.africa;

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response: CoachingResponse = await aiCareerCoach.processMessage(
        user.id,
        userMessage.content,
        {
          userTier: subscriptionStatus.tier,
          targetLanguage: selectedLanguage !== 'en' ? selectedLanguage : undefined,
          includeVoice: includeVoice && subscriptionStatus.tier === 'career_os',
          userContext: userProfile
        }
      );

      if (response.upgradeRequired) {
        showToast({
          type: 'warning',
          title: 'Upgrade Required',
          message: response.message
        });
        return;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.message,
        translatedContent: response.translatedMessage,
        audioUrl: response.audioUrl,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setUsageRemaining(response.usageRemaining || null);

      // Auto-play audio if available
      if (response.audioUrl && includeVoice) {
        const audio = new Audio(response.audioUrl);
        audio.play().catch(console.error);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      showToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to send message. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        
        setIsProcessingSpeech(true);
        try {
          // Send audio to speech-to-text service
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.wav');
          
          const response = await fetch('/api/speech-to-text', {
            method: 'POST',
            body: formData
          });
          
          if (response.ok) {
            const data = await response.json();
            setInputMessage(data.transcription || 'Could not transcribe audio');
          } else {
            setInputMessage('Voice message recorded (processing...)');
          }
        } catch (error) {
          console.error('Speech-to-text error:', error);
          setInputMessage('Voice message recorded (processing failed)');
        } finally {
          setIsProcessingSpeech(false);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      showToast({
        type: 'error',
        title: 'Recording Error',
        message: 'Could not access microphone'
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playAudio = (audioUrl: string) => {
    const audio = new Audio(audioUrl);
    audio.play().catch(console.error);
  };

  const getUsageDisplay = () => {
    if (subscriptionStatus.tier === 'career_os') {
      return (
        <div className="flex items-center space-x-1 text-purple-600">
          <Crown className="h-4 w-4" />
          <span className="text-sm">Unlimited</span>
        </div>
      );
    } else if (subscriptionStatus.tier === 'professional') {
      return (
        <div className="flex items-center space-x-1 text-blue-600">
          <Star className="h-4 w-4" />
          <span className="text-sm">{usageRemaining !== null ? `${usageRemaining} left` : '5/month'}</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center space-x-1 text-gray-500">
          <span className="text-sm">Upgrade required</span>
        </div>
      );
    }
  };

  return (
    <FeatureGate
      feature="ai_conversations"
      requiredTier="professional"
      fallback={
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
          <div className="bg-blue-50 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Star className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-semibold text-black mb-2">AI Career Coaching</h3>
          <p className="text-gray-600 mb-4">
            Get personalized career advice, interview preparation, and skill development guidance from our AI coach.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h4 className="font-medium text-blue-900 mb-2">Available with:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Professional ($4.99/month)</span>
                <span className="text-blue-600">5 sessions/month</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Career OS ($9.99/month)</span>
                <span className="text-purple-600">Unlimited + Voice + Translation</span>
              </div>
            </div>
          </div>
        </div>
      }
    >
      <div className={`bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col h-96 ${className}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-50 p-2 rounded-lg">
              <Star className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-black">AI Career Coach</h3>
              <p className="text-sm text-gray-600">Personalized career guidance</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {getUsageDisplay()}
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Language Selection */}
              {subscriptionStatus.tier === 'career_os' && (
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-gray-600" />
                  <select
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    {availableLanguages.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Voice Toggle */}
              {subscriptionStatus.tier === 'career_os' && (
                <button
                  onClick={() => setIncludeVoice(!includeVoice)}
                  className={`flex items-center space-x-1 px-2 py-1 rounded text-sm ${
                    includeVoice 
                      ? 'bg-purple-100 text-purple-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {includeVoice ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  <span>Voice</span>
                </button>
              )}
            </div>

            {subscriptionStatus.tier === 'career_os' && (
              <div className="flex items-center space-x-1 text-purple-600">
                <Crown className="h-4 w-4" />
                <span className="text-sm font-medium">Career OS</span>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm">
                  {message.translatedContent || message.content}
                </p>
                
                {message.audioUrl && (
                  <button
                    onClick={() => playAudio(message.audioUrl!)}
                    className="mt-2 flex items-center space-x-1 text-xs opacity-75 hover:opacity-100"
                  >
                    <Volume2 className="h-3 w-3" />
                    <span>Play audio</span>
                  </button>
                )}
                
                <div className="text-xs opacity-75 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg flex items-center space-x-2">
                <Loader className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask about your career, job search, or skills..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              />
            </div>
            
            {/* Voice Recording */}
            {subscriptionStatus.tier === 'career_os' && (
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading || isProcessingSpeech}
                className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                  isRecording 
                    ? 'bg-red-100 text-red-600' 
                    : isProcessingSpeech
                    ? 'bg-yellow-100 text-yellow-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title={isProcessingSpeech ? 'Processing speech...' : isRecording ? 'Stop recording' : 'Start recording'}
              >
                {isProcessingSpeech ? (
                  <Loader className="h-5 w-5 animate-spin" />
                ) : isRecording ? (
                  <MicOff className="h-5 w-5" />
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </button>
            )}
            
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </FeatureGate>
  );
}