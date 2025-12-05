import React, { useRef, useEffect, useState } from 'react';
import { emotionLogger } from '../utils/EmotionLogger';
import './EmotionDetector.css';

// Prevent reloading scripts multiple times
let faceapiLoaded = false;

const EmotionDetector = ({ onEmotionDetected, currentDesign = null, onModelsLoaded }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [emotion, setEmotion] = useState('neutral');
  const [isActive, setIsActive] = useState(false);
  const [webcamError, setWebcamError] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [detectionStats, setDetectionStats] = useState({
    confidence: 0,
    expressions: {}
  });

  // --- 1. LOAD FACEAPI MODELS ---
  useEffect(() => {
    const loadFaceAPI = async () => {
      if (faceapiLoaded && window.faceapi) {
        setModelsLoaded(true);
        if (onModelsLoaded) onModelsLoaded();
        return;
      }

      try {
        const script = document.createElement('script');
        script.src =
          "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
        script.async = true;

        script.onload = async () => {
          console.log("✅ FaceAPI.js loaded");

          const MODEL_URL = "/models";

          await Promise.all([
            window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            window.faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
          ]);

          console.log("✅ FaceAPI models loaded");

          faceapiLoaded = true;
          setModelsLoaded(true);

          if (onModelsLoaded) onModelsLoaded();
        };

        document.head.appendChild(script);
      } catch (err) {
        console.error("❌ Error loading FaceAPI:", err);
        setWebcamError("Failed to load models");
      }
    };

    loadFaceAPI();
  }, [onModelsLoaded]);

  // --- 2. AUTO-START CAMERA ---
  useEffect(() => {
    if (modelsLoaded && !isActive) startWebcam();
  }, [modelsLoaded]);

  // --- 3. LOGGING SESSION ---
  useEffect(() => {
    if (currentDesign && isActive) {
      emotionLogger.startSession(
        currentDesign.id,
        currentDesign.type
      );
    }
  }, [currentDesign, isActive]);

  // --- 4. START CAMERA ---
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsActive(true);
      }
    } catch (err) {
      console.error("Webcam error:", err);
      setWebcamError("Cannot access webcam.");
    }
  };

  // --- 5. STOP CAMERA ---
  const stopDetection = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }

    setIsActive(false);

    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  };

  // --- 6. EMOTION DETECTION LOOP ---
  useEffect(() => {
    if (!isActive || !modelsLoaded) return;

    const detectEmotions = async () => {
      if (!videoRef.current) return;

      try {
        const detection = await window.faceapi
          .detectSingleFace(
            videoRef.current,
            new window.faceapi.TinyFaceDetectorOptions()
          )
          .withFaceExpressions();

        if (detection) {
          const expressions = detection.expressions;
          const dominantEmotion = Object.keys(expressions).reduce((a, b) =>
            expressions[a] > expressions[b] ? a : b
          );

          const confidence = expressions[dominantEmotion];

          if (confidence > 0.6) {
            const emotionData = {
              emotion: dominantEmotion,
              confidence,
              expressions,
              timestamp: Date.now()
            };

            setEmotion(dominantEmotion);
            setDetectionStats({
              confidence: Math.round(confidence * 100),
              expressions
            });

            const designContext = {
              designId: currentDesign?.id || "unknown",
              designType: currentDesign?.type || "unknown",
              elements: currentDesign?.elements || []
            };

            emotionLogger.logEmotion(emotionData, designContext);

            if (onEmotionDetected) onEmotionDetected(emotionData);
          }

          // Drawing overlays
          const dims = {
            width: videoRef.current.videoWidth,
            height: videoRef.current.videoHeight
          };

          window.faceapi.matchDimensions(canvasRef.current, dims);
          const resized = window.faceapi.resizeResults(detection, dims);

          const ctx = canvasRef.current.getContext("2d");
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

          window.faceapi.draw.drawDetections(canvasRef.current, resized);
          window.faceapi.draw.drawFaceExpressions(canvasRef.current, resized);
        }
      } catch {}
    };

    const interval = setInterval(detectEmotions, 500);
    return () => clearInterval(interval);
  }, [isActive, modelsLoaded, onEmotionDetected, currentDesign]);

  const formatEmotion = (e) => ({
    happy: "😊 Happy",
    sad: "😢 Sad",
    angry: "😠 Angry",
    fearful: "😨 Fearful",
    disgusted: "🤢 Disgusted",
    surprised: "😲 Surprised",
    neutral: "😐 Neutral"
  }[e] || e);

  return (
    <div className="emotion-detector">
      <h3>🎭 Real Emotion Detection {modelsLoaded ? "✅" : "⏳"}</h3>

      <div className="detection-area">
        {webcamError ? (
          <div className="webcam-error">
            <p>⚠ {webcamError}</p>
          </div>
        ) : (
          <div className="webcam-feed">
            <video ref={videoRef} autoPlay muted playsInline className="webcam-video" />
            <canvas ref={canvasRef} className="detection-canvas" />
          </div>
        )}

        <div className="emotion-display">
          <div className={`emotion-badge ${emotion}`}>
            {formatEmotion(emotion)}
            {detectionStats.confidence > 0 && (
              <span className="confidence"> ({detectionStats.confidence}%)</span>
            )}
          </div>

          {detectionStats.confidence > 0 && (
            <div className="expression-breakdown">
              <small>Micro-expressions detected:</small>

              <div className="expression-bars">
                {Object.entries(detectionStats.expressions)
                  .sort(([, a], [, b]) => b - a)
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
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="controls">
        {!isActive ? (
          <button className="start-btn" onClick={startWebcam} disabled={!modelsLoaded}>
            {modelsLoaded ? "🎬 Start Real Emotion Detection" : "⏳ Loading Models..."}
          </button>
        ) : (
          <button className="stop-btn" onClick={stopDetection}>
            ⏹ Stop Detection
          </button>
        )}
      </div>
    </div>
  );
};

export default EmotionDetector;
