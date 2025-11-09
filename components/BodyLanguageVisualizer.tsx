'use client'

/**
 * Body Language Visualizer Component
 * Renders skeleton overlay on video using detected keypoints
 */

import { useEffect, useRef } from 'react'
import type { Keypoint } from '@/lib/body_language/types'

interface BodyLanguageVisualizerProps {
  videoElement: HTMLVideoElement | null
  keypoints: Keypoint[]
  width?: number
  height?: number
}

// Connections between keypoints to draw skeleton
const POSE_CONNECTIONS = [
  // Face
  [0, 1], // nose to left eye
  [0, 2], // nose to right eye
  [1, 3], // left eye to left ear
  [2, 4], // right eye to right ear
  
  // Torso
  [5, 6], // left shoulder to right shoulder
  [5, 11], // left shoulder to left hip
  [6, 12], // right shoulder to right hip
  [11, 12], // left hip to right hip
  
  // Left arm
  [5, 7], // left shoulder to left elbow
  [7, 9], // left elbow to left wrist
  
  // Right arm
  [6, 8], // right shoulder to right elbow
  [8, 10], // right elbow to right wrist
  
  // Left leg
  [11, 13], // left hip to left knee
  [13, 15], // left knee to left ankle
  
  // Right leg
  [12, 14], // right hip to right knee
  [14, 16], // right knee to right ankle
]

export default function BodyLanguageVisualizer({
  videoElement,
  keypoints,
  width = 640,
  height = 480,
}: BodyLanguageVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !videoElement || keypoints.length === 0) {
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Scale factors
    const scaleX = canvas.width / (videoElement.videoWidth || width)
    const scaleY = canvas.height / (videoElement.videoHeight || height)

    // Draw skeleton connections
    ctx.strokeStyle = 'rgba(102, 126, 234, 0.8)'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'

    POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const start = keypoints[startIdx]
      const end = keypoints[endIdx]

      if (start && end && start.score > 0.3 && end.score > 0.3) {
        ctx.beginPath()
        ctx.moveTo(start.x * scaleX, start.y * scaleY)
        ctx.lineTo(end.x * scaleX, end.y * scaleY)
        ctx.stroke()
      }
    })

    // Draw keypoints
    keypoints.forEach((keypoint) => {
      if (keypoint.score > 0.3) {
        const x = keypoint.x * scaleX
        const y = keypoint.y * scaleY

        // Outer circle (white)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, 2 * Math.PI)
        ctx.fill()

        // Inner circle (colored by confidence)
        const alpha = keypoint.score
        ctx.fillStyle = `rgba(102, 126, 234, ${alpha})`
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, 2 * Math.PI)
        ctx.fill()
      }
    })
  }, [keypoints, videoElement, width, height])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}

