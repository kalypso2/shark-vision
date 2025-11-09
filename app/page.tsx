import Link from 'next/link'

export default function Home() {
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
        fontSize: '3rem',
        fontWeight: 'bold',
        marginBottom: '1rem',
        textAlign: 'center',
      }}>
        Shark Vision
      </h1>
      <p style={{
        fontSize: '1.2rem',
        marginBottom: '3rem',
        textAlign: 'center',
        opacity: 0.9,
        maxWidth: '600px',
      }}>
        AI-powered presentation coach. Get instant feedback on your body language,
        posture, gestures, and engagement.
      </p>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        width: '100%',
        maxWidth: '600px',
      }}>
        <Link
          href="/analysis-python"
          style={{
            padding: '2rem',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '1rem',
            textDecoration: 'none',
            color: 'inherit',
            backdropFilter: 'blur(10px)',
            border: '3px solid rgba(76, 175, 80, 0.4)',
            transition: 'all 0.3s ease',
          }}
        >
          <h2 style={{
            fontSize: '1.8rem',
            fontWeight: 'bold',
            marginBottom: '0.5rem',
          }}>
            🎥 Presentation Analysis
          </h2>
          <p style={{
            fontSize: '1.1rem',
            opacity: 0.9,
          }}>
            Practice your presentation and get AI feedback on your body language
          </p>
        </Link>

        <div style={{
          padding: '1.5rem',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '1rem',
          border: '2px solid rgba(255, 255, 255, 0.1)',
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
            gap: '0.5rem',
            fontSize: '0.9rem',
            opacity: 0.9,
          }}>
            <li>😊 Facial expressions and engagement</li>
            <li>✓ Posture quality and alignment</li>
            <li>✓ Hand gestures and movement</li>
            <li>✓ Eye contact and gaze direction</li>
            <li>✓ Energy and body movement</li>
            <li>✓ Real-time feedback and coaching</li>
          </ul>
        </div>
        
      </div>
    </main>
  )
}

