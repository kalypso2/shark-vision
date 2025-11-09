# Shark Vision - AI Presentation Coach

An AI-powered presentation grading system with real-time body language analysis.

## Features

### Current (Body Language Analysis)

- ✅ Real-time pose detection using TensorFlow.js MoveNet
- ✅ Posture quality analysis
- ✅ Hand gesture and movement tracking
- ✅ Eye contact proxy (gaze direction)
- ✅ Engagement scoring
- ✅ Fidgeting detection
- ✅ Video recording with WebRTC
- ✅ Comprehensive analysis results with timeline
- ✅ Client-side processing (no data sent to external servers)

### Future Roadmap

- 🔲 Audio/speech analysis
- 🔲 Slide change detection
- 🔲 LLM-based coaching feedback
- 🔲 Multi-session comparison
- 🔲 Export presentation reports

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **AI/ML:** TensorFlow.js, MoveNet Lightning
- **Video:** WebRTC, MediaRecorder API
- **Styling:** CSS-in-JS (inline styles)
- **Storage:** Local filesystem (future: cloud storage)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Modern browser with WebRTC support (Chrome recommended)
- Webcam access

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd shark-vision
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open http://localhost:3000 in your browser

## Project Structure

```
shark-vision/
├── app/
│   ├── api/
│   │   └── presentations/        # API routes for upload/retrieval
│   ├── analysis/                 # Recording page
│   ├── results/[sessionId]/      # Results page
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Home page
│   └── globals.css               # Global styles
│
├── components/
│   ├── PresentationRecorder.tsx  # Main recording component
│   ├── BodyLanguageVisualizer.tsx # Skeleton overlay
│   └── AnalysisResults.tsx       # Results display
│
├── lib/
│   ├── body_language/
│   │   ├── analyzer.ts           # Main orchestrator
│   │   ├── pose_detector.ts      # TensorFlow.js wrapper
│   │   ├── event_detector.ts     # Rule-based detection
│   │   ├── metrics.ts            # Metric calculations
│   │   └── types.ts              # TypeScript interfaces
│   ├── video_recorder.ts         # MediaRecorder wrapper
│   └── storage.ts                # File system utilities
│
└── storage/                      # Git-ignored
    └── presentations/
        └── [sessionId]/
            ├── video.webm
            └── analysis.json
```

## Usage

### Recording a Presentation

1. Navigate to `/analysis`
2. Click "Start Webcam" and grant permissions
3. Click "Start Recording"
4. Present naturally for 1-5 minutes
5. Click "Stop Recording"
6. Wait for processing (~10 seconds per minute of video)
7. View results with aggregate scores and timeline

### Understanding Results

**Aggregate Scores (0-100):**
- **Posture Score:** Time spent in good posture vs slouching
- **Eye Contact Proxy:** Time spent looking at camera vs away
- **Engagement Score:** Dynamic vs static movement periods
- **Gesture Quality:** Symmetric, natural gestures score higher

**Timeline Events:**
- **Posture:** `good_posture`, `slouched`
- **Gesture:** `symmetric_gesture`, `asymmetric_gesture`, `fidgeting`
- **Gaze:** `looked_away` (with direction)
- **Movement:** `static_period`, `dynamic_period`

## Configuration

### Detection Thresholds

Adjust in `lib/body_language/metrics.ts`:

```typescript
export const THRESHOLDS = {
  GOOD_POSTURE: 0.15,        // ~8.5 degrees from vertical
  SLOUCH: 0.35,              // ~20 degrees (triggers slouch)
  GESTURE: 0.08,             // 8% of frame height
  FIDGET: 0.02,              // Small movements
  LOOKING_AWAY: 0.25,        // 25% offset from center
  STATIC_MOVEMENT: 0.01,     // Very still
  DYNAMIC_MOVEMENT: 0.05,    // Animated
}
```

### Frame Processing

Adjust in `lib/body_language/analyzer.ts`:

```typescript
private readonly TARGET_FPS = 10  // Process 10 frames/second
```

### Video Quality

Adjust in `lib/video_recorder.ts`:

```typescript
videoBitsPerSecond: 2500000  // 2.5 Mbps
```

## Testing

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for comprehensive testing instructions.

Quick test:
```bash
npm run dev
# Navigate to http://localhost:3000/analysis
# Record a 30-second test presentation
# Verify results display correctly
```

## Performance

- **Frame Processing:** ~10 FPS (100ms per frame)
- **Memory Usage:** ~1-2 MB landmark data per 10 minutes
- **Video Size:** ~15-20 MB per 10 minutes at 2.5 Mbps
- **Browser Support:** Chrome (best), Firefox, Safari, Edge

## Future Integration Points

### Audio Analysis
```typescript
// lib/audio_analyzer.ts
export function analyzeAudio(audioBlob: Blob): AudioAnalysis {
  // Detect speech rate, pauses, filler words
  return { timeline, aggregates }
}
```

### Slide Detection
```typescript
// lib/slide_detector.ts
export function detectSlideChanges(videoFrames: ImageData[]): SlideEvent[] {
  // Compare frames, detect transitions
  return slideChanges
}
```

### LLM Coaching
```typescript
// app/api/coaching/route.ts
export async function POST(analysis: BodyLanguageAnalysis) {
  // Send to GPT-4, get feedback
  return { strengths, improvements, score }
}
```

## Troubleshooting

### Model fails to load
- Check browser console for TensorFlow.js errors
- Ensure WebGL is enabled in browser
- Try Chrome for best compatibility

### Poor detection accuracy
- Ensure good lighting
- Position camera to show upper body clearly
- Sit 2-3 feet from camera
- Check `keypoint_detection_rate` in debug info

### Video upload fails
- Verify storage directory exists and is writable
- Check file size limits in API routes
- Review browser console for errors

## Contributing

This is currently a solo development project. Future contributions guidelines will be added.

## License

MIT

## Architecture Notes

### Why Client-Side Processing?

1. **Privacy:** Video never leaves the user's device during analysis
2. **Speed:** No network latency for video upload
3. **Cost:** No server compute costs for ML inference
4. **Scalability:** Processing scales with users' devices

### Why MoveNet Lightning?

1. **Performance:** Runs at 30+ FPS in browser
2. **Accuracy:** Optimized for single-person detection
3. **Size:** Lightweight model (~6 MB)
4. **Browser Support:** Works with TensorFlow.js WebGL backend

### Design Decisions

- **Rule-based detection** over ML: Easier to understand, tune, and debug
- **Event timeline** over frame-by-frame: More actionable feedback
- **Aggregate scores**: Provides high-level overview
- **Local storage**: Simple, no database setup required
- **Modular architecture**: Easy to add audio/slide analysis later

## Acknowledgments

- TensorFlow.js team for MoveNet model
- Next.js team for excellent framework
- Google MediaPipe for pose detection research
