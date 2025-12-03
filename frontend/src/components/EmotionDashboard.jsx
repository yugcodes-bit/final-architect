// COMPLETE EmotionDashboard.jsx - WITH AI RECOMMENDATIONS & DEBUG LOGGING
import React, { useState, useEffect } from 'react';
import { emotionLogger } from '../utils/EmotionLogger';
import { emotionalDesignAI } from '../utils/EmotionalDesignAI';
import './EmotionDashboard.css';

const EmotionDashboard = ({ currentDesign }) => {
  const [emotionalSummary, setEmotionalSummary] = useState(null);
  const [realTimeEmotions, setRealTimeEmotions] = useState([]);
  const [designRecommendations, setDesignRecommendations] = useState([]);
  const [emotionPatterns, setEmotionPatterns] = useState(null);

  useEffect(() => {
    const updateDashboard = () => {
      // Debug: Check what data we have
      console.log('🔄 Updating dashboard...');
      console.log('📊 Emotion history length:', emotionLogger.emotionHistory.length);
      console.log('🎨 Current design:', currentDesign);
      
      const summary = emotionalDesignAI.getEmotionalSummary(emotionLogger.emotionHistory);
      setEmotionalSummary(summary);
      
      const recentEmotions = emotionLogger.getRecentEmotions(10);
      setRealTimeEmotions(recentEmotions);

      // Analyze patterns and generate recommendations
      if (currentDesign && emotionLogger.emotionHistory.length > 0) {
        console.log('🤖 Analyzing emotion patterns...');
        const patterns = emotionalDesignAI.analyzeEmotionPatterns(emotionLogger.emotionHistory);
        setEmotionPatterns(patterns);
        console.log('📈 Emotion patterns found:', patterns);
        
        const recommendations = emotionalDesignAI.generateDesignRecommendations(currentDesign, patterns);
        setDesignRecommendations(recommendations);
        console.log('💡 Recommendations generated:', recommendations);
      } else {
        console.log('❌ Cannot analyze: missing currentDesign or emotion data');
      }
    };

    const interval = setInterval(updateDashboard, 2000);
    return () => clearInterval(interval);
  }, [currentDesign]);

  const getEmotionColor = (emotion) => {
    const colors = {
      happy: '#4CAF50',
      sad: '#2196F3',
      angry: '#f44336',
      fearful: '#9C27B0',
      disgusted: '#8BC34A',
      surprised: '#FF9800',
      neutral: '#9E9E9E'
    };
    return colors[emotion] || '#666';
  };

  const getRecommendationColor = (type) => {
    const colors = {
      ADD: '#4CAF50',
      REMOVE: '#f44336',
      ENHANCE: '#FF9800'
    };
    return colors[type] || '#666';
  };

  if (!emotionalSummary || !emotionalSummary.hasData) {
    return (
      <div className="emotion-dashboard">
        <h3>🎭 Emotional Intelligence Dashboard</h3>
        <div className="no-data-message">
          <p>🎯 No emotion data yet.</p>
          <p>Start designing and enable emotion detection to see your emotional responses!</p>
          <div className="tips">
            <small>💡 Debug Info: Check browser console for detailed logs</small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="emotion-dashboard">
      <h3>🎭 Emotional Intelligence Dashboard</h3>
      
      <div className="dashboard-grid">
        <div className="summary-card">
          <h4>Design Session Summary</h4>
          <div className="summary-item">
            <span className="label">Positivity Score:</span>
            <span className="value positivity-score">
              {emotionalSummary.positivityScore}%
            </span>
          </div>
          <div className="summary-item">
            <span className="label">Dominant Emotion:</span>
            <span 
              className="value emotion-tag"
              style={{backgroundColor: getEmotionColor(emotionalSummary.dominantEmotion)}}
            >
              {emotionalSummary.dominantEmotion}
            </span>
          </div>
          <div className="summary-item">
            <span className="label">Total Reactions:</span>
            <span className="value">{emotionalSummary.totalReactions}</span>
          </div>
        </div>

        <div className="emotion-distribution">
          <h4>Emotion Distribution</h4>
          {Object.entries(emotionalSummary.emotionDistribution).length > 0 ? (
            Object.entries(emotionalSummary.emotionDistribution).map(([emotion, count]) => (
              <div key={emotion} className="distribution-item">
                <span className="emotion-label">{emotion}</span>
                <div className="distribution-bar">
                  <div 
                    className="distribution-fill"
                    style={{
                      width: `${(count / emotionalSummary.totalReactions) * 100}%`,
                      backgroundColor: getEmotionColor(emotion)
                    }}
                  ></div>
                </div>
                <span className="count">{count}</span>
              </div>
            ))
          ) : (
            <p className="no-distribution">No emotion data collected yet</p>
          )}
        </div>

        {/* DESIGN RECOMMENDATIONS */}
        {designRecommendations.length > 0 && (
          <div className="design-recommendations">
            <h4>🎨 AI Design Recommendations</h4>
            <div className="recommendations-list">
              {designRecommendations.slice(0, 3).map((rec, index) => (
                <div 
                  key={index} 
                  className="recommendation-item"
                  style={{borderLeftColor: getRecommendationColor(rec.type)}}
                >
                  <div className="rec-header">
                    <span className="rec-type" style={{color: getRecommendationColor(rec.type)}}>
                      {rec.type}
                    </span>
                    <span className="rec-confidence">{Math.round(rec.confidence * 100)}% confidence</span>
                  </div>
                  <div className="rec-element">{rec.element}</div>
                  <div className="rec-reason">{rec.reason}</div>
                  <div className="rec-suggestion">{rec.suggestion}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="real-time-emotions">
          <h4>Real-time Emotional Responses</h4>
          <div className="emotion-stream">
            {realTimeEmotions.length > 0 ? (
              realTimeEmotions.slice().reverse().map((entry, index) => (
                <div key={index} className="emotion-event">
                  <span className="time">
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </span>
                  <span 
                    className="emotion-badge"
                    style={{backgroundColor: getEmotionColor(entry.emotion)}}
                  >
                    {entry.emotion}
                  </span>
                  <span className="confidence">
                    {Math.round(entry.confidence * 100)}%
                  </span>
                </div>
              ))
            ) : (
              <p className="no-realtime">Waiting for emotion data...</p>
            )}
          </div>
        </div>
      </div>

      {/* EMOTION PATTERNS INSIGHTS */}
      {emotionPatterns && (
        <div className="emotion-patterns">
          <h4>📊 Your Emotional Patterns</h4>
          <div className="patterns-grid">
            <div className="pattern-section">
              <h5>Positive Triggers</h5>
              {Object.entries(emotionPatterns.positiveTriggers).length > 0 ? (
                Object.entries(emotionPatterns.positiveTriggers)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 3)
                  .map(([element, count]) => (
                    <div key={element} className="pattern-item positive">
                      <span className="element">{element}</span>
                      <span className="count">+{count}</span>
                    </div>
                  ))
              ) : (
                <p className="no-patterns">No positive triggers detected yet</p>
              )}
            </div>
            <div className="pattern-section">
              <h5>Negative Triggers</h5>
              {Object.entries(emotionPatterns.negativeTriggers).length > 0 ? (
                Object.entries(emotionPatterns.negativeTriggers)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 3)
                  .map(([element, count]) => (
                    <div key={element} className="pattern-item negative">
                      <span className="element">{element}</span>
                      <span className="count">-{count}</span>
                    </div>
                  ))
              ) : (
                <p className="no-patterns">No negative triggers detected yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DEBUG INFO (visible in UI for testing) */}
      <div className="debug-info" style={{fontSize: '0.7rem', color: '#666', marginTop: '1rem', padding: '0.5rem', background: '#f5f5f5', borderRadius: '4px'}}>
        <strong>Debug:</strong> Emotions: {emotionLogger.emotionHistory.length} | 
        Recommendations: {designRecommendations.length} | 
        Current Design: {currentDesign ? currentDesign.id : 'none'}
      </div>
    </div>
  );
};

export default EmotionDashboard;