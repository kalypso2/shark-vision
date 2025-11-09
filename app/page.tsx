import Link from 'next/link'
import Image from 'next/image'

export default function Home() {
  return (
    <main style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      position: 'relative',
    }}>
      {/* Floating Logo */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        animation: 'float 3s ease-in-out infinite',
        zIndex: 10,
      }}>
        <Image
          src="/sharkvision_logo.png"
          alt="SharkVision Logo"
          width={180}
          height={180}
          priority
        />
      </div>

      <h1 style={{
        fontSize: '3rem',
        fontWeight: 'bold',
        marginBottom: '1rem',
        textAlign: 'center',
        fontFamily: '"Press Start 2P", cursive',
        textShadow: '4px 4px 0px rgba(0, 0, 0, 0.3)',
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
            border: '3px solid rgba(255, 105, 180, 0.4)',
            transition: 'all 0.3s ease',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-5px)';
            e.currentTarget.style.border = '3px solid rgba(255, 105, 180, 0.8)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(255, 105, 180, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.border = '3px solid rgba(255, 105, 180, 0.4)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.2)';
          }}
        >
          <h2 style={{
            fontWeight: 'bold',
            marginBottom: '0.5rem',
            fontFamily: '"Press Start 2P", cursive',
            fontSize: '1.2rem',
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
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '1rem',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        }}>
          <h3 style={{
            fontWeight: '600',
            marginBottom: '1rem',
            fontFamily: '"Press Start 2P", cursive',
            fontSize: '0.9rem',
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

