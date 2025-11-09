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

interface SlideIssue {
  timestamp: number
  timestamp_formatted: string
  overall_score: number
  issues: Array<{
    category: string
    issue: string
    severity: string
    suggestion: string
  }>
  summary: string
}

interface SessionData {
  session_id: string
  analysis: Analysis
  coaching: string
  slide_analysis?: {
    frames_analyzed: number
    average_score: number
    total_issues: number
    timestamped_issues: SlideIssue[]
  }
  speech_analysis?: {
    oral_presentation_score: number
    scores: {
      dialect: number
      grammar: number
      filler_words: number
      pace: number
    }
    total_issues: number
    issues: Array<{
      category: string
      issue: string
      severity: string
      suggestion: string
    }>
    dialect_feedback: string
    grammar_feedback: string
    full_transcript: string
    total_chunks: number
  }
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

  const { analysis, coaching, slide_analysis, speech_analysis } = data
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
            score={aggregates?.posture_score}
            description="% of time with good posture"
          />
          <ScoreCard
            title="Eye Contact"
            score={aggregates?.eye_contact_proxy}
            description="% of time looking forward"
          />
          <ScoreCard
            title="Gestures"
            score={aggregates?.gesture_quality}
            description="% of time gesturing well"
          />
          <ScoreCard
            title="Smile"
            score={aggregates?.smile_score}
            description="% of time smiling"
          />
          <ScoreCard
            title="Engagement"
            score={aggregates?.engagement_score}
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

      {/* Slide Content Analysis */}
      {slide_analysis && slide_analysis.frames_analyzed > 0 && (
        <div style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          backgroundColor: '#fff8e1',
          borderRadius: '8px',
          border: '2px solid #ffc107'
        }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#000' }}>
            📊 Slide Content Analysis
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Slides Analyzed</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffc107' }}>
                {slide_analysis.frames_analyzed}
              </div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Average Score</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>
                {slide_analysis.average_score?.toFixed(1) ?? 'N/A'}/10
              </div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Issues Found</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc3545' }}>
                {slide_analysis.total_issues ?? 0}
              </div>
            </div>
          </div>

          {slide_analysis.timestamped_issues && slide_analysis.timestamped_issues.length > 0 && (
            <>
              <h3 style={{ fontSize: '1.2rem', marginTop: '1.5rem', marginBottom: '1rem', color: '#000' }}>
                ⏰ Timestamped Slide Issues
              </h3>
              {slide_analysis.timestamped_issues.map((slide, idx) => (
                <div key={idx} style={{
                  padding: '1rem',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  borderLeft: `4px solid ${
                    slide.overall_score >= 8 ? '#28a745' :
                    slide.overall_score >= 6 ? '#ffc107' :
                    slide.overall_score >= 4 ? '#fd7e14' : '#dc3545'
                  }`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <strong style={{ color: '#000' }}>
                      📍 {slide.timestamp_formatted || `${slide.timestamp.toFixed(1)}s`}
                    </strong>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', 
                      backgroundColor: slide.overall_score >= 7 ? '#d4edda' : '#f8d7da',
                      color: slide.overall_score >= 7 ? '#155724' : '#721c24',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold'
                    }}>
                      Score: {slide.overall_score}/10
                    </span>
                  </div>
                  
                  {slide.summary && (
                    <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem', opacity: 0.8, color: '#000' }}>
                      {slide.summary}
                    </p>
                  )}
                  
                  {slide.issues && slide.issues.length > 0 && (
                    <div style={{ marginTop: '0.75rem' }}>
                      {slide.issues.map((issue, issueIdx) => {
                        const severityColor = {
                          critical: '#dc3545',
                          high: '#fd7e14',
                          medium: '#ffc107',
                          low: '#28a745'
                        }[issue.severity] || '#6c757d'
                        
                        return (
                          <div key={issueIdx} style={{
                            padding: '0.75rem',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '6px',
                            marginTop: '0.5rem',
                            borderLeft: `3px solid ${severityColor}`
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                              <span style={{
                                padding: '0.15rem 0.5rem',
                                backgroundColor: severityColor,
                                color: 'white',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                fontWeight: 'bold',
                                textTransform: 'uppercase'
                              }}>
                                {issue.severity}
                              </span>
                              <strong style={{ fontSize: '0.85rem', color: '#000' }}>{issue.category}</strong>
                            </div>
                            <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: '#000' }}>
                              <strong>Issue:</strong> {issue.issue}
                            </div>
                            <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: '#28a745' }}>
                              <strong>💡 Fix:</strong> {issue.suggestion}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Speech/Voice Delivery Analysis */}
      {speech_analysis && speech_analysis.total_chunks > 0 && (
        <div style={{
          marginBottom: '2rem',
          padding: '1.5rem',
          backgroundColor: '#e8f5e9',
          borderRadius: '8px',
          border: '2px solid #4caf50'
        }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem', color: '#000' }}>
            🎤 Speech & Voice Delivery Analysis
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Oral Presentation Score</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4caf50' }}>
                {speech_analysis.oral_presentation_score?.toFixed(1) ?? 'N/A'}/10
              </div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Audio Chunks Analyzed</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2196f3' }}>
                {speech_analysis.total_chunks}
              </div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>Speech Issues</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff9800' }}>
                {speech_analysis.total_issues ?? 0}
              </div>
            </div>
          </div>

          {/* Score Breakdown */}
          <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '1rem', color: '#000' }}>
            📊 Score Breakdown (each out of 2.5)
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '0.75rem', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>Dialect/Pronunciation</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4caf50' }}>
                {speech_analysis.scores?.dialect?.toFixed(1) ?? 'N/A'}
              </div>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>Grammar</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2196f3' }}>
                {speech_analysis.scores?.grammar?.toFixed(1) ?? 'N/A'}
              </div>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>Filler Words</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff9800' }}>
                {speech_analysis.scores?.filler_words?.toFixed(1) ?? 'N/A'}
              </div>
            </div>
            <div style={{ padding: '0.75rem', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>Pace/Timing</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#9c27b0' }}>
                {speech_analysis.scores?.pace?.toFixed(1) ?? 'N/A'}
              </div>
            </div>
          </div>

          {/* Speech Issues */}
          {speech_analysis.issues && speech_analysis.issues.length > 0 && (
            <>
              <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '1rem', color: '#000' }}>
                ⚠️ Speech Issues Detected
              </h3>
              {speech_analysis.issues.map((issue, idx) => {
                const severityColor = {
                  critical: '#dc3545',
                  high: '#fd7e14',
                  medium: '#ffc107',
                  low: '#28a745'
                }[issue.severity] || '#6c757d'
                
                return (
                  <div key={idx} style={{
                    padding: '1rem',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    marginBottom: '0.75rem',
                    borderLeft: `4px solid ${severityColor}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <span style={{
                        padding: '0.15rem 0.5rem',
                        backgroundColor: severityColor,
                        color: 'white',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}>
                        {issue.severity}
                      </span>
                      <strong style={{ fontSize: '0.9rem', color: '#000' }}>{issue.category}</strong>
                    </div>
                    <div style={{ fontSize: '0.9rem', marginTop: '0.25rem', color: '#000' }}>
                      <strong>Issue:</strong> {issue.issue}
                    </div>
                    <div style={{ fontSize: '0.9rem', marginTop: '0.25rem', color: '#28a745' }}>
                      <strong>💡 Suggestion:</strong> {issue.suggestion}
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* Transcript */}
          {speech_analysis.full_transcript && speech_analysis.full_transcript.length > 0 && (
            <>
              <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '1rem', color: '#000' }}>
                📝 Full Transcript
              </h3>
              <div style={{
                padding: '1rem',
                backgroundColor: 'white',
                borderRadius: '8px',
                maxHeight: '300px',
                overflowY: 'auto',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                color: '#000',
                fontFamily: 'Georgia, serif',
                fontStyle: 'italic'
              }}>
                "{speech_analysis.full_transcript}"
              </div>
            </>
          )}

          {/* Feedback */}
          {(speech_analysis.dialect_feedback || speech_analysis.grammar_feedback) && (
            <>
              <h3 style={{ fontSize: '1.1rem', marginTop: '1.5rem', marginBottom: '1rem', color: '#000' }}>
                💬 Detailed Feedback
              </h3>
              {speech_analysis.dialect_feedback && (
                <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '8px', marginBottom: '0.75rem' }}>
                  <strong style={{ color: '#4caf50' }}>Pronunciation & Clarity:</strong>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', lineHeight: 1.6, color: '#000' }}>
                    {speech_analysis.dialect_feedback}
                  </p>
                </div>
              )}
              {speech_analysis.grammar_feedback && (
                <div style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '8px' }}>
                  <strong style={{ color: '#2196f3' }}>Grammar & Structure:</strong>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', lineHeight: 1.6, color: '#000' }}>
                    {speech_analysis.grammar_feedback}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

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

function ScoreCard({ title, score, description }: { title: string; score: number | undefined; description: string }) {
  // Handle undefined/null scores
  const safeScore = score ?? 0
  
  const getColor = (s: number) => {
    if (s >= 75) return '#28a745'
    if (s >= 50) return '#ffc107'
    return '#dc3545'
  }

  return (
    <div style={{
      padding: '1.5rem',
      backgroundColor: '#fff',
      border: `3px solid ${getColor(safeScore)}`,
      borderRadius: '8px'
    }}>
      <div style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '0.5rem' }}>
        {title}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: getColor(safeScore) }}>
        {safeScore.toFixed(0)}
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

