import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient.js';
import { useStore } from '../store.js';
import { useVoiceControl } from '../hooks/useVoiceControl.js';
import { emotionLogger } from '../utils/EmotionLogger.js';
import EmotionDetector from '../components/EmotionDetector.jsx';
import './DiscoverStyle.css';
import landing_video from "../assets/landing_page_vid.mp4";

// Images
import room1 from '../assets/room1.jpg';
import room2 from '../assets/room2.jpg';
import room3 from '../assets/room3.jpg';
import room4 from '../assets/room4.jpg';


// CONFIG: Time per slide before auto-skip (if no reaction)
const IMAGE_DURATION_MS = 5000;

const SLIDES = [
  { 
    id: 1, 
    src: room1, 
    question: "Do you like this modern industrial look?",
    supabaseTags: ['room1_vibe'] 
  },
  { 
    id: 2, 
    src: room2, 
    question: "How about this cozy rustic wooden style?",
    supabaseTags: ['room2_vibe']
  },
  { 
    id: 3, 
    src: room3, 
    question: "Is this clean minimalist white appealing?",
    supabaseTags: ['room3_vibe']
  },
  { 
    id: 4, 
    src: room4, 
    question: "Does this dark luxury vibe fit you?",
    supabaseTags: ['room4_vibe']
  },
];

const DiscoverStyle = () => {
  const navigate = useNavigate();
  const setRecommendedLibrary = useStore(state => state.setRecommendedLibrary);
  
  const { startListening, stopListening, lastDetectedSentiment, resetSentiment, transcript } = useVoiceControl();

  // --- STATE ---
  const [calibrationState, setCalibrationState] = useState('idle');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [likedTags, setLikedTags] = useState(new Set());
  const [currentContext, setCurrentContext] = useState(null);
  
  // New: Controls the visual popup ('positive' | 'negative' | null)
  const [feedback, setFeedback] = useState(null); 

  // --- REFS ---
  const happySequenceCount = useRef(0);
  const timerRef = useRef(null); 
  const isProcessing = useRef(false); // Prevents double triggers

  // --- HELPER: Add Tags ---
  const addTags = (tags) => {
    setLikedTags(prev => {
      const newSet = new Set(prev);
      tags.forEach(tag => newSet.add(tag));
      return newSet;
    });
  };

  // --- CORE: Handle User Reaction (Voice or Camera) ---
  const handleReaction = useCallback((type) => {
    if (isProcessing.current) return; // Ignore if already moving
    isProcessing.current = true;

    // 1. Show Visual Feedback
    setFeedback(type);
    
    // 2. Logic: Save Data if Liked
    const currentSlide = SLIDES[currentImageIndex];
    if (currentSlide && type === 'positive') {
      console.log(`✅ Reaction: LIKED Slide ${currentSlide.id}`);
      addTags(currentSlide.supabaseTags);
    } else {
      console.log(`❌ Reaction: PASSED Slide ${currentSlide.id}`);
    }

    // 3. Transition Delay (800ms to see the popup)
    if (timerRef.current) clearTimeout(timerRef.current); // Stop auto-timer

    setTimeout(() => {
      // Move Next
      resetSentiment();
      happySequenceCount.current = 0;
      setFeedback(null);
      setCurrentImageIndex(prev => prev + 1);
      isProcessing.current = false;
    }, 800); 

  }, [currentImageIndex, resetSentiment]);


  // --- 1. START SESSION ---
  const startCalibration = () => {
    emotionLogger.clearHistory();
    setLikedTags(new Set());
    setCalibrationState('loading_ai');
  };

  // --- 2. AI LOADED SIGNAL ---
  const handleModelsLoaded = () => {
    console.log("🚀 AI Models Loaded! Starting Session...");
    setCalibrationState('calibrating');
    setCurrentContext(SLIDES[0]);
    setCurrentImageIndex(0);
  };

  // --- 3. VOICE MANAGEMENT ---
  useEffect(() => {
    if (calibrationState === 'calibrating') {
      startListening();
    } else {
      stopListening();
    }
  }, [calibrationState, startListening, stopListening]);

  // --- 4. VOICE INPUT LISTENER ---
  useEffect(() => {
    if (!lastDetectedSentiment || calibrationState !== 'calibrating') return;

    if (lastDetectedSentiment === 'positive') {
      handleReaction('positive');
    } else if (lastDetectedSentiment === 'negative') {
      handleReaction('negative');
    }
  }, [lastDetectedSentiment, calibrationState, handleReaction]);

  // --- 5. CAMERA INPUT LISTENER ---
  const handleEmotionUpdate = (data) => {
    if (calibrationState !== 'calibrating' || isProcessing.current) return;
    
    // If happy and high confidence
    if (data.emotion === 'happy' && data.confidence > 0.7) {
      happySequenceCount.current += 1;
      
      // If smile held for ~2 seconds (4 frames)
      if (happySequenceCount.current === 4) {
        handleReaction('positive');
      }
    } else {
      happySequenceCount.current = 0;
    }
  };

  // --- 6. AUTO-ADVANCE TIMER ---
  useEffect(() => {
    if (calibrationState !== 'calibrating') return;

    // Check End of Slides
    if (currentImageIndex >= SLIDES.length) {
      setCalibrationState('analyzing');
      return;
    }

    setCurrentContext(SLIDES[currentImageIndex]);
    
    // Auto-skip if no reaction after X seconds
    timerRef.current = setTimeout(() => {
      if (!isProcessing.current) {
        setCurrentImageIndex(prev => prev + 1);
        resetSentiment();
      }
    }, IMAGE_DURATION_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [calibrationState, currentImageIndex, resetSentiment]);

  // --- 7. FETCH RESULTS ---
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
        .limit(20);

      if (!error && data) setRecommendedLibrary(data);
      setCalibrationState('complete');
    };

    if (calibrationState === 'analyzing') fetchRecommendations();
  }, [calibrationState, likedTags, setRecommendedLibrary]);

  // --- RENDER ---
  const renderContent = () => {
    if (calibrationState === 'loading_ai') {
        return (
            <div className="calibration-wrapper">
                <div className="start-wrapper">
                    <h2>Initializing Senses...</h2>
                    <div className="loading-spinner"></div>
                    <p>Starting Camera & Microphone...</p>
                    <div style={{opacity: 0, height: 0, overflow: 'hidden'}}>
                        <EmotionDetector onModelsLoaded={handleModelsLoaded} />
                    </div>
                </div>
            </div>
        );
    }

    switch (calibrationState) {
      case 'calibrating':
        const slide = SLIDES[currentImageIndex];
        if (!slide) return null; // Guard

        return (
          <div className="calibration-wrapper">
            <div className='bg-video'>
               <video autoPlay loop muted playsInline src={landing_video}>
                          </video>
                  </div>
            <div className="split-view-container">
              <div className="calibration-image-wrapper">
                <img src={slide.src} alt="style" className="slide-image"/>
                
                <div className="question-overlay">
                  <h2>{slide.question}</h2>
                  <div className="mic-indicator">
                    <span className="pulsing-dot"></span> Listening...
                  </div>
                  <p className="transcript-hint">"{transcript}"</p>
                </div>

                {/* --- FEEDBACK POPUPS --- */}
                {feedback === 'positive' && (
                  <div className="feedback-overlay positive">👍 LIKED</div>
                )}
                {feedback === 'negative' && (
                  <div className="feedback-overlay negative">👎 PASSED</div>
                )}
                
                {/* Progress Bar */}
                {!feedback && (
                  <div className="calibration-progress-bar">
                    <div 
                      className="progress-bar-fill" 
                      key={currentImageIndex} 
                      style={{ animationDuration: `${IMAGE_DURATION_MS}ms` }}
                    ></div>
                  </div>
                )}
              </div>

              <div className="calibration-webcam-wrapper mini-webcam">
                <EmotionDetector 
                  onEmotionDetected={handleEmotionUpdate} 
                  currentContext={currentContext}
                  onModelsLoaded={() => {}} 
                />
                <p className="webcam-hint">Analyzing smiles...</p>
              </div>
            </div>
          </div>
        );

      case 'analyzing':
        return (
           <div className="start-wrapper">
            <h2>Curating your Library...</h2>
            <div className="loading-spinner"></div>
          </div>
        );

      case 'complete':
        return (
          <div className="results-wrapper">
            <h2>Profile Ready!</h2>
            <p>We have added the matching furniture to your library.</p>
            <button className="start-button" onClick={() => navigate('/create')}>
              Open Studio &rarr;
            </button>
          </div>
        );

      default: // idle
        return (
          <div className="start-wrapper">
            <h2>Style Discovery</h2>
            <ul style={{textAlign:'left', marginBottom:'20px'}}>
              <li>Speak your choices and</li>
              <li>React,Smile if you love it.</li>
            </ul>
            <button className="start-button" onClick={startCalibration}>
              Start Experience
            </button>
          </div>
        );
    }
  };

  return <div className="discover-style-page">
    <div className='bg-video'>
               <video autoPlay loop muted playsInline src={landing_video}>
                          </video>
                  </div>
                  {renderContent()}</div>;
};

export default DiscoverStyle;