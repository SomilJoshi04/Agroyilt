import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { BsRobot } from 'react-icons/bs';
import { IoClose, IoSend, IoMic, IoMicOutline } from 'react-icons/io5';
import { motion } from 'framer-motion';

const API_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Chatbot = () => {
  const location = useLocation();
  const isAuthPage = location.pathname.includes('/login') || location.pathname.includes('/signup');
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "नमस्ते! मैं Agroyilt का AI असिस्टेंट हूँ। मैं आपकी कैसे मदद कर सकता हूँ?", sender: 'bot' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastUsedVoice, setLastUsedVoice] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("माफ़ करें, आपका ब्राउज़र वॉइस इनपुट सपोर्ट नहीं करता है।");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'hi-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setLastUsedVoice(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev ? prev + " " + transcript : transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const toggleChat = () => setIsOpen(!isOpen);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);
    setIsLoading(true);

    try {
      const response = await axios.post(`${API_URL}/chat`, { message: userMessage });
      if (response.data.success) {
        setMessages(prev => [...prev, { text: response.data.reply, sender: 'bot' }]);
        if (lastUsedVoice) speakText(response.data.reply);
      } else {
        const errorMsg = "माफ़ करें, कुछ तकनीकी समस्या आ गई है।";
        setMessages(prev => [...prev, { text: errorMsg, sender: 'bot' }]);
        if (lastUsedVoice) speakText(errorMsg);
      }
    } catch (error) {
      console.error("Chatbot error:", error);
      const errorMsg = "माफ़ करें, सर्वर से कनेक्ट करने में समस्या हुई।";
      setMessages(prev => [...prev, { text: errorMsg, sender: 'bot' }]);
      if (lastUsedVoice) speakText(errorMsg);
    } finally {
      setIsLoading(false);
      setLastUsedVoice(false);
    }
  };

  if (isAuthPage) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] flex justify-center">
      <div className="w-full sm:max-w-md h-full relative">
        {/* Floating Draggable Button */}
        {!isOpen && (
          <motion.div
            drag
            dragConstraints={{ left: -300, right: 0, top: -500, bottom: 0 }}
            whileDrag={{ scale: 1.1 }}
            className="absolute bottom-24 right-6 pointer-events-auto"
            initial={{ x: 0, y: 0 }}
          >
            <button
              onClick={toggleChat}
              className="bg-green-600 text-white p-4 rounded-full shadow-2xl flex items-center justify-center focus:outline-none active:cursor-grabbing cursor-grab"
              style={{ boxShadow: '0 8px 32px rgba(22, 163, 74, 0.3)' }}
            >
              <BsRobot size={28} />
            </button>
          </motion.div>
        )}

        {/* Chat Window */}
        {isOpen && (
          <div className="absolute font-sans transition-all duration-300 inset-0 sm:inset-auto sm:bottom-6 sm:right-6 pointer-events-auto">
          <div className="bg-white w-full h-full sm:w-96 sm:h-[500px] sm:rounded-2xl shadow-2xl flex flex-col sm:border border-gray-200 overflow-hidden transform transition-all">
          {/* Header */}
          <div className="bg-green-600 text-white p-4 flex justify-between items-center shadow-md z-10">
            <div className="flex items-center gap-3">
              <div className="bg-white text-green-600 p-2 rounded-full">
                <BsRobot size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg">Agroyilt Assistant</h3>
                <p className="text-xs text-green-100">हमेशा आपकी मदद के लिए तैयार</p>
              </div>
            </div>
            <button onClick={toggleChat} className="text-white hover:text-gray-200 focus:outline-none">
              <IoClose size={24} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 flex flex-col gap-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] p-3 rounded-2xl text-sm shadow-sm whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-green-600 text-white rounded-tr-none'
                      : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 text-gray-800 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
            <button
              type="button"
              onClick={startListening}
              className={`p-2 rounded-full transition-colors ${
                isListening 
                  ? 'bg-red-100 text-red-600 animate-pulse' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title="बोलकर टाइप करें"
            >
              {isListening ? <IoMic size={20} /> : <IoMicOutline size={20} />}
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setLastUsedVoice(false);
              }}
              placeholder="अपना सवाल पूछें..."
              className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="bg-green-600 text-white p-2 rounded-full hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <IoSend size={20} />
            </button>
          </form>
        </div>
      </div>
    )}
      </div>
    </div>
  );
};

export default Chatbot;
