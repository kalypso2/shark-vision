# Body Language Analysis Testing & Tuning Guide

This guide will help you test and tune the body language analysis feature.

## Prerequisites

1. Ensure all dependencies are installed:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open http://localhost:3000 in your browser

## Testing Steps

### 1. Basic Functionality Test

**Goal:** Verify the complete recording and analysis pipeline works

1. Navigate to http://localhost:3000/analysis
2. Click "Start Webcam" (grant camera permissions if prompted)
3. Click "Start Recording"
4. Record a 30-second test presentation:
   - Speak naturally
   - Use hand gestures
   - Look at camera, then away
   - Slouch briefly, then straighten up
   - Stay still for 5 seconds, then move around
5. Click "Stop Recording"
6. Wait for processing (should take 5-10 seconds)
7. Review results page

**Expected Results:**
- Video recorded and playable
- Analysis JSON generated with timeline events
- Aggregate scores displayed (0-100 range)
- Events detected for posture, gestures, gaze, movement

### 2. Posture Detection Test

**Goal:** Verify slouch detection accuracy

**Test Cases:**

| Action | Duration | Expected Detection |
|--------|----------|-------------------|
| Sit upright | 10s | `good_posture` events |
| Lean forward significantly | 5s | `slouched` event after 2s |
| Return to upright | 5s | `good_posture` events resume |

**Tune If:** False positives/negatives occur
- Adjust `SLOUCH_THRESHOLD` in `lib/body_language/metrics.ts` (default: 0.35)
- Higher value = more lenient (fewer slouch detections)
- Lower value = stricter (more slouch detections)

### 3. Gesture Detection Test

**Goal:** Verify hand movement and gesture recognition

**Test Cases:**

| Action | Expected Detection | Metadata |
|--------|-------------------|----------|
| Large two-hand gestures | `symmetric_gesture` | `intensity: high`, `symmetry > 0.7` |
| Single hand movement | `asymmetric_gesture` | `symmetry < 0.7` |
| Small repetitive hand movements | `fidgeting` | Detected after 5 movements in 10s |
| No movement | No gesture events | - |

**Tune If:** Too sensitive or not sensitive enough
- Adjust `GESTURE_THRESHOLD` in `lib/body_language/metrics.ts` (default: 0.08)
- Adjust `FIDGET_THRESHOLD` (default: 0.02)
- Adjust `FIDGET_COUNT_THRESHOLD` in `lib/body_language/event_detector.ts` (default: 5)

### 4. Gaze Detection Test

**Goal:** Verify head turn/looking away detection

**Test Cases:**

| Action | Duration | Expected Detection |
|--------|----------|-------------------|
| Look at camera | 10s | No `looked_away` events |
| Turn head left | 2s | `looked_away` with `direction: left` |
| Turn head right | 2s | `looked_away` with `direction: right` |
| Return to center | 5s | No events |

**Tune If:** Too sensitive to small head movements
- Adjust `LOOKING_AWAY_THRESHOLD` in `lib/body_language/metrics.ts` (default: 0.25)
- Higher value = more lenient (only detect large head turns)

### 5. Engagement Detection Test

**Goal:** Verify static vs dynamic period detection

**Test Cases:**

| Action | Duration | Expected Detection |
|--------|----------|-------------------|
| Sit completely still | 6s | `static_period` event |
| Move naturally/animated | 6s | `dynamic_period` event |
| Moderate movement | 6s | May detect neither (normal state) |

**Tune If:** Too many static/dynamic events
- Adjust `STATIC_MOVEMENT` threshold (default: 0.01)
- Adjust `DYNAMIC_MOVEMENT` threshold (default: 0.05)
- Adjust `WINDOW_SIZE` in `lib/body_language/event_detector.ts` (default: 5 seconds)

## Performance Testing

### Frame Processing Rate

Monitor the console output during recording:
```
Frames analyzed: [number]
```

**Expected:** ~10 frames per second (600 frames for 60-second recording)

**If Lower:**
- Check browser GPU acceleration is enabled
- Try in Chrome (best TensorFlow.js performance)
- Reduce `TARGET_FPS` in `lib/body_language/analyzer.ts`

### Memory Usage

For 5-10 minute recordings:
- Landmark data: ~1-2 MB
- Video file: ~15-25 MB
- Browser memory: Should remain stable

**If Memory Issues:**
- Reduce `videoBitsPerSecond` in `lib/video_recorder.ts`
- Implement progressive landmark processing

## Edge Cases to Test

### 1. Poor Lighting
- Record in dim lighting
- Verify keypoint detection rate > 70%
- Check `debug.keypoint_detection_rate` in results

### 2. Partial Body Visible
- Move partially off-screen
- Verify graceful handling (no crashes)
- Events should continue with visible keypoints

### 3. Multiple People
- Have someone walk behind you briefly
- System should focus on primary subject
- May cause temporary detection issues (expected)

### 4. Long Recordings (10+ minutes)
- Record a full 10-minute presentation
- Verify no memory leaks
- Check processing completes successfully

## Threshold Tuning Reference

All thresholds are in `lib/body_language/metrics.ts`:

```typescript
export const THRESHOLDS = {
  GOOD_POSTURE: 0.15,        // Good posture angle (radians)
  SLOUCH: 0.35,              // Slouch trigger angle
  GESTURE: 0.08,             // Gesture movement threshold
  FIDGET: 0.02,              // Small fidgeting movements
  LOOKING_AWAY: 0.25,        // Head turn ratio
  STATIC_MOVEMENT: 0.01,     // Very little movement
  DYNAMIC_MOVEMENT: 0.05,    // Engaged movement
  MIN_KEYPOINT_SCORE: 0.3,   // Minimum confidence
}
```

## Common Issues & Solutions

### Issue: Model fails to load
**Solution:** Check browser console for CORS errors. Ensure TensorFlow.js can access models.

### Issue: No events detected
**Solution:** 
1. Check keypoint detection rate in debug info
2. Verify camera shows your upper body clearly
3. Lower detection thresholds

### Issue: Too many false positives
**Solution:** Increase thresholds for stricter detection

### Issue: Video upload fails
**Solution:** 
1. Check storage directory exists and is writable
2. Verify API routes are accessible
3. Check browser console for errors

## Validating Results

Good analysis results should show:

1. **Posture Score:** 60-90 for normal posture
2. **Eye Contact Proxy:** 70-95 for good engagement
3. **Engagement Score:** 60-90 for animated presenting
4. **Gesture Frequency:** 3-8 per minute for natural gesturing
5. **Timeline Events:** 10-30 events for a 2-minute recording

## Next Steps After Testing

Once testing is complete and thresholds are tuned:

1. Remove old WebcamCapture component (not used anymore)
2. Add audio analysis module (future)
3. Implement slide detection (future)
4. Add LLM coaching feedback (future)
5. Deploy to production environment

## Debugging Tips

### Enable verbose logging
Add to analyzer initialization:
```typescript
console.log('Frame processed:', frame)
console.log('Events detected:', events)
```

### Export raw landmark data
In results page, add button to download `debug.landmark_snapshots`

### Visualize skeleton overlay
Uncomment BodyLanguageVisualizer in PresentationRecorder component

## Success Criteria

The feature is ready for production when:

- ✅ 90%+ recordings complete successfully
- ✅ Processing time < 20% of recording duration
- ✅ Detection rate > 80% in normal conditions
- ✅ No memory leaks in 10-minute recordings
- ✅ False positive rate < 20%
- ✅ User-visible events are meaningful and actionable

