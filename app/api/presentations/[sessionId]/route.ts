/**
 * API Route: Get Presentation Analysis
 * GET /api/presentations/[sessionId]
 * Retrieves analysis JSON for a specific session
 */

import { NextRequest, NextResponse } from 'next/server'
import { loadAnalysis, sessionExists, getVideoPath } from '@/lib/storage'
import { promises as fs } from 'fs'

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

    // Load analysis
    const analysis = await loadAnalysis(sessionId)
    if (!analysis) {
      return NextResponse.json(
        { error: 'Analysis not found' },
        { status: 404 }
      )
    }

    // Check if video file exists
    const videoPath = getVideoPath(sessionId, 'webm')
    let videoExists = false
    try {
      await fs.access(videoPath)
      videoExists = true
    } catch {
      // Try mp4 extension
      const mp4Path = getVideoPath(sessionId, 'mp4')
      try {
        await fs.access(mp4Path)
        videoExists = true
      } catch {
        videoExists = false
      }
    }

    return NextResponse.json({
      success: true,
      analysis,
      videoExists,
      videoUrl: videoExists ? `/api/presentations/${sessionId}/video` : null,
    })
  } catch (error) {
    console.error('Error retrieving presentation:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve presentation' },
      { status: 500 }
    )
  }
}

