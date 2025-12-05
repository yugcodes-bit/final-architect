// FIXED EmotionalDesignAI.js
export class EmotionalDesignAI {
  constructor() {
    this.userPreferences = {};
    this.emotionPatterns = {};
  }

  analyzeEmotionPatterns(emotionHistory) {
    console.log('🔍 Analyzing emotion patterns from history:', emotionHistory?.length || 0, 'entries');
    
    const patterns = {
      positiveTriggers: {},
      negativeTriggers: {},
      emotionalTrends: {}
    };

    if (!emotionHistory || emotionHistory.length === 0) {
      console.log('❌ No emotion history to analyze');
      return patterns;
    }

    // Analyze which design elements trigger positive emotions
    emotionHistory.forEach((entry, index) => {
      console.log(`📝 Entry ${index}:`, entry.emotion, 'for design:', entry.designContext?.designId);
      
      const designElements = entry.designContext?.elements || [];
      const emotion = entry.emotion;
      
      designElements.forEach(element => {
        const category = element.models?.category;
        if (!category) return;

        console.log(`🎯 Element: ${category}, Emotion: ${emotion}`);

        if (['happy', 'surprised'].includes(emotion)) {
          patterns.positiveTriggers[category] = (patterns.positiveTriggers[category] || 0) + 1;
          console.log(`✅ Positive trigger for ${category}:`, patterns.positiveTriggers[category]);
        } else if (['sad', 'angry', 'disgusted', 'fearful'].includes(emotion)) {
          patterns.negativeTriggers[category] = (patterns.negativeTriggers[category] || 0) + 1;
          console.log(`❌ Negative trigger for ${category}:`, patterns.negativeTriggers[category]);
        }
      });
    });

    // Calculate emotional trends
    const emotionCounts = emotionHistory.reduce((acc, entry) => {
      acc[entry.emotion] = (acc[entry.emotion] || 0) + 1;
      return acc;
    }, {});

    patterns.emotionalTrends = emotionCounts;
    this.emotionPatterns = patterns;
    
    console.log('📊 Final patterns:', patterns);
    return patterns;
  }

  generateDesignRecommendations(currentDesign, emotionPatterns) {
    console.log('🎨 Generating recommendations for design:', currentDesign);
    
    const recommendations = [];
    const designElements = currentDesign?.elements || [];

    console.log('📋 Design elements:', designElements.length);

    // Analyze current design against emotional patterns
    designElements.forEach(element => {
      const category = element.models?.category;
      if (!category) return;

      const positiveScore = emotionPatterns.positiveTriggers[category] || 0;
      const negativeScore = emotionPatterns.negativeTriggers[category] || 0;

      console.log(`📊 ${category}: Positive=${positiveScore}, Negative=${negativeScore}`);

      if (negativeScore > positiveScore && negativeScore >= 1) {
        recommendations.push({
          type: 'REMOVE',
          element: category,
          reason: `This ${category} has triggered negative emotions ${negativeScore} times`,
          confidence: Math.min(negativeScore / 3, 0.9), // Lower threshold for testing
          suggestion: `Consider removing or replacing this ${category}`
        });
        console.log(`❌ Recommendation to REMOVE ${category}`);
      } else if (positiveScore > negativeScore && positiveScore >= 1) {
        recommendations.push({
          type: 'ENHANCE',
          element: category,
          reason: `This ${category} has triggered positive emotions ${positiveScore} times`,
          confidence: Math.min(positiveScore / 3, 0.9), // Lower threshold for testing
          suggestion: `Consider adding more ${category} elements`
        });
        console.log(`✅ Recommendation to ENHANCE ${category}`);
      }
    });

    // Suggest new elements based on positive triggers
    Object.entries(emotionPatterns.positiveTriggers || {})
      .filter(([category, score]) => score >= 1) // Lower threshold for testing
      .forEach(([category, score]) => {
        const alreadyInDesign = designElements.some(el => 
          el.models?.category === category
        );
        
        if (!alreadyInDesign) {
          recommendations.push({
            type: 'ADD',
            element: category,
            reason: `You've shown positive responses to ${category} ${score} times`,
            confidence: Math.min(score / 3, 0.8), // Lower threshold for testing
            suggestion: `Consider adding a ${category} to this space`
          });
          console.log(`➕ Recommendation to ADD ${category}`);
        }
      });

    console.log('💡 Final recommendations:', recommendations.length);
    return recommendations.sort((a, b) => b.confidence - a.confidence);
  }

  getEmotionalSummary(emotionHistory) {
    const totalReactions = emotionHistory?.length || 0;
    if (totalReactions === 0) {
      return {
        totalReactions: 0,
        emotionDistribution: {},
        positivityScore: 0,
        dominantEmotion: 'neutral',
        hasData: false
      };
    }

    const emotionCounts = emotionHistory.reduce((acc, entry) => {
      acc[entry.emotion] = (acc[entry.emotion] || 0) + 1;
      return acc;
    }, {});

    const positivityScore = (
      ((emotionCounts.happy || 0) + (emotionCounts.surprised || 0)) / totalReactions
    ) * 100;

    const dominantEmotion = Object.keys(emotionCounts).reduce((a, b) => 
      emotionCounts[a] > emotionCounts[b] ? a : b
    );

    return {
      totalReactions,
      emotionDistribution: emotionCounts,
      positivityScore: Math.round(positivityScore),
      dominantEmotion,
      hasData: true
    };
  }
}

export const emotionalDesignAI = new EmotionalDesignAI();
