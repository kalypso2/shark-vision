'use client'

import { useState, useEffect } from 'react'

interface VRModeButtonProps {
  onVRStart: (session: XRSession) => void
  onVREnd: () => void
}

export function VRModeButton({ onVRStart, onVREnd }: VRModeButtonProps) {
  const [isVRSupported, setIsVRSupported] = useState(false)
  const [isVRActive, setIsVRActive] = useState(false)
  const [vrSession, setVrSession] = useState<XRSession | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>('')

  useEffect(() => {
    // Comprehensive WebXR detection
    const checkWebXR = async () => {
      const info: string[] = []
      
      info.push('=== WebXR Diagnostic ===')
      info.push(`User Agent: ${navigator.userAgent}`)
      info.push(`Protocol: ${window.location.protocol}`)
      info.push(`navigator.xr exists: ${'xr' in navigator}`)
      
      if ('xr' in navigator) {
        const xr = (navigator as any).xr
        info.push(`navigator.xr is null: ${xr === null}`)
        info.push(`navigator.xr is undefined: ${xr === undefined}`)
        
        if (xr) {
          try {
            const vrSupported = await xr.isSessionSupported('immersive-vr')
            info.push(`immersive-vr: ${vrSupported}`)
            setIsVRSupported(vrSupported)
          } catch (e: any) {
            info.push(`immersive-vr error: ${e.message}`)
          }
          
          try {
            const arSupported = await xr.isSessionSupported('immersive-ar')
            info.push(`immersive-ar: ${arSupported}`)
          } catch (e: any) {
            info.push(`immersive-ar error: ${e.message}`)
          }
        }
      } else {
        info.push('WebXR NOT AVAILABLE - Need HTTPS or different browser')
      }
      
      const debugStr = info.join('\n')
      console.log(debugStr)
      setDebugInfo(debugStr)
    }
    
    checkWebXR()
  }, [])

  const startVRMode = async () => {
    try {
      // For Quest 2/3: Just enter fullscreen and use regular camera
      // The webcam on the page will use the Quest's front camera
      console.log('Entering VR fullscreen mode...')
      
      const elem = document.documentElement
      if (elem.requestFullscreen) {
        await elem.requestFullscreen()
        setIsVRActive(true)
        console.log('✅ Fullscreen VR mode active - use Start Webcam to access Quest camera')
      } else {
        alert('Fullscreen not supported')
      }

    } catch (err) {
      console.error('Failed to start VR mode:', err)
      alert(`Failed to start VR mode: ${(err as Error).message}`)
    }
  }

  const stopVRMode = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      }
      
      setIsVRActive(false)
      onVREnd()
      console.log('Exited VR fullscreen mode')
    } catch (err) {
      console.error('Error exiting VR mode:', err)
    }
  }

  // Always show the button, but change appearance based on VR support
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <button
        onClick={isVRActive ? stopVRMode : startVRMode}
        style={{
          padding: '1rem 2rem',
          backgroundColor: isVRActive 
            ? 'rgba(239, 68, 68, 0.2)' 
            : isVRSupported 
              ? 'rgba(168, 85, 247, 0.2)' 
              : 'rgba(100, 100, 100, 0.2)',
          color: 'white',
          border: `2px solid ${
            isVRActive 
              ? 'rgba(239, 68, 68, 0.5)' 
              : isVRSupported 
                ? 'rgba(168, 85, 247, 0.5)' 
                : 'rgba(150, 150, 150, 0.5)'
          }`,
          borderRadius: '0.5rem',
          cursor: isVRSupported || isVRActive ? 'pointer' : 'not-allowed',
          fontFamily: '"Press Start 2P", cursive',
          fontSize: '0.8rem',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease',
          boxShadow: isVRActive 
            ? '0 4px 16px rgba(239, 68, 68, 0.3)' 
            : isVRSupported
              ? '0 4px 16px rgba(168, 85, 247, 0.3)'
              : '0 2px 8px rgba(100, 100, 100, 0.2)',
          opacity: isVRSupported || isVRActive ? 1 : 0.6,
        }}
        onMouseEnter={(e) => {
          if (isVRSupported || isVRActive) {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = isVRActive
              ? '0 6px 20px rgba(239, 68, 68, 0.5)'
              : '0 6px 20px rgba(168, 85, 247, 0.5)'
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = isVRActive
            ? '0 4px 16px rgba(239, 68, 68, 0.3)'
            : isVRSupported
              ? '0 4px 16px rgba(168, 85, 247, 0.3)'
              : '0 2px 8px rgba(100, 100, 100, 0.2)'
        }}
        title={isVRSupported ? 'Enter VR Mode' : 'VR not supported - check debug info'}
      >
        {isVRActive ? '🥽 Exit VR Mode' : isVRSupported ? '🥽 Enter VR Mode' : '🥽 VR Mode (Unavailable)'}
      </button>
      
      {/* Debug button */}
      <button
        onClick={() => alert(debugInfo)}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          color: 'white',
          border: '1px solid rgba(59, 130, 246, 0.5)',
          borderRadius: '0.25rem',
          cursor: 'pointer',
          fontSize: '0.7rem',
          fontFamily: 'monospace',
        }}
      >
        Show WebXR Debug Info
      </button>
    </div>
  )
}
