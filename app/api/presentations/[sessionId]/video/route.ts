/**
 * API Route: Get Presentation Video
 * GET /api/presentations/[sessionId]/video
 * Streams video file for a specific session
 */

import { NextRequest, NextResponse } from 'next/server'
import { getVideoPath, sessionExists } from '@/lib/storage'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params

    // Check if session exists
    const exists = await sessionExists(sessionId)
    if (!exists) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // Try to find video file (webm or mp4)
    let videoPath = getVideoPath(sessionId, 'webm')
    let contentType = 'video/webm'

    try {
      await fs.access(videoPath)
    } catch {
      // Try mp4
      videoPath = getVideoPath(sessionId, 'mp4')
      contentType = 'video/mp4'
      
      try {
        await fs.access(videoPath)
      } catch {
        return NextResponse.json(
          { error: 'Video file not found' },
          { status: 404 }
        )
      }
    }

    // Read video file
    const videoBuffer = await fs.readFile(videoPath)

    // Return video with appropriate headers
    return new NextResponse(videoBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': videoBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Error serving video:', error)
    return NextResponse.json(
      { error: 'Failed to serve video' },
      { status: 500 }
    )
  }
}

