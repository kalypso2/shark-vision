/**
 * API Route: Upload Presentation
 * POST /api/presentations/upload
 * Receives video file and analysis JSON, saves to storage
 */

import { NextRequest, NextResponse } from 'next/server'
import { saveVideo, saveAnalysis, ensureStorageDir } from '@/lib/storage'
import type { BodyLanguageAnalysis } from '@/lib/body_language/types'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    // Ensure storage directory exists
    await ensureStorageDir()

    // Parse multipart form data
    const formData = await request.formData()
    const videoFile = formData.get('video') as File | null
    const analysisJson = formData.get('analysis') as string | null

    if (!videoFile || !analysisJson) {
      return NextResponse.json(
        { error: 'Missing video or analysis data' },
        { status: 400 }
      )
    }

    // Parse analysis JSON
    let analysis: BodyLanguageAnalysis
    try {
      analysis = JSON.parse(analysisJson)
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid analysis JSON' },
        { status: 400 }
      )
    }

    // Generate session ID (or use provided one)
    const sessionId = analysis.session_meta.session_id || randomUUID()

    // Convert video file to buffer
    const videoBuffer = Buffer.from(await videoFile.arrayBuffer())

    // Determine file extension from MIME type
    const extension = videoFile.type.includes('mp4') ? 'mp4' : 'webm'

    // Save video and analysis
    await Promise.all([
      saveVideo(sessionId, videoBuffer, extension),
      saveAnalysis(sessionId, analysis),
    ])

    console.log(`Presentation saved: ${sessionId}`)

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Presentation uploaded successfully',
    })
  } catch (error) {
    console.error('Error uploading presentation:', error)
    return NextResponse.json(
      { error: 'Failed to upload presentation' },
      { status: 500 }
    )
  }
}

