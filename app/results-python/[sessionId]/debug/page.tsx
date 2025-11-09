'use client'

/**
 * Debug View for Analysis
 * Shows detailed timestamped breakdown of scoring
 */

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

export default function DebugPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/sessions/${sessionId}`)
        const result = await response.json()
        setData(result.analysis.debug.detailed_report)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [sessionId])

  if (loading) return <div style={{ padding: '2rem' }}>Loading debug data...</div>
  if (!data) return <div style={{ padding: '2rem' }}>No debug data available</div>

  const {
    engagement_analysis = {},
    problem_periods = [],
    score_factors = {},
    recommendations = []
  } = data || {}

  const frameDistribution = engagement_analysis.frame_distribution || {}
  const percentages = engagement_analysis.percentages || {}
  const movementStats = engagement_analysis.movement_stats || {}
  const engagementFactors = (score_factors && score_factors.engagement) || null
  const hasEngagementData = Object.keys(engagement_analysis).length > 0

  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: '1400px', 
      margin: '0 auto', 
      fontFamily: 'monospace',
      backgroundColor: '#ffffff',
      minHeight: '100vh',
      color: '#000000'
    }}>
      <h1 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#000' }}>🔍 Debug Analysis: {sessionId}</h1>
      
      {/* Critical Issues */}
      {recommendations && recommendations.length > 0 && (
        <div style={{
          padding: '1.5rem',
          backgroundColor: '#fff3cd',
          border: '2px solid #ffc107',
          borderRadius: '8px',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>⚠️ Why You Got 0 Engagement:</h2>
          {recommendations.map((rec: string, idx: number) => (
            <div key={idx} style={{ 
              marginBottom: '0.5rem',
              padding: '0.5rem',
              backgroundColor: '#fff',
              borderRadius: '4px'
            }}>
              {rec}
            </div>
          ))}
        </div>
      )}

      {/* Engagement Deep Dive */}
      {hasEngagementData && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid #333', paddingBottom: '0.5rem' }}>
            📊 Engagement Breakdown (Frame-by-Frame)
          </h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Total Frames</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{engagement_analysis.total_frames ?? 0}</div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#fee', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Static Frames</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#c00' }}>
                {frameDistribution.static ?? 0} ({(percentages.static ?? 0).toFixed(1)}%)
              </div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#fef3cd', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Moderate Frames</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#856404' }}>
                {frameDistribution.moderate ?? 0} ({(percentages.moderate ?? 0).toFixed(1)}%)
              </div>
            </div>
            <div style={{ padding: '1rem', backgroundColor: '#d4edda', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Dynamic Frames</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#155724' }}>
                {frameDistribution.dynamic ?? 0} ({(percentages.dynamic ?? 0).toFixed(1)}%)
              </div>
            </div>
          </div>

          <div style={{ padding: '1.5rem', backgroundColor: '#e7f3ff', borderRadius: '8px', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Movement Statistics</h3>
            <div style={{ fontSize: '0.95rem', lineHeight: 1.8 }}>
              <div><strong>Average Movement:</strong> {(movementStats.average ?? 0).toFixed(6)}</div>
              <div><strong>Threshold Needed:</strong> {(movementStats.threshold_needed ?? 0).toFixed(6)}</div>
              <div style={{ 
                color: (movementStats.gap ?? 0) > 0 ? '#c00' : '#0a0',
                fontWeight: 'bold'
              }}>
                <strong>Gap:</strong> {(movementStats.gap ?? 0) > 0 
                  ? `${(movementStats.gap ?? 0).toFixed(6)} BELOW threshold ❌` 
                  : 'Above threshold ✅'}
              </div>
              <div><strong>Max Movement:</strong> {(movementStats.max ?? 0).toFixed(6)}</div>
              <div><strong>Min Movement:</strong> {(movementStats.min ?? 0).toFixed(6)}</div>
            </div>
          </div>

          <div style={{ padding: '1.5rem', backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px' }}>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Diagnosis</h3>
            <div style={{ fontSize: '1rem', lineHeight: 1.6 }}>{engagement_analysis.diagnosis}</div>
          </div>
        </div>
      )}

      {/* Problem Periods */}
      {problem_periods && problem_periods.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid #333', paddingBottom: '0.5rem' }}>
            ⏱️ Problem Periods (Timestamped)
          </h2>
          {problem_periods.map((problem: any, idx: number) => (
            <div key={idx} style={{
              padding: '1rem',
              marginBottom: '0.5rem',
              backgroundColor: problem.severity === 'high' ? '#fee' : '#fef3cd',
              border: '1px solid',
              borderColor: problem.severity === 'high' ? '#fcc' : '#fed',
              borderRadius: '4px'
            }}>
              {problem.type === 'extended_static_period' ? (
                <>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    🚫 Extended Static Period
                  </div>
                  <div style={{ fontSize: '0.9rem' }}>
                    <div><strong>Start:</strong> {formatTime(problem.start_time)}</div>
                    <div><strong>End:</strong> {formatTime(problem.end_time)}</div>
                    <div><strong>Duration:</strong> {problem.duration.toFixed(1)}s</div>
                    <div style={{ marginTop: '0.5rem', fontStyle: 'italic' }}>
                      You were completely still during this period. Add subtle torso movement!
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    📐 Poor Posture
                  </div>
                  <div style={{ fontSize: '0.9rem' }}>
                    <div><strong>Time:</strong> {formatTime(problem.timestamp)}</div>
                    <div><strong>Score:</strong> {problem.score.toFixed(1)}/100</div>
                    <div><strong>Issues:</strong></div>
                    <ul style={{ marginLeft: '1.5rem', marginTop: '0.25rem' }}>
                      {problem.issues.map((issue: string, i: number) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Score Factors */}
      {engagementFactors && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', borderBottom: '2px solid #333', paddingBottom: '0.5rem' }}>
            🎯 What Hurt Your Scores
          </h2>
          
          {engagementFactors && (
            <div style={{ padding: '1.5rem', backgroundColor: '#f8f9fa', borderRadius: '8px', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Engagement</h3>
              <div style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>
                <div><strong>Frames that scored:</strong> {engagementFactors.frames_that_scored ?? 0}</div>
                <div><strong>Frames that didn't score:</strong> {engagementFactors.frames_that_didnt_score ?? 0}</div>
                <div><strong>Success rate:</strong> {(engagementFactors.percentage_scoring ?? 0).toFixed(1)}%</div>
                
                {engagementFactors.why_frames_didnt_score && engagementFactors.why_frames_didnt_score.length > 0 && (
                  <>
                    <div style={{ marginTop: '1rem', fontWeight: 'bold' }}>Examples of frames that didn't score:</div>
                    <div style={{ 
                      maxHeight: '200px',
                      overflowY: 'auto',
                      marginTop: '0.5rem',
                      padding: '0.5rem',
                      backgroundColor: '#fff',
                      borderRadius: '4px',
                      fontSize: '0.85rem'
                    }}>
                      {engagementFactors.why_frames_didnt_score.map((reason: string, idx: number) => (
                        <div key={idx} style={{ marginBottom: '0.25rem' }}>{reason}</div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <a href={`/results-python/${sessionId}`} style={{ 
          padding: '1rem 2rem',
          backgroundColor: '#007bff',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          display: 'inline-block'
        }}>
          ← Back to Results
        </a>
      </div>
    </div>
  )
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 10)
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`
}

