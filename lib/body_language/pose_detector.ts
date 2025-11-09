/**
 * Pose Detector - TensorFlow.js MoveNet wrapper
 * Handles loading and running pose detection model
 */

import * as poseDetection from '@tensorflow-models/pose-detection'
import * as tf from '@tensorflow/tfjs-core'
import '@tensorflow/tfjs-backend-webgl'
import type { Keypoint } from './types'

export class PoseDetector {
  private detector: poseDetection.PoseDetector | null = null
  private isModelLoaded = false

  /**
   * Load the MoveNet Lightning model
   * This is optimized for single-person detection
   */
  async loadModel(): Promise<void> {
    if (this.isModelLoaded) {
      return
    }

    try {
      // Set and wait for backend to be ready
      await tf.setBackend('webgl')
      await tf.ready()
      console.log('TensorFlow.js backend ready:', tf.getBackend())

      const model = poseDetection.SupportedModels.MoveNet
      this.detector = await poseDetection.createDetector(model, {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      })
      this.isModelLoaded = true
      console.log('MoveNet model loaded successfully')
    } catch (error) {
      console.error('Failed to load MoveNet model:', error)
      console.error('Error details:', error)
      throw new Error('Failed to initialize pose detection model')
    }
  }

  /**
   * Detect pose from a video element
   * Returns keypoints for a single person
   */
  async detectPose(video: HTMLVideoElement): Promise<{ keypoints: Keypoint[] }> {
    if (!this.detector) {
      throw new Error('Model not loaded. Call loadModel() first.')
    }

    try {
      const poses = await this.detector.estimatePoses(video)
      
      if (!poses || poses.length === 0) {
        // Return empty keypoints if no pose detected
        return { keypoints: [] }
      }

      // Get first pose (single person)
      const pose = poses[0]
      
      // Convert to our Keypoint format
      const keypoints: Keypoint[] = pose.keypoints.map((kp, index) => ({
        x: kp.x,
        y: kp.y,
        score: kp.score || 0,
        name: kp.name,
      }))

      return { keypoints }
    } catch (error) {
      console.error('Error detecting pose:', error)
      return { keypoints: [] }
    }
  }

  /**
   * Check if the model is loaded and ready
   */
  isReady(): boolean {
    return this.isModelLoaded && this.detector !== null
  }

  /**
   * Dispose of the model to free up resources
   */
  dispose(): void {
    if (this.detector) {
      this.detector.dispose()
      this.detector = null
      this.isModelLoaded = false
    }
  }
}

