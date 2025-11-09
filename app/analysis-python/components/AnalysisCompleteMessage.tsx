'use client'

/**
 * Message shown after stopping analysis
 * Shows link to results once backend finishes processing
 */

import { useEffect, useState } from 'react'

interface Props {
  onResultsReady: (sessionId: string) => void
}

export function AnalysisCompleteMessage({ onResultsReady }: Props) {
  const [latestSession, setLatestSession] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Poll backend to find the latest session
    let attempts = 0
    const maxAttempts = 60 // 60 seconds
    
    const checkForSession = async () => {
      try {
        // Get list of sessions (we'd need to add this endpoint)
        // For now, just show instructions
        setChecking(false)
      } catch (err) {
        console.error('Error checking for session:', err)
      }
    }

    const interval = setInterval(() => {
      attempts++
      if (attempts >= maxAttempts) {
        clearInterval(interval)
        setChecking(false)
      } else {
        checkForSession()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      padding: '2rem',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      maxWidth: '500px',
      zIndex: 1000,
      color: '#000'
    }}>
      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
        ⏳ Generating Analysis...
      </h2>
      <p style={{ marginBottom: '1rem', lineHeight: 1.6 }}>
        The backend is processing your presentation:
      </p>
      <ul style={{ marginBottom: '1.5rem', paddingLeft: '1.5rem', lineHeight: 1.8 }}>
        <li>Finalizing video recording</li>
        <li>Calculating percentage scores</li>
        <li>Generating AI coaching with Gemini</li>
      </ul>
      <p style={{ 
        fontSize: '0.9rem', 
        opacity: 0.7,
        marginBottom: '1rem'
      }}>
        This takes 10-30 seconds. Check your terminal for the session ID and results URL.
      </p>
      <div style={{
        padding: '1rem',
        backgroundColor: '#f0f0f0',
        borderRadius: '8px',
        fontFamily: 'monospace',
        fontSize: '0.85rem'
      }}>
        Backend will log:<br/>
        <span style={{ color: '#28a745' }}>✅ Session session_XXXXX complete!</span><br/>
        <span style={{ color: '#007bff' }}>🌐 Results: http://localhost:3000/results-python/session_XXXXX</span>
      </div>
      <button
        onClick={() => window.location.href = '/'}
        style={{
          marginTop: '1.5rem',
          padding: '0.75rem 1.5rem',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          width: '100%'
        }}
      >
        Return to Home
      </button>
    </div>
  )
}

