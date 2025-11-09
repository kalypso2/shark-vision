'use client'

/**
 * Analysis Results Component
 * Displays body language analysis results
 */

import type { BodyLanguageAnalysis, BodyLanguageEvent } from '@/lib/body_language/types'

interface AnalysisResultsProps {
  analysis: BodyLanguageAnalysis
}

export default function AnalysisResults({ analysis }: AnalysisResultsProps) {
  const { session_meta, timeline, aggregates } = analysis

  // Format timestamp as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get color for score
  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#51cf66'
    if (score >= 60) return '#ffd43b'
    return '#ff6b6b'
  }

  // Group events by type
  const eventsByType = timeline.reduce((acc, event) => {
    if (!acc[event.type]) {
      acc[event.type] = []
    }
    acc[event.type].push(event)
    return acc
  }, {} as Record<string, BodyLanguageEvent[]>)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '2rem',
      width: '100%',
      maxWidth: '1200px',
    }}>
      {/* Session Info */}
      <div style={{
        padding: '1.5rem',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '1rem',
        backdropFilter: 'blur(10px)',
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Session Overview
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>Duration</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
              {formatTime(session_meta.duration_seconds)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>Frames Analyzed</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
              {analysis.debug.total_frames_analyzed}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>Detection Rate</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
              {analysis.debug.keypoint_detection_rate}%
            </div>
          </div>
        </div>
      </div>

      {/* Aggregate Scores */}
      <div style={{
        padding: '1.5rem',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '1rem',
        backdropFilter: 'blur(10px)',
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Overall Scores
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <ScoreCard
            title="Posture"
            score={aggregates.posture_score}
            description="Time spent in good posture"
          />
          <ScoreCard
            title="Eye Contact"
            score={aggregates.eye_contact_proxy}
            description="Looking at the audience"
          />
          <ScoreCard
            title="Engagement"
            score={aggregates.engagement_score}
            description="Energy and movement"
          />
          <ScoreCard
            title="Gesture Quality"
            score={aggregates.gesture_quality}
            description="Natural, symmetric gestures"
          />
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>Gesture Frequency</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
              {(aggregates.gesture_frequency ?? 0).toFixed(1)} per minute
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', opacity: 0.8 }}>Stillness Periods</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
              {aggregates.stillness_periods ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Events */}
      <div style={{
        padding: '1.5rem',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '1rem',
        backdropFilter: 'blur(10px)',
      }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
          Timeline Events
        </h2>
        
        {Object.entries(eventsByType).map(([type, events]) => (
          <div key={type} style={{ marginBottom: '1.5rem' }}>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              marginBottom: '0.75rem',
              textTransform: 'capitalize',
            }}>
              {type} ({events.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {events.slice(0, 10).map((event, idx) => (
                <EventCard key={idx} event={event} formatTime={formatTime} />
              ))}
              {events.length > 10 && (
                <div style={{ fontSize: '0.875rem', opacity: 0.7, marginTop: '0.5rem' }}>
                  ... and {events.length - 10} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScoreCard({ title, score, description }: { title: string; score: number; description: string }) {
  const getScoreColor = (s: number): string => {
    if (s >= 80) return '#51cf66'
    if (s >= 60) return '#ffd43b'
    return '#ff6b6b'
  }

  return (
    <div>
      <div style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.25rem' }}>
        {title}
      </div>
      <div style={{
        fontSize: '2rem',
        fontWeight: 'bold',
        color: getScoreColor(score),
        marginBottom: '0.25rem',
      }}>
        {score}
      </div>
      <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
        {description}
      </div>
    </div>
  )
}

function EventCard({ event, formatTime }: { event: BodyLanguageEvent; formatTime: (s: number) => string }) {
  const getEventEmoji = (type: string, subtype: string): string => {
    if (subtype.includes('slouch')) return '📉'
    if (subtype.includes('good_posture')) return '📏'
    if (subtype.includes('gesture')) return '✋'
    if (subtype.includes('fidget')) return '😰'
    if (subtype.includes('looked_away')) return '👀'
    if (subtype.includes('static')) return '⏸️'
    if (subtype.includes('dynamic')) return '⚡'
    return '•'
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      padding: '0.75rem',
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      borderRadius: '0.5rem',
      fontSize: '0.875rem',
    }}>
      <span style={{ fontSize: '1.2rem' }}>
        {getEventEmoji(event.type, event.subtype)}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '600', textTransform: 'capitalize' }}>
          {event.subtype.replace(/_/g, ' ')}
        </div>
        <div style={{ opacity: 0.7, fontSize: '0.8rem' }}>
          {formatTime(event.start_time)} - {formatTime(event.end_time)}
          {event.metadata?.intensity && ` • ${event.metadata.intensity} intensity`}
          {event.metadata?.direction && ` • looked ${event.metadata.direction}`}
        </div>
      </div>
      <div style={{
        padding: '0.25rem 0.5rem',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '0.25rem',
        fontSize: '0.75rem',
      }}>
        {Math.round(event.confidence * 100)}%
      </div>
    </div>
  )
}

