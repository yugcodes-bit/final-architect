// src/hooks/useVoiceControl.js
import { useState, useEffect, useRef } from 'react';

const POSITIVE_WORDS = ['yes', 'yeah', 'nice', 'cool', 'love', 'like', 'good', 'perfect', 'want'];
const NEGATIVE_WORDS = ['no', 'nope', 'bad', 'hate', 'ugly', 'next', 'stop', 'dislike'];

export const useVoiceControl = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastDetectedSentiment, setLastDetectedSentiment] = useState(null); // 'positive' | 'negative'
  
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Browser compatibility check
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const current = event.resultIndex;
        const result = event.results[current];
        const text = result[0].transcript.toLowerCase().trim();
        
        setTranscript(text);

        // Check for keywords
        if (result.isFinal) {
          if (POSITIVE_WORDS.some(word => text.includes(word))) {
            console.log("🎤 Voice Detected: POSITIVE");
            setLastDetectedSentiment('positive');
          } else if (NEGATIVE_WORDS.some(word => text.includes(word))) {
            console.log("🎤 Voice Detected: NEGATIVE");
            setLastDetectedSentiment('negative');
          }
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error("🎤 Speech Recognition Error:", event.error);
      };
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setLastDetectedSentiment(null); // Reset sentiment on new start
      } catch (e) {
        console.error("Microphone already active");
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const resetSentiment = () => setLastDetectedSentiment(null);

  return { 
    isListening, 
    transcript, 
    lastDetectedSentiment, 
    startListening, 
    stopListening,
    resetSentiment
  };
};