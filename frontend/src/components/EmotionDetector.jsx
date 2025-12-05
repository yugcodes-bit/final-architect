import React, { useRef, useEffect, useState } from 'react';
import { emotionLogger } from '../utils/EmotionLogger';
import './EmotionDetector.css';

// Global flag to prevent re-loading scripts across re-renders
let faceapiLoaded = false;

const EmotionDetector = ({ onEmotionDetected, currentDesign = null, onModelsLoaded }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  // State
  const [emotion, setEmotion] = useState('neutral');
  const [isActive, setIsActive] = useState(false);
  const [webcamError, setWebcamError] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [detectionStats, setDetectionStats] = useState({
    confidence: 0,
    expressions: {}
  });

  // --- 1. LOAD FACE API & MODELS ---
  useEffect(() => {
    const loadFaceAPI = async () => {
      // If already loaded globally, just notify and return
      if (faceapiLoaded && window.faceapi) {
        setModelsLoaded(true);
        if (onModelsLoaded) onModelsLoaded();
        return;
      }

      try {
        // Load face-api.js from CDN
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js';
        script.async = true;
        
        script.onload = async () => {
          console.log('✅ FaceAPI.js loaded from CDN');
          
          // Load models from public folder
          const MODEL_URL = '/models';
          await Promise.all([
            window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            window.faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
          ]);
          
          setModelsLoaded(true);
          faceapiLoaded = true;
          console.log('✅ FaceAPI models loaded successfully');
          
          // ✅ Notify Parent (DiscoverStyle) that we are ready
          if (onModelsLoaded) onModelsLoaded();
        };
        
        document.head.appendChild(script);
      } catch (error) {
        console.error('❌ Error loading FaceAPI:', error);
        setWebcamError('Failed to load emotion detection models');
      }
    };

    loadFaceAPI();
  }, [onModelsLoaded]);

  // --- 2. AUTO-START WEBCAM ---
  // When models load, automatically attempt to start the camera
  useEffect(() => {
    if (modelsLoaded && !isActive) {
      startWebcam();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelsLoaded]);

  // --- 3. SESSION LOGGING MANAGEMENT ---
  useEffect(() => {
    if (currentDesign && isActive) {
      emotionLogger.startSession(currentDesign.id, currentDesign.type);
    }
  }, [currentDesign, isActive]);

  // --- 4. START WEBCAM FUNCTION ---
  const startWebcam = async () => {
    try {
      if (!modelsLoaded) {
        setWebcamError('Emotion models still loading...');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsActive(true);
        setWebcamError(null);
      }
    } catch (err) {
      console.error('Error accessing webcam:', err);
      setWebcamError('Cannot access webcam. Please check permissions.');
    }
  };

  // --- 5. STOP WEBCAM FUNCTION ---
  const stopDetection = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setIsActive(false);
    
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  // --- 6. DETECTION LOOP (Run whenever Active) ---
  useEffect(() => {
    if (!isActive || !modelsLoaded || !videoRef.current) return;

    let mounted = true;

    const detectEmotions = async () => {
      if (!mounted) return;
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

      // Ensure video is playing and has dimensions
      if (videoRef.current.readyState === 4) {
        try {
          const detection = await window.faceapi
            .detectSingleFace(videoRef.current, new window.faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();

          if (detection) {
            const expressions = detection.expressions;
            const dominantEmotion = Object.keys(expressions).reduce((a, b) => 
              expressions[a] > expressions[b] ? a : b
            );
            
            const confidence = expressions[dominantEmotion];
            
            // Filter out low-confidence detections
            if (confidence > 0.6) {
              const emotionData = {
                emotion: dominantEmotion,
                confidence: confidence,
                timestamp: Date.now(),
                expressions: expressions
              };

              setEmotion(dominantEmotion);
              setDetectionStats({
                confidence: Math.round(confidence * 100),
                expressions: expressions
              });

              // Log internally
              const designContext = {
                designId: currentDesign?.id || 'unknown',
                designType: currentDesign?.type || 'unknown',
                elements: currentDesign?.elements || [],
                timestamp: Date.now()
              };
              emotionLogger.logEmotion(emotionData, designContext);

              // Notify parent
              if (onEmotionDetected) {
                onEmotionDetected(emotionData);
              }
            }
            
            // Draw face detection box
            if (canvasRef.current) {
              const displaySize = {
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight
              };
              window.faceapi.matchDimensions(canvasRef.current, displaySize);
              
              const resizedDetection = window.faceapi.resizeResults(detection, displaySize);
              const ctx = canvasRef.current.getContext('2d');
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
              
              window.faceapi.draw.drawDetections(canvasRef.current, resizedDetection);
              window.faceapi.draw.drawFaceExpressions(canvasRef.current, resizedDetection);
            }
          }
        } catch (error) {
          // Silent catch to prevent console spam loops
        }
      }
    };

    const intervalId = setInterval(detectEmotions, 500); // Run every 500ms
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [isActive, modelsLoaded, onEmotionDetected, currentDesign]);

  // Format emotion for display
  const formatEmotion = (emotionKey) => {
    const emotionMap = {
      'happy': '😊 Happy',
      'sad': '😢 Sad', 
      'angry': '😠 Angry',
      'fearful': '😨 Fearful',
      'disgusted': '🤢 Disgusted',
      'surprised': '😲 Surprised',
      'neutral': '😐 Neutral'
    };
    return emotionMap[emotionKey] || emotionKey;
  };

  return (
    <div className="emotion-detector">
      <h3>🎭 Real Emotion Detection {modelsLoaded ? '✅' : '⏳'}</h3>
      
      <div className="detection-area">
        {webcamError ? (
          <div className="webcam-error">
            <div className="error-icon">⚠</div>
            <p>{webcamError}</p>
            {!modelsLoaded && <p>Loading AI models...</p>}
          </div>
        ) : (
          <div className="webcam-feed">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="webcam-video"
            />
            <canvas 
              ref={canvasRef} 
              className="detection-canvas"
            />
          </div>
        )}
        
        <div className="emotion-display">
          <div className={`emotion-badge ${emotion}`}>
            {formatEmotion(emotion)}
            {detectionStats.confidence > 0 && (
              <span className="confidence"> ({detectionStats.confidence}% confidence)</span>
            )}
          </div>
          
          {detectionStats.confidence > 0 && (
            <div className="expression-breakdown">
              <small>Micro-expressions detected:</small>
              <div className="expression-bars">
                {Object.entries(detectionStats.expressions)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 3)
                  .map(([expr, score]) => (
                    <div key={expr} className="expression-bar">
                      <span className="expr-name">{expr}:</span>
                      <div className="bar-container">
                        <div 
                          className="bar-fill" 
                          style={{ width: `${score * 100}%` }}
                        ></div>
                      </div>
                      <span className="expr-score">{Math.round(score * 100)}%</span>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="controls">
        {!isActive ? (
          <button 
            onClick={startWebcam} 
            className="start-btn"
            disabled={!modelsLoaded}
          >
            {modelsLoaded ? '🎬 Start Real Emotion Detection' : '⏳ Loading AI Models...'}
          </button>
        ) : (
          <button onClick={stopDetection} className="stop-btn">
            ⏹ Stop Detection
          </button>
        )}
      </div>

      <div className="emotion-log">
        <h4>Emotional Data Stream:</h4>
        <div className="data-stream">
          <div className="data-point">
            <span className="timestamp">Real-time</span>
            <span className="emotion-value">{formatEmotion(emotion)}</span>
            {detectionStats.confidence > 0 && (
              <span className="confidence-badge">{detectionStats.confidence}%</span>
            )}
          </div>
          <p>Building your emotional profile from real facial expressions...</p>
        </div>
      </div>
    </div>
  );
};

export default EmotionDetector;
