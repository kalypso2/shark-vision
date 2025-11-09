/**
 * Storage utilities for presentations
 * Handles file system operations for video and analysis data
 */

import { promises as fs } from 'fs'
import path from 'path'
import type { BodyLanguageAnalysis } from './body_language/types'

const STORAGE_DIR = path.join(process.cwd(), 'storage', 'presentations')

/**
 * Ensure storage directory exists
 */
export async function ensureStorageDir(): Promise<void> {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true })
  } catch (error) {
    console.error('Error creating storage directory:', error)
    throw error
  }
}

/**
 * Create a new session directory
 */
export async function createSessionDir(sessionId: string): Promise<string> {
  const sessionDir = path.join(STORAGE_DIR, sessionId)
  await fs.mkdir(sessionDir, { recursive: true })
  return sessionDir
}

/**
 * Save video file for a session
 */
export async function saveVideo(
  sessionId: string,
  videoBuffer: Buffer,
  extension: string = 'webm'
): Promise<string> {
  const sessionDir = await createSessionDir(sessionId)
  const videoPath = path.join(sessionDir, `video.${extension}`)
  await fs.writeFile(videoPath, videoBuffer)
  return videoPath
}

/**
 * Save analysis JSON for a session
 */
export async function saveAnalysis(
  sessionId: string,
  analysis: BodyLanguageAnalysis
): Promise<string> {
  const sessionDir = await createSessionDir(sessionId)
  const analysisPath = path.join(sessionDir, 'analysis.json')
  await fs.writeFile(analysisPath, JSON.stringify(analysis, null, 2))
  return analysisPath
}

/**
 * Load analysis JSON for a session
 */
export async function loadAnalysis(
  sessionId: string
): Promise<BodyLanguageAnalysis | null> {
  try {
    const analysisPath = path.join(STORAGE_DIR, sessionId, 'analysis.json')
    const data = await fs.readFile(analysisPath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    console.error('Error loading analysis:', error)
    return null
  }
}

/**
 * Get video file path for a session
 */
export function getVideoPath(sessionId: string, extension: string = 'webm'): string {
  return path.join(STORAGE_DIR, sessionId, `video.${extension}`)
}

/**
 * Check if session exists
 */
export async function sessionExists(sessionId: string): Promise<boolean> {
  try {
    const sessionDir = path.join(STORAGE_DIR, sessionId)
    await fs.access(sessionDir)
    return true
  } catch {
    return false
  }
}

/**
 * List all sessions
 */
export async function listSessions(): Promise<string[]> {
  try {
    await ensureStorageDir()
    const sessions = await fs.readdir(STORAGE_DIR)
    return sessions.filter(name => !name.startsWith('.'))
  } catch (error) {
    console.error('Error listing sessions:', error)
    return []
  }
}

/**
 * Delete a session and all its files
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const sessionDir = path.join(STORAGE_DIR, sessionId)
  await fs.rm(sessionDir, { recursive: true, force: true })
}

