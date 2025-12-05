// src/utils/EmotionLogger.js - FIXED VERSION
export class EmotionLogger {
  constructor() {
    this.emotionHistory = [];
    this.currentSession = null;
  }

  startSession(designId, designType) {
    this.currentSession = {
      designId,
      designType,
      startTime: Date.now(),
      emotionData: []
    };
    console.log(`🎭 Starting emotion session for ${designType}`);
  }

  logEmotion(emotionData, designContext = {}) {
    if (!this.currentSession) return;

    const logEntry = {
      timestamp: Date.now(),
      emotion: emotionData.emotion,
      confidence: emotionData.confidence,
      expressions: emotionData.expressions,
      designContext,
      sessionDuration: Date.now() - this.currentSession.startTime
    };

    this.currentSession.emotionData.push(logEntry);
    this.emotionHistory.push(logEntry);

    console.log(`📊 Emotion logged: ${emotionData.emotion} (${Math.round(emotionData.confidence * 100)}%)`);
    
    return logEntry;
  }

  getEmotionalSummary() {
    if (!this.currentSession || this.currentSession.emotionData.length === 0) {
      return {
        session: this.currentSession || { designId: 'none', designType: 'none' },
        dominantEmotion: 'neutral',
        emotionDistribution: {},
        totalReactions: 0,
        hasData: false
      };
    }

    const emotions = this.currentSession.emotionData.map(entry => entry.emotion);
    const emotionCount = emotions.reduce((acc, emotion) => {
      acc[emotion] = (acc[emotion] || 0) + 1;
      return acc;
    }, {});

    const dominantEmotion =
      Object.keys(emotionCount).length > 0
        ? Object.keys(emotionCount).reduce((a, b) =>
            emotionCount[a] > emotionCount[b] ? a : b
          )
        : 'neutral';

    return {
      session: this.currentSession,
      dominantEmotion: dominantEmotion,
      emotionDistribution: emotionCount,
      totalReactions: emotions.length,
      hasData: true
    };
  }

  endSession() {
    const summary = this.getEmotionalSummary();
    console.log('📈 Session Summary:', summary);
    this.currentSession = null;
    return summary;
  }

  getRecentEmotions(limit = 10) {
    return this.emotionHistory.slice(-limit);
  }

  clearHistory() {
    this.emotionHistory = [];
    this.currentSession = null;
  }
}

export const emotionLogger = new EmotionLogger();
