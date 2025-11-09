/**
 * Analysis Page
 * Page for recording and analyzing presentations
 */

import PresentationRecorder from '@/components/PresentationRecorder'

export default function AnalysisPage() {
  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
    }}>
      <h1 style={{
        fontSize: '2.5rem',
        fontWeight: 'bold',
        marginBottom: '0.5rem',
        textAlign: 'center',
      }}>
        Record Your Presentation
      </h1>
      <p style={{
        fontSize: '1.1rem',
        marginBottom: '2rem',
        textAlign: 'center',
        opacity: 0.9,
        maxWidth: '600px',
      }}>
        Practice your presentation and get AI-powered feedback on your body language,
        posture, gestures, and engagement.
      </p>

      <PresentationRecorder />

      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '0.75rem',
        maxWidth: '600px',
        width: '100%',
      }}>
        <h3 style={{
          fontSize: '1.2rem',
          fontWeight: '600',
          marginBottom: '1rem',
        }}>
          What we analyze:
        </h3>
        <ul style={{
          listStyle: 'none',
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}>
          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>📏</span>
            <span>Posture quality and slouching patterns</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>✋</span>
            <span>Hand gestures and movement patterns</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>👀</span>
            <span>Eye contact and gaze direction</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>⚡</span>
            <span>Energy levels and engagement</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>🎯</span>
            <span>Fidgeting and nervous behaviors</span>
          </li>
        </ul>
      </div>
    </main>
  )
}

