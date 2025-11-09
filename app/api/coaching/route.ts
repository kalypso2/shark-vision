/**
 * API Route: Gemini Coaching Feedback
 * POST /api/coaching
 * Generates personalized, actionable coaching feedback using Google Gemini
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { BodyLanguageAnalysis } from '@/lib/body_language/types'
import { buildContext, formatContextForPrompt } from '@/lib/rag/context_builder'

export async function POST(request: NextRequest) {
  try {
    const { analysis } = await request.json() as { analysis: BodyLanguageAnalysis }

    // Check for API key
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { 
          error: 'Gemini API key not configured',
          fallback: generateFallbackCoaching(analysis)
        },
        { status: 200 } // Return 200 with fallback instead of error
      )
    }

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    // Build RAG-enhanced context
    const ragContext = buildContext(analysis)
    const contextPrompt = formatContextForPrompt(ragContext)

    // Build coaching prompt with RAG context
    const prompt = buildCoachingPrompt(analysis, contextPrompt)

    // Generate feedback
    const result = await model.generateContent(prompt)
    const response = await result.response
    const coaching = response.text()

    return NextResponse.json({
      coaching,
      generated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error generating coaching feedback:', error)
    
    // Return fallback coaching instead of error
    const { analysis } = await request.json() as { analysis: BodyLanguageAnalysis }
    return NextResponse.json({
      coaching: generateFallbackCoaching(analysis),
      generated_at: new Date().toISOString(),
      fallback: true,
    })
  }
}

function buildCoachingPrompt(analysis: BodyLanguageAnalysis, ragContext: string): string {
  const { session_meta, aggregates, timeline } = analysis
  
  // Get top events by type
  const postureEvents = timeline.filter(e => e.type === 'posture').slice(0, 3)
  const gestureEvents = timeline.filter(e => e.type === 'gesture').slice(0, 3)
  const gazeEvents = timeline.filter(e => e.type === 'gaze').slice(0, 3)

  return `You are an expert presentation coach with access to research-backed body language data. Analyze this presentation using evidence-based benchmarks and provide specific, grounded feedback.

${ragContext}

**Analysis Data:**

**Session Overview:**
- Duration: ${Math.round(session_meta.duration_seconds)}s (${Math.floor(session_meta.duration_seconds / 60)}:${Math.round(session_meta.duration_seconds % 60).toString().padStart(2, '0')})
- Frames analyzed: ${analysis.debug.total_frames_analyzed}

**Scores (0-100):**
- Posture: ${aggregates.posture_score}/100
- Eye Contact Proxy: ${aggregates.eye_contact_proxy}/100
- Engagement: ${aggregates.engagement_score}/100
- Gesture Quality: ${aggregates.gesture_quality}/100
- Gesture Frequency: ${aggregates.gesture_frequency.toFixed(1)} per minute

**Notable Events:**
${postureEvents.length > 0 ? `Posture: ${postureEvents.map(e => `${e.subtype} at ${formatTime(e.start_time)}`).join(', ')}` : ''}
${gestureEvents.length > 0 ? `Gestures: ${gestureEvents.map(e => `${e.subtype} at ${formatTime(e.start_time)}`).join(', ')}` : ''}
${gazeEvents.length > 0 ? `Gaze: ${gazeEvents.map(e => `${e.subtype} ${e.metadata?.direction || ''} at ${formatTime(e.start_time)}`).join(', ')}` : ''}

**Instructions:**
Provide evidence-based feedback in this format:

**Strengths:**
1. [Specific strength with comparison to research benchmark - cite source]
2. [Another strength with data]
3. [Third strength]

**Areas to Improve:**
1. [Specific improvement with research context and timestamp if relevant]
2. [Another improvement with benchmark comparison]
3. [Third improvement]

**Evidence-Based Technique:**
[One research-backed technique from the provided context that addresses their biggest weakness. Include the source citation.]

Keep it under 200 words total. Ground all feedback in the research provided. Be specific with numbers and comparisons. Cite sources in parentheses.`
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Generate rule-based fallback coaching when Gemini API is unavailable
 */
function generateFallbackCoaching(analysis: BodyLanguageAnalysis): string {
  const { aggregates, session_meta } = analysis
  const duration = Math.round(session_meta.duration_seconds)
  
  const strengths: string[] = []
  const improvements: string[] = []

  // Analyze scores to generate feedback
  if (aggregates.posture_score >= 75) {
    strengths.push('Excellent posture maintenance throughout the presentation')
  } else if (aggregates.posture_score < 60) {
    improvements.push('Focus on sitting up straight - you slouched during several key moments')
  }

  if (aggregates.eye_contact_proxy >= 75) {
    strengths.push('Strong eye contact with the audience')
  } else if (aggregates.eye_contact_proxy < 60) {
    improvements.push('Maintain more consistent eye contact - avoid looking away frequently')
  }

  if (aggregates.engagement_score >= 75) {
    strengths.push('Dynamic, energetic delivery that keeps the audience engaged')
  } else if (aggregates.engagement_score < 60) {
    improvements.push('Add more movement and energy - avoid staying too static')
  }

  if (aggregates.gesture_frequency >= 3 && aggregates.gesture_frequency <= 8) {
    strengths.push('Natural gesture frequency that emphasizes key points')
  } else if (aggregates.gesture_frequency < 2) {
    improvements.push('Use more hand gestures to emphasize important points')
  } else if (aggregates.gesture_frequency > 10) {
    improvements.push('Reduce excessive gesturing - less is more for emphasis')
  }

  // Ensure we have at least 2 items in each category
  while (strengths.length < 2) {
    strengths.push('Completed the full presentation with confidence')
  }
  while (improvements.length < 2) {
    improvements.push('Continue practicing to build consistency')
  }

  return `**Strengths:**
${strengths.slice(0, 3).map((s, i) => `${i + 1}. ${s}`).join('\n')}

**Areas to Improve:**
${improvements.slice(0, 3).map((s, i) => `${i + 1}. ${s}`).join('\n')}

**Practice Exercise:**
Stand in front of a mirror and deliver a 60-second version of your presentation. Focus on maintaining upright posture and using deliberate hand gestures to emphasize 3-5 key points. Record yourself to review progress.

_Note: This is automated feedback. For AI-powered coaching, add a GEMINI_API_KEY to your environment._`
}

