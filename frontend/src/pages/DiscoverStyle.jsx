import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';
import { useStore } from '../store.js';
import { useVoiceControl } from '../hooks/useVoiceControl.js';
import { emotionLogger } from '../utils/EmotionLogger.js';
import EmotionDetector from '../components/EmotionDetector.jsx'; // ✅ Added back
import './DiscoverStyle.css';

// Images
import room1 from '../assets/room1.png';
import room2 from '../assets/room2.png';
import room3 from '../assets/room3.png';
import room4 from '../assets/room4.png';
import room5 from '../assets/room5.png';

const IMAGE_DURATION_MS = 6000; // Increased slightly for reading time

const SLIDES = [
  { 
    id: 1, 
    src: room1, 
    question: "Do you like this modern industrial look?",
    supabaseTags: ['modern', 'industrial', 'room1_vibe'] 
  },
  { 
    id: 2, 
    src: room2, 
    question: "How about this cozy rustic wooden style?",
    supabaseTags: ['rustic', 'wood', 'warm', 'room2_vibe']
  },
  { 
    id: 3, 
    src: room3, 
    question: "Is this clean minimalist white appealing?",
    supabaseTags: ['minimalist', 'white', 'clean', 'room3_vibe']
  },
  { 
    id: 4, 
    src: room4, 
    question: "Does this dark luxury vibe fit you?",
    supabaseTags: ['dark', 'luxury', 'classic', 'room4_vibe']
  },
  { 
    id: 5, 
    src: room5, 
    question: "Are you into vibrant eclectic colors?",
    supabaseTags: ['colorful', 'artistic', 'bold', 'room5_vibe']
  },
];

const DiscoverStyle = () => {
  const navigate = useNavigate();
  const setRecommendedLibrary = useStore(state => state.setRecommendedLibrary);
  
  // Custom Hook for Voice
  const { startListening, stopListening, lastDetectedSentiment, resetSentiment, transcript } = useVoiceControl();

  const [calibrationState, setCalibrationState] = useState('idle');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [likedTags, setLikedTags] = useState(new Set());
  const [currentContext, setCurrentContext] = useState(null);
  
  // Ref for Smile Logic
  const happySequenceCount = useRef(0);

  // --- 1. START SESSION ---
  const startCalibration = () => {
    emotionLogger.clearHistory();
    setLikedTags(new Set());
    setCalibrationState('calibrating');
    setCurrentContext(SLIDES[0]);
    setCurrentImageIndex(0);
  };

  // --- 2. MANAGE VOICE LISTENING ---
  useEffect(() => {
    if (calibrationState === 'calibrating') {
      startListening();
    } else {
      stopListening();
    }
  }, [calibrationState, startListening, stopListening]);

  // --- 3. HANDLE VOICE INPUT (The Crash Fix is here) ---
  useEffect(() => {
    if (!lastDetectedSentiment) return;

    // ✅ SAFETY CHECK: Prevent crash if slideshow is over
    const currentSlide = SLIDES[currentImageIndex];
    if (!currentSlide) return; 

    if (lastDetectedSentiment === 'positive') {
      console.log(`🎤 Voice: User said YES to ${currentSlide.question}`);
      addTags(currentSlide.supabaseTags);
    } else if (lastDetectedSentiment === 'negative') {
      console.log(`🎤 Voice: User said NO to ${currentSlide.question}`);
    }
  }, [lastDetectedSentiment, currentImageIndex]);

  // --- 4. HANDLE SMILE INPUT (Camera Logic) ---
  const handleEmotionUpdate = (data) => {
    // ✅ SAFETY CHECK
    const currentSlide = SLIDES[currentImageIndex];
    if (!currentSlide) return;

    // If happy and high confidence
    if (data.emotion === 'happy' && data.confidence > 0.7) {
      happySequenceCount.current += 1;
      
      // If smile held for ~2 seconds
      if (happySequenceCount.current === 4) {
        console.log(`📸 Camera: User SMILED at ${currentSlide.question}`);
        addTags(currentSlide.supabaseTags);
      }
    } else {
      happySequenceCount.current = 0; // Reset
    }
  };

  // Helper to add tags (handles duplicates)
  const addTags = (tags) => {
    setLikedTags(prev => {
      const newSet = new Set(prev);
      tags.forEach(tag => newSet.add(tag));
      return newSet;
    });
  };

  // --- 5. TIMER & SLIDE TRANSITION ---
  useEffect(() => {
    if (calibrationState !== 'calibrating') return;

    if (currentImageIndex >= SLIDES.length) {
      setCalibrationState('analyzing');
    } else {
      // Update context for Emotion Detector
      setCurrentContext(SLIDES[currentImageIndex]);
      resetSentiment(); 
      happySequenceCount.current = 0;
      
      const timer = setTimeout(() => {
        setCurrentImageIndex(prevIndex => prevIndex + 1);
      }, IMAGE_DURATION_MS);

      return () => clearTimeout(timer);
    }
  }, [calibrationState, currentImageIndex, resetSentiment]);

  // --- 6. FETCH RESULTS ---
  useEffect(() => {
    const fetchRecommendations = async () => {
      if (likedTags.size === 0) {
        setCalibrationState('complete');
        return;
      }

      const tagsArray = Array.from(likedTags);
      console.log("🔍 Fetching items for tags:", tagsArray);

      const { data, error } = await supabase
        .from('models')
        .select('*')
        .overlaps('tags', tagsArray)
        .limit(15);

      if (!error && data) {
        setRecommendedLibrary(data);
      }
      setCalibrationState('complete');
    };

    if (calibrationState === 'analyzing') {
      fetchRecommendations();
    }
  }, [calibrationState, likedTags, setRecommendedLibrary]);

  // --- 7. RENDER ---
  const renderContent = () => {
    switch (calibrationState) {
      case 'calibrating':
        const slide = SLIDES[currentImageIndex];
        // ✅ Safety check for render
        if (!slide) return <div className="loading-spinner"></div>;

        return (
          <div className="calibration-wrapper">
            <div className="split-view-container">
              
              {/* LEFT: IMAGE & QUESTION */}
              <div className="calibration-image-wrapper">
                <img src={slide.src} alt="style" className="slide-image"/>
                
                <div className="question-overlay">
                  <h2>{slide.question}</h2>
                  <div className="mic-indicator">
                    <span className="pulsing-dot"></span> Listening...
                  </div>
                  <p className="transcript-hint">"{transcript}"</p>
                </div>

                {/* Feedback Overlays */}
                {(lastDetectedSentiment === 'positive' || happySequenceCount.current >= 4) && (
                  <div className="feedback-overlay positive">👍 LIKED</div>
                )}
                {lastDetectedSentiment === 'negative' && (
                  <div className="feedback-overlay negative">👎 PASSED</div>
                )}
                
                <div className="calibration-progress-bar">
                  <div 
                    className="progress-bar-fill" 
                    key={currentImageIndex} 
                    style={{ animationDuration: `${IMAGE_DURATION_MS}ms` }}
                  ></div>
                </div>
              </div>

              {/* RIGHT: WEBCAM (Now Active!) */}
              <div className="calibration-webcam-wrapper mini-webcam">
                <EmotionDetector 
                  onEmotionDetected={handleEmotionUpdate} 
                  currentContext={currentContext}
                />
                <p className="webcam-hint">We are also analyzing your facial expressions.</p>
              </div>

            </div>
          </div>
        );

      case 'analyzing':
        return (
           <div className="start-wrapper">
            <h2>Processing your Voice & Emotions...</h2>
            <div className="loading-spinner"></div>
          </div>
        );

      case 'complete':
        return (
          <div className="results-wrapper">
            <h2>Analysis Complete!</h2>
            <p>We combined your voice answers and subconscious smiles to build your library.</p>
            <button className="start-button" onClick={() => navigate('/create')}>
              Go to Library &rarr;
            </button>
          </div>
        );

      default: // idle
        return (
          <div className="start-wrapper">
            <h2>Multimodal Style Discovery</h2>
            <p>This experience uses <strong>Voice</strong> AND <strong>Emotion AI</strong>.</p>
            <ul style={{textAlign:'left', marginBottom:'20px'}}>
              <li>🗣️ Speak: "Yes", "Nice", "No", "Next"</li>
              <li>😊 React: Smile if you love it.</li>
            </ul>
            <button className="start-button" onClick={startCalibration}>
              Start Experience 🎙️📸
            </button>
          </div>
        );
    }
  };

  return <div className="discover-style-page">{renderContent()}</div>;
};

export default DiscoverStyle;