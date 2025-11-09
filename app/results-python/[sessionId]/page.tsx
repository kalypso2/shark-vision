'use client'

/**
 * Results Page for Python Backend Analysis
 * Displays analysis from MediaPipe Holistic (543 landmarks)
 */

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface Analysis {
  session_id: string
  session_meta: {
    duration_seconds: number
    total_frames: number
    fps: number
    landmarks_per_frame: number
    total_landmarks_processed: number
  }
  aggregates: {
    posture_score: number
    eye_contact_proxy: number
    gesture_quality: number
    gesture_frequency: number
    engagement_score: number
    smile_frequency: number
  }
  timeline: Array<{
    type: string
    subtype: string
    timestamp: number
    [key: string]: any
  }>
  debug: {
    metrics_count: number
    events_count: number
  }
}

interface SessionData {
  session_id: string
  analysis: Analysis
  coaching: string
}

export default function PythonResultsPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  
  const [data, setData] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/sessions/${sessionId}`)
        if (!response.ok) {
          throw new Error('Session not found')
        }
        const result = await response.json()
        setData(result)
      } catch (err) {
        setError('Failed to load analysis results')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchResults()
  }, [sessionId])

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Loading analysis...</h1>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ color: '#dc3545' }}>Error</h1>
        <p>{error || 'Failed to load results'}</p>
        <a href="/analysis-python" style={{ color: '#007bff' }}>← Try again</a>
      </div>
    )
  }

  const { analysis, coaching } = data
  const { aggregates, session_meta, timeline } = analysis

  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '1200px', 
      margin: '0 auto',
      backgroundColor: '#ffffff',
      minHeight: '100vh',
      color: '#000000'
    }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#000' }}>
        🦈 Presentation Analysis Results
      </h1>
      <div style={{ opacity: 0.7, marginBottom: '2rem' }}>
        Session: {sessionId}
      </div>

      {/* Video Player */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#000' }}>🎥 Recorded Presentation</h2>
        <div style={{ 
          backgroundColor: '#000',
          borderRadius: '12px',
          overflow: 'hidden',
          aspectRatio: '16/9',
          maxWidth: '800px'
        }}>
          <video
            controls
            autoPlay={false}
            preload="auto"
            playsInline
            key={sessionId}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              backgroundColor: '#000'
            }}
            src={`http://localhost:8000/api/sessions/${sessionId}/video`}
            onError={(e) => {
              console.error('Video load error:', e)
              const target = e.target as HTMLVideoElement
              console.error('Video error code:', target.error?.code, target.error?.message)
              console.log('Video URL:', `http://localhost:8000/api/sessions/${sessionId}/video`)
            }}
            onLoadedMetadata={(e) => {
              const target = e.target as HTMLVideoElement
              console.log('✅ Video loaded successfully')
              console.log('Duration:', target.duration, 'seconds')
              console.log('Dimensions:', target.videoWidth, 'x', target.videoHeight)
            }}
            onCanPlay={() => {
              console.log('✅ Video can play')
            }}
          >
            Your browser does not support video playback.
          </video>
        </div>
        <div style={{ 
          fontSize: '0.9rem', 
          opacity: 0.7, 
          marginTop: '0.5rem',
          color: '#000'
        }}>
          Review your presentation with timestamped analysis below
        </div>
      </div>

      {/* Session Overview */}
      <div style={{
        padding: '1.5rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>📊 Session Overview</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Duration</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>
              {Math.floor(session_meta.duration_seconds / 60)}:{(session_meta.duration_seconds % 60).toFixed(0).padStart(2, '0')}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Frames Analyzed</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{session_meta.total_frames}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Landmarks/Frame</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{session_meta.landmarks_per_frame}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Total Data Points</div>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>
              {session_meta.total_landmarks_processed.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Aggregate Scores */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>📈 Overall Scores</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <ScoreCard
            title="Posture"
            score={aggregates.posture_score}
            description="% of time with good posture"
          />
          <ScoreCard
            title="Eye Contact"
            score={aggregates.eye_contact_proxy}
            description="% of time looking forward"
          />
          <ScoreCard
            title="Gestures"
            score={aggregates.gesture_quality}
            description="% of time gesturing well"
          />
          <ScoreCard
            title="Smile"
            score={aggregates.smile_score || 0}
            description="% of time smiling"
          />
          <ScoreCard
            title="Engagement"
            score={aggregates.engagement_score}
            description="% of time engaged"
          />
        </div>
      </div>

      {/* Additional Metrics */}
      <div style={{
        padding: '1.5rem',
        backgroundColor: '#e7f3ff',
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>📊 Additional Metrics</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Gesture Frequency</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {(aggregates.gesture_frequency ?? 0).toFixed(1)} /min
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.25rem' }}>
              Target: 3-8 /min
            </div>
          </div>
        </div>
      </div>

      {/* AI Coaching */}
      <div style={{
        padding: '1.5rem',
        backgroundColor: '#fff',
        border: '2px solid #007bff',
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#007bff' }}>
          🤖 AI Coaching (RAG-Enhanced)
        </h2>
        <div style={{
          whiteSpace: 'pre-wrap',
          lineHeight: 1.6,
          fontSize: '0.95rem'
        }}>
          {coaching}
        </div>
      </div>

      {/* Event Timeline */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>📅 Event Timeline</h2>
        <div style={{
          maxHeight: '400px',
          overflowY: 'auto',
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '1rem'
        }}>
          {timeline.length === 0 ? (
            <div style={{ textAlign: 'center', opacity: 0.6 }}>No events detected</div>
          ) : (
            timeline.map((event, idx) => (
              <div
                key={idx}
                style={{
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                  backgroundColor: getEventColor(event.type),
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                    {event.type}
                  </span>
                  {' - '}
                  <span style={{ opacity: 0.8 }}>{event.subtype}</span>
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                  {formatTime(event.timestamp)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        justifyContent: 'center',
        paddingTop: '2rem',
        borderTop: '1px solid #ddd'
      }}>
        <a
          href={`/results-python/${sessionId}/debug`}
          style={{
            padding: '1rem 2rem',
            backgroundColor: '#ffc107',
            color: '#000',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: 'bold'
          }}
        >
          🔍 Debug View (Timestamped Breakdown)
        </a>
        <a
          href="/analysis-python"
          style={{
            padding: '1rem 2rem',
            backgroundColor: '#007bff',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px',
            fontWeight: 'bold'
          }}
        >
          📹 Analyze Another Presentation
        </a>
        <a
          href="/"
          style={{
            padding: '1rem 2rem',
            backgroundColor: '#6c757d',
            color: 'white',
            textDecoration: 'none',
            borderRadius: '8px'
          }}
        >
          ← Back to Home
        </a>
      </div>
    </div>
  )
}

function ScoreCard({ title, score, description }: { title: string; score: number; description: string }) {
  const getColor = (s: number) => {
    if (s >= 75) return '#28a745'
    if (s >= 50) return '#ffc107'
    return '#dc3545'
  }

  return (
    <div style={{
      padding: '1.5rem',
      backgroundColor: '#fff',
      border: `3px solid ${getColor(score)}`,
      borderRadius: '8px'
    }}>
      <div style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '0.5rem' }}>
        {title}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: getColor(score) }}>
        {score.toFixed(0)}
      </div>
      <div style={{ fontSize: '0.85rem', opacity: 0.6, marginTop: '0.5rem' }}>
        {description}
      </div>
    </div>
  )
}

function getEventColor(type: string): string {
  const colors: Record<string, string> = {
    posture: '#fff3cd',
    gesture: '#d4edda',
    gaze: '#cce5ff',
    movement: '#f0f0f0',
    facial: '#ffe6f0'
  }
  return colors[type] || '#f8f9fa'
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

