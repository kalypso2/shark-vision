/**
 * Results Page
 * Displays analysis results and video playback for a session
 */

'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import AnalysisResults from '@/components/AnalysisResults'
import type { BodyLanguageAnalysis } from '@/lib/body_language/types'

export default function ResultsPage() {
  const params = useParams()
  const sessionId = params.sessionId as string

  const [analysis, setAnalysis] = useState<BodyLanguageAnalysis | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [coaching, setCoaching] = useState<string | null>(null)
  const [coachingLoading, setCoachingLoading] = useState(false)

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const response = await fetch(`/api/presentations/${sessionId}`)
        
        if (!response.ok) {
          throw new Error('Failed to load results')
        }

        const data = await response.json()
        setAnalysis(data.analysis)
        setVideoUrl(data.videoUrl)
        
        // Fetch coaching feedback
        fetchCoaching(data.analysis)
      } catch (err) {
        console.error('Error fetching results:', err)
        setError('Failed to load presentation results')
      } finally {
        setLoading(false)
      }
    }

    const fetchCoaching = async (analysisData: BodyLanguageAnalysis) => {
      setCoachingLoading(true)
      try {
        const response = await fetch('/api/coaching', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ analysis: analysisData }),
        })
        
        if (response.ok) {
          const data = await response.json()
          setCoaching(data.coaching)
        }
      } catch (err) {
        console.error('Error fetching coaching:', err)
        // Coaching is optional, don't show error
      } finally {
        setCoachingLoading(false)
      }
    }

    fetchResults()
  }, [sessionId])

  if (loading) {
    return (
      <main style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
      }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
          Loading results...
        </div>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid rgba(255, 255, 255, 0.3)',
          borderTopColor: '#fff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
      </main>
    )
  }

  if (error || !analysis) {
    return (
      <main style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
      }}>
        <div style={{
          padding: '2rem',
          backgroundColor: 'rgba(255, 107, 107, 0.2)',
          border: '1px solid #ff6b6b',
          borderRadius: '1rem',
          color: '#ff6b6b',
          maxWidth: '500px',
          textAlign: 'center',
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Error</h2>
          <p>{error || 'Presentation not found'}</p>
          <a
            href="/analysis-python"
            style={{
              display: 'inline-block',
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#667eea',
              color: '#fff',
              borderRadius: '0.5rem',
              textDecoration: 'none',
            }}
          >
            Record New Presentation
          </a>
        </div>
      </main>
    )
  }

  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
      padding: '2rem',
    }}>
      {/* Header */}
      <div style={{
        width: '100%',
        maxWidth: '1200px',
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: 'bold',
            marginBottom: '0.5rem',
          }}>
            Presentation Analysis
          </h1>
          <p style={{
            fontSize: '0.875rem',
            opacity: 0.7,
          }}>
            Session: {sessionId}
          </p>
        </div>
        <a
          href="/analysis-python"
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#667eea',
            color: '#fff',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            fontWeight: '600',
          }}
        >
          New Recording
        </a>
      </div>

      {/* Video Player */}
      {videoUrl && (
        <div style={{
          width: '100%',
          maxWidth: '1200px',
          marginBottom: '2rem',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '1rem',
          padding: '1.5rem',
          backdropFilter: 'blur(10px)',
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            marginBottom: '1rem',
          }}>
            Video Playback
          </h2>
          <video
            controls
            style={{
              width: '100%',
              borderRadius: '0.5rem',
              backgroundColor: '#000',
            }}
          >
            <source src={videoUrl} type="video/webm" />
            <source src={videoUrl} type="video/mp4" />
            Your browser does not support video playback.
          </video>
        </div>
      )}

      {/* AI Coaching Feedback */}
      {(coaching || coachingLoading) && (
        <div style={{
          width: '100%',
          maxWidth: '1200px',
          marginBottom: '2rem',
          backgroundColor: 'rgba(102, 126, 234, 0.15)',
          borderRadius: '1rem',
          padding: '1.5rem',
          backdropFilter: 'blur(10px)',
          border: '2px solid rgba(102, 126, 234, 0.3)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🤖</span>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              AI Coach Feedback
            </h2>
          </div>
          
          {coachingLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.7 }}>
              Analyzing your presentation...
            </div>
          ) : (
            <div style={{
              whiteSpace: 'pre-wrap',
              lineHeight: '1.6',
              fontSize: '0.95rem',
            }}>
              {coaching}
            </div>
          )}
        </div>
      )}

      {/* Analysis Results */}
      <AnalysisResults analysis={analysis} />

      {/* Footer Actions */}
      <div style={{
        marginTop: '2rem',
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}>
        <button
          onClick={() => {
            const dataStr = JSON.stringify(analysis, null, 2)
            const dataBlob = new Blob([dataStr], { type: 'application/json' })
            const url = URL.createObjectURL(dataBlob)
            const a = document.createElement('a')
            a.href = url
            a.download = `analysis-${sessionId}.json`
            a.click()
            URL.revokeObjectURL(url)
          }}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          Download JSON
        </button>
      </div>
    </main>
  )
}

