// frontend/src/pages/ChatAssistantPage.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ReactMarkdown from 'react-markdown';

const ChatAssistantPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [mode, setMode] = useState('concise');
  const [error, setError] = useState(null);
  
  // Get token from localStorage
  const getToken = () => {
    return localStorage.getItem('token') || localStorage.getItem('accessToken');
  };

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chat session and load history
  useEffect(() => {
    const token = getToken();
    if (token) {
      initializeChat();
    } else {
      console.error('No authentication token found');
      setError('Authentication required. Please login again.');
      setTimeout(() => navigate('/login'), 2000);
    }
  }, []);

  const initializeChat = async () => {
    try {
      const token = getToken();
      
      if (!token) {
        setError('No authentication token found');
        navigate('/login');
        return;
      }
      
      // Start or get chat session
      const startResponse = await fetch('http://localhost:5000/api/chat/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!startResponse.ok) {
        const errorData = await startResponse.json();
        console.error('Chat start failed:', errorData);
        
        if (startResponse.status === 401) {
          setError('Session expired. Please login again.');
          setTimeout(() => navigate('/login'), 2000);
          return;
        }
        throw new Error(errorData.message || 'Failed to start chat');
      }

      const sessionData = await startResponse.json();
      setSessionId(sessionData.sessionId);

      // Load conversation history
      const historyResponse = await fetch(`http://localhost:5000/api/chat/history/${sessionData.sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        if (historyData.messages && historyData.messages.length > 0) {
          setMessages(historyData.messages);
        } else {
          // Add welcome message if no history
          setMessages([{
            role: 'assistant',
            content: `Hello! I'm your wellness assistant. I can help you with:
- Health metrics and progress tracking
- Meal planning and nutrition advice
- Recipe suggestions
- Fitness goals and motivation
- General wellness questions

How can I assist you today?`,
            timestamp: new Date()
          }]);
        }
        if (historyData.mode) {
          setMode(historyData.mode);
        }
      }
    } catch (error) {
      console.error('Failed to initialize chat:', error);
      setError('Failed to connect to chat service. Please refresh the page.');
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const token = getToken();
    if (!token) {
      setError('Authentication required. Please login again.');
      navigate('/login');
      return;
    }

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setError(null);

    // Add user message to chat
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/chat/message', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMessage,
          sessionId: sessionId,
          mode: mode
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Add assistant response
        const assistantMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: data.timestamp || new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Update session ID if returned
        if (data.sessionId) {
          setSessionId(data.sessionId);
        }
      } else {
        if (response.status === 401) {
          setError('Session expired. Please login again.');
          setTimeout(() => navigate('/login'), 2000);
        } else {
          setError(data.message || 'Failed to get response');
        }
        // Remove the user message on error
        setMessages(prev => prev.slice(0, -1));
      }
    } catch (error) {
      console.error('Send message error:', error);
      setError('Failed to send message. Please try again.');
      // Remove the user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleMode = async () => {
    const newMode = mode === 'concise' ? 'detailed' : 'concise';
    setMode(newMode);
    console.log(`Mode changed to ${newMode}`);

    if (sessionId) {
      try {
        const token = getToken();
        await fetch(`http://localhost:5000/api/chat/mode/${sessionId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            mode: newMode
          })
        });
      } catch (error) {
        console.error('Failed to update mode:', error);
      }
    }
  };

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: 'Chat cleared. How can I help you today?',
      timestamp: new Date()
    }]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-xl font-semibold">Wellness Assistant</h1>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMode}
                className="px-3 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Mode: {mode === 'concise' ? 'Concise' : 'Detailed'}
              </button>
              <button
                onClick={clearChat}
                className="px-3 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div className="bg-white shadow-sm" style={{ height: 'calc(100vh - 200px)' }}>
          <div className="h-full overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-2xl px-4 py-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-2">{children}</p>,
                          ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                          li: ({ children }) => <li className="mb-1">{children}</li>,
                          strong: ({ children }) => <strong className="font-bold">{children}</strong>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  )}
                  <div className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-3 rounded-lg">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-t border-red-200 px-4 py-2">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Input Area */}
        <div className="bg-white border-t shadow-lg">
          <div className="p-4">
            <div className="flex space-x-2">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me about your health, nutrition, or fitness goals..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="2"
                disabled={isLoading}
                maxLength={1000}
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  !inputMessage.trim() || isLoading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {isLoading ? 'Sending...' : 'Send'}
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {inputMessage.length}/1000 characters
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistantPage;