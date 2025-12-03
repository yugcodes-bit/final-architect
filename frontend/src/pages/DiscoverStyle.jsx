import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// --- FIX: Added .js extension ---
import { emotionLogger } from '../utils/EmotionLogger.js';
// --- FIX: Added .jsx extension ---
import EmotionDetector from '../components/EmotionDetector.jsx';
// --- FIX: This file must exist at 'frontend/src/pages/DiscoverStyle.css' ---
import './DiscoverStyle.css';

// --- FIX: Import images from src/assets directly ---
import onePng from '../assets/one.png';
import furnChair2Png from '../assets/furn_chair2.png';
import furnKitchPng from '../assets/furn_kitch.png';
import furnSofaPng from '../assets/furn_sofa.png';
import furnChairPng from '../assets/furn_chair.png';
import threePng from '../assets/three.png';
import palleteColorPng from '../assets/pallete-color.png';
import furnTablePng from '../assets/furn_table.png';
import furnCupboardPng from '../assets/furn_cupboard.png';
import twoPng from '../assets/two.png';


// --- Our "Emotional DNA" Dataset ---
// --- FIX: Use imported image variables ---
const CALIBRATION_IMAGES = [
  { src: onePng, tags: ['abstract', 'colorful', 'bold', 'art'] },
  { src: furnChair2Png, tags: ['wood', 'rustic', 'natural', 'warm'] },
  { src: furnKitchPng, tags: ['minimalist', 'clean', 'modern', 'white'] },
  { src: furnSofaPng, tags: ['soft', 'curved', 'comfortable', 'neutral'] },
  { src: furnChairPng, tags: ['industrial', 'metal', 'sharp', 'modern'] },
  { src: threePng, tags: ['dark', 'moody', 'elegant', 'stone'] }, // Fix for 'assetsimages' typo
  { src: palleteColorPng, tags: ['vibrant', 'color-palette', 'creative'] },
  { src: furnTablePng, tags: ['classic', 'wood', 'formal', 'dark'] },
  { src: furnCupboardPng, tags: ['sleek', 'modern', 'glossy', 'minimalist'] },
  { src: twoPng, tags: ['geometric', 'pattern', 'contrast', 'art'] },
];

const IMAGE_DURATION_MS = 3000; // Show each image for 3 seconds

const DiscoverStyle = () => {
  const navigate = useNavigate();
  // 'idle' -> 'calibrating' -> 'analyzing' -> 'complete'
  const [calibrationState, setCalibrationState] = useState('idle');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [emotionalProfile, setEmotionalProfile] = useState(null);
  
  // This will store the context for the *currently visible* image
  const [currentContext, setCurrentContext] = useState(null);

  // --- 1. START THE CALIBRATION PROCESS ---
  const startCalibration = () => {
    emotionLogger.clearHistory(); // Start with a fresh slate
    emotionLogger.startSession('calibration_session', 'emotional_dna');
    setCalibrationState('calibrating');
    setCurrentContext(CALIBRATION_IMAGES[0]);
    setCurrentImageIndex(0);
  };

  // --- 2. THE "SLIDESHOW" TIMER ---
  useEffect(() => {
    if (calibrationState !== 'calibrating') return;

    if (currentImageIndex >= CALIBRATION_IMAGES.length) {
      // Slideshow is over
      setCalibrationState('analyzing');
    } else {
      // Set the context for the current image
      setCurrentContext(CALIBRATION_IMAGES[currentImageIndex]);

      // Set a timer to move to the next image
      const timer = setTimeout(() => {
        setCurrentImageIndex(prevIndex => prevIndex + 1);
      }, IMAGE_DURATION_MS);

      return () => clearTimeout(timer);
    }
  }, [calibrationState, currentImageIndex]);

  // --- 3. ANALYZE THE RESULTS ---
  useEffect(() => {
    if (calibrationState === 'analyzing') {
      const summary = emotionLogger.endSession();
      const profile = analyzeCalibrationResults(summary.session.emotionData);
      setEmotionalProfile(profile);
      setCalibrationState('complete');
      
      // TODO: Save this 'profile' object to Supabase for the user
      console.log("--- EMOTIONAL DNA PROFILE ---", profile);
    }
  }, [calibrationState]);

  // --- 4. THE CORE "DNA" LOGIC ---
  const analyzeCalibrationResults = (emotionData) => {
    const tagScores = {};
    let positiveReactions = 0;
    let negativeReactions = 0;

    const POSITIVE_EMOTIONS = ['happy', 'surprised'];
    const NEGATIVE_EMOTIONS = ['angry', 'sad', 'disgusted', 'fearful'];

    for (const entry of emotionData) {
      const context = entry.designContext; // { tags: ['wood', 'rustic'] }
      if (!context || !context.tags) continue;

      let score = 0;
      if (POSITIVE_EMOTIONS.includes(entry.emotion)) {
        score = 1 * entry.confidence; // Weight by confidence
        positiveReactions++;
      } else if (NEGATIVE_EMOTIONS.includes(entry.emotion)) {
        score = -1 * entry.confidence; // Weight by confidence
        negativeReactions++;
      }

      if (score === 0) continue; // Ignore neutral

      // Apply the score to all tags associated with that image
      for (const tag of context.tags) {
        tagScores[tag] = (tagScores[tag] || 0) + score;
      }
    }

    // Convert scores to a sorted list
    const sortedTags = Object.entries(tagScores)
      .sort(([, scoreA], [, scoreB]) => scoreB - scoreA);

    const likes = sortedTags
      .filter(([, score]) => score > 0)
      .map(([tag]) => tag)
      .slice(0, 5); // Get top 5 likes

    const dislikes = sortedTags
      .filter(([, score]) => score < 0)
      .map(([tag]) => tag)
      .slice(0, 5); // Get top 5 dislikes

    return {
      likes,
      dislikes,
      positiveReactions,
      negativeReactions,
      totalReactions: positiveReactions + negativeReactions,
      rawScores: sortedTags,
    };
  };

  // --- 5. RENDER THE CORRECT UI FOR EACH STATE ---
  const renderContent = () => {
    switch (calibrationState) {
      // --- STATE: CALIBRATING (Webcam + Slideshow) ---
      case 'calibrating':
        const image = CALIBRATION_IMAGES[currentImageIndex];
        return (
          <div className="calibration-wrapper">
            <h2>Calibrating... Look at the image.</h2>
            <div className="calibration-ui">
              <div className="calibration-image-wrapper">
                {image && <img src={image.src} alt="Calibration slide" />}
                <div className="calibration-progress-bar">
                  <div 
                    className="progress-bar-fill" 
                    style={{ animationDuration: `${IMAGE_DURATION_MS}ms` }}
                    key={currentImageIndex} // Resets the animation
                  ></div>
                </div>
              </div>
              <div className="calibration-webcam-wrapper">
                <EmotionDetector 
                  onEmotionDetected={() => {}} 
                  currentContext={currentContext} // This is the magic prop!
                />
              </div>
            </div>
          </div>
        );

      // --- STATE: COMPLETE (Show Results) ---
      case 'complete':
        return (
          <div className="results-wrapper">
            <h2>Here is your unique Emotional DNA:</h2>
            <div className="profile-card">
              <div className="profile-section likes">
                <h3>You feel most comfortable with:</h3>
                <ul>
                  {emotionalProfile.likes.map(tag => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              </div>
              <div className="profile-section dislikes">
                <h3>You seem to react negatively to:</h3>
                <ul>
                  {emotionalProfile.dislikes.map(tag => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p>Aura Architect will now use this profile to help you design.</p>
            <button className="start-button" onClick={() => navigate('/create')}>
              &larr; Back to Designer
            </button>
          </div>
        );

      // --- STATE: IDLE (Start Button) ---
      case 'idle':
      default:
        return (
          <div className="start-wrapper">
            <h2>Discover Your Emotional Style</h2>
            <p>
              Help Aura Architect learn your unique style.
              We will show you a quick series of images. By analyzing your subconscious 
              reactions through your webcam, we can build your personal 'Emotional DNA' profile.
            </p>
            <button className="start-button" onClick={startCalibration}>
              Allow Webcam Access & Begin Calibration
            </button>
            <button className="back-button" onClick={() => navigate('/create')}>
              Back to Designer
            </button>
          </div>
        );
    }
  };

  return (
    <div className="discover-style-page">
      {renderContent()}
    </div>
  );
};

export default DiscoverStyle;