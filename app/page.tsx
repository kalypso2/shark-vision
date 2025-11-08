import WebcamCapture from '@/components/WebcamCapture'

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
        marginBottom: '2rem',
        textAlign: 'center',
        opacity: 0.9,
      }}>
        Next.js boilerplate with live webcam integration
      </p>
      <WebcamCapture />
    </main>
  )
}

