# Python Migration Plan: Real-Time MediaPipe Holistic + RAG

## Architecture Overview

```
┌─────────────┐          WebSocket/WebRTC          ┌──────────────────┐
│   Browser   │ ◄────────────────────────────────► │  Python Backend  │
│  (Next.js)  │      Video Frames (Real-Time)      │   FastAPI/Flask  │
│             │ ◄────────────────────────────────► │                  │
│  - Webcam   │        Analysis Results            │  - MediaPipe     │
│  - UI       │                                     │  - RAG System    │
│  - Display  │                                     │  - GPU Accel     │
└─────────────┘                                     └──────────────────┘
```

## Why This Architecture Works

1. **Browser captures webcam** (getUserMedia API - same as now)
2. **Streams frames to Python backend** via WebSocket
3. **Python processes with MediaPipe Holistic** (543 landmarks)
4. **Returns analysis in real-time** back to browser
5. **RAG system in Python** generates coaching with research citations

## Technology Stack

### Frontend (Keep Next.js)
- React for UI
- WebSocket client for real-time communication
- Canvas for video display and skeleton overlay

### Backend (New Python)
- **FastAPI**: Modern async Python framework (perfect for WebSockets)
- **MediaPipe Holistic**: 543 landmarks (pose + face + hands)
- **OpenCV**: Video frame processing
- **WebSocket**: Real-time bidirectional communication
- **Google Generative AI (Gemini)**: Same as current, Python SDK
- **RAG System**: Port TypeScript knowledge base to Python

## Implementation Steps

### Phase 1: Python Backend Core (Days 1-2)
```python
# Stack:
- FastAPI (async web framework)
- mediapipe (pose/face/hand detection)
- opencv-python (frame processing)
- websockets (real-time communication)
- google-generativeai (Gemini API)
- numpy, pandas (data processing)
```

### Phase 2: Real-Time Video Pipeline (Day 3)
```
Browser → Capture frame → Compress to JPEG → WebSocket →
Python → Decode → MediaPipe → Extract 543 landmarks →
Calculate metrics → Detect events → WebSocket back →
Browser → Display results + skeleton overlay
```

### Phase 3: RAG System in Python (Day 4)
```python
# Port TypeScript knowledge base:
knowledge_base = [
    {
        "id": "gesture_bench_1",
        "type": "benchmark",
        "category": "gesture",
        "content": "Effective speakers use 3-8 gestures/min",
        "source": "GestureLens",
        "quantitative_data": {...}
    },
    # ... 24+ entries
]

# Context builder with same logic
def build_context(analysis):
    # Identify problem areas
    # Retrieve relevant research
    # Build comparisons
    # Return formatted context
```

### Phase 4: Enhanced Metrics with 543 Landmarks (Day 5)
```python
# NEW capabilities with MediaPipe Holistic:

1. Detailed Facial Expressions:
   - Eye openness (squinting, wide eyes)
   - Eyebrow position (raised, furrowed)
   - Mouth shape (smiling, frowning, open/closed)
   - Head tilt precision

2. Hand Gestures:
   - Individual finger positions
   - Open palm vs closed fist
   - Pointing gestures
   - Hand shapes (thumbs up, OK sign)

3. Enhanced Posture:
   - 33 body points (vs 17)
   - More precise spine curvature
   - Detailed shoulder position

4. Precise Eye Gaze:
   - Actual eye landmarks (not nose proxy)
   - Left vs right eye direction
   - Pupil tracking
```

## File Structure

```
shark-vision/
├── frontend/                 # Next.js (keep existing)
│   ├── app/
│   ├── components/
│   └── lib/
│       └── websocket_client.ts  # NEW: WebSocket connection
│
├── backend/                  # NEW: Python backend
│   ├── main.py              # FastAPI app + WebSocket
│   ├── requirements.txt     # Python dependencies
│   │
│   ├── body_language/       # Detection & analysis
│   │   ├── detector.py      # MediaPipe Holistic wrapper
│   │   ├── metrics.py       # Calculate body language metrics
│   │   ├── events.py        # Event detection
│   │   └── types.py         # Type definitions
│   │
│   ├── rag/                 # RAG system (ported)
│   │   ├── knowledge_base.py
│   │   ├── context_builder.py
│   │   └── threshold_calibration.py
│   │
│   ├── api/                 # API routes
│   │   ├── websocket.py     # Real-time analysis
│   │   ├── coaching.py      # Gemini coaching
│   │   └── storage.py       # Save/retrieve sessions
│   │
│   └── utils/
│       ├── frame_processor.py
│       └── video_recorder.py
│
└── storage/                 # Shared storage
    ├── videos/
    └── analysis/
```

## Performance Considerations

### Frame Rate Strategy:
```python
# Browser sends: 10 FPS (100ms intervals)
# Python processes: Async, non-blocking
# Response time: <50ms per frame with GPU

# For 60-second presentation:
# Frames: 600
# Landmarks per frame: 543
# Total data points: 325,800 (vs current 10,200)
```

### WebSocket Optimization:
```python
# Compress frames before sending (JPEG quality: 80%)
# Send only changed regions (motion detection)
# Batch responses if processing falls behind
# Use binary protocol for efficiency
```

### GPU Acceleration:
```python
# MediaPipe uses TensorFlow Lite with GPU delegation
# 5-10x faster than CPU
# Process multiple frames in parallel
```

## Migration Strategy

### Option A: Gradual Migration (Safer)
1. Build Python backend alongside existing Next.js
2. Add feature flag to switch between JS and Python
3. Test both in parallel
4. Cut over when Python is stable

### Option B: Fresh Start (Faster)
1. Build Python backend from scratch
2. Keep Next.js frontend (update WebSocket client)
3. Deploy Python backend
4. Point frontend to new backend

## Code Examples

### Backend: FastAPI + WebSocket
```python
# backend/main.py
from fastapi import FastAPI, WebSocket
from body_language.detector import HolisticDetector
from rag.context_builder import build_context
import cv2
import numpy as np

app = FastAPI()
detector = HolisticDetector()

@app.websocket("/ws/analyze")
async def analyze_stream(websocket: WebSocket):
    await websocket.accept()
    session = AnalysisSession()
    
    try:
        while True:
            # Receive frame from browser
            frame_data = await websocket.receive_bytes()
            frame = decode_frame(frame_data)
            
            # Process with MediaPipe Holistic
            results = detector.process(frame)
            
            # Extract 543 landmarks
            landmarks = {
                'pose': results.pose_landmarks,      # 33 points
                'face': results.face_landmarks,      # 468 points
                'left_hand': results.left_hand_landmarks,   # 21 points
                'right_hand': results.right_hand_landmarks, # 21 points
            }
            
            # Calculate metrics
            metrics = calculate_metrics(landmarks)
            
            # Detect events
            events = session.detect_events(metrics)
            
            # Send back results
            await websocket.send_json({
                'landmarks': landmarks,
                'metrics': metrics,
                'events': events,
                'timestamp': session.elapsed_time
            })
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        # Generate final analysis + coaching
        analysis = session.finalize()
        rag_context = build_context(analysis)
        coaching = generate_coaching(analysis, rag_context)
        
        await websocket.send_json({
            'type': 'final',
            'analysis': analysis,
            'coaching': coaching
        })
```

### Frontend: WebSocket Client
```typescript
// frontend/lib/websocket_client.ts
export class AnalysisWebSocket {
  private ws: WebSocket | null = null
  private videoRef: HTMLVideoElement
  
  async connect() {
    this.ws = new WebSocket('ws://localhost:8000/ws/analyze')
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      if (data.type === 'final') {
        this.handleFinalResults(data)
      } else {
        this.handleRealtimeUpdate(data)
      }
    }
  }
  
  async streamVideo() {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    
    // Capture frame every 100ms (10 FPS)
    setInterval(() => {
      if (!this.videoRef || !this.ws) return
      
      // Draw video frame to canvas
      canvas.width = this.videoRef.videoWidth
      canvas.height = this.videoRef.videoHeight
      ctx.drawImage(this.videoRef, 0, 0)
      
      // Convert to JPEG and send
      canvas.toBlob((blob) => {
        if (blob && this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(blob)
        }
      }, 'image/jpeg', 0.8)
    }, 100) // 10 FPS
  }
}
```

### Backend: MediaPipe Holistic Detector
```python
# backend/body_language/detector.py
import mediapipe as mp
import cv2
import numpy as np

class HolisticDetector:
    def __init__(self):
        self.holistic = mp.solutions.holistic.Holistic(
            static_image_mode=False,
            model_complexity=2,  # Highest accuracy
            enable_segmentation=False,
            refine_face_landmarks=True,  # Extra precision for face
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
    
    def process(self, frame: np.ndarray):
        """
        Process frame and return 543 landmarks:
        - 33 pose landmarks
        - 468 face landmarks
        - 21 left hand landmarks
        - 21 right hand landmarks
        """
        # Convert BGR to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process with MediaPipe
        results = self.holistic.process(rgb_frame)
        
        return {
            'pose': self._extract_landmarks(results.pose_landmarks),
            'face': self._extract_landmarks(results.face_landmarks),
            'left_hand': self._extract_landmarks(results.left_hand_landmarks),
            'right_hand': self._extract_landmarks(results.right_hand_landmarks),
        }
    
    def _extract_landmarks(self, landmarks):
        if not landmarks:
            return None
        
        return [
            {
                'x': lm.x,
                'y': lm.y,
                'z': lm.z,
                'visibility': getattr(lm, 'visibility', 1.0)
            }
            for lm in landmarks.landmark
        ]
```

### Backend: RAG System (Ported)
```python
# backend/rag/knowledge_base.py
from typing import List, Dict, Optional
from dataclasses import dataclass

@dataclass
class QuantitativeData:
    metric: str
    value: float
    unit: str
    range: Optional[tuple[float, float]]
    context: str

@dataclass
class KnowledgeEntry:
    id: str
    type: str  # 'definition' | 'benchmark' | 'technique' | 'research_finding'
    category: str  # 'posture' | 'gesture' | 'eye_contact' | 'movement' | 'engagement'
    content: str
    source: str
    quantitative_data: Optional[QuantitativeData] = None

KNOWLEDGE_BASE: List[KnowledgeEntry] = [
    KnowledgeEntry(
        id='gesture_bench_1',
        type='benchmark',
        category='gesture',
        content='Effective speakers use 3-8 deliberate gestures per minute.',
        source='GestureLens: Visual Analysis of Gestures in Presentation Videos',
        quantitative_data=QuantitativeData(
            metric='gesture_frequency',
            value=5.5,
            unit='per_minute',
            range=(3, 8),
            context='effective presenters'
        )
    ),
    # ... all 24+ entries ported from TypeScript
]

def get_knowledge_by_category(category: str) -> List[KnowledgeEntry]:
    return [e for e in KNOWLEDGE_BASE if e.category == category]

def get_benchmarks() -> List[KnowledgeEntry]:
    return [e for e in KNOWLEDGE_BASE if e.quantitative_data is not None]
```

## Timeline

- **Day 1**: Set up Python backend structure, MediaPipe Holistic integration
- **Day 2**: WebSocket real-time pipeline, frame processing
- **Day 3**: Port RAG system to Python
- **Day 4**: Enhanced metrics using 543 landmarks
- **Day 5**: Testing, optimization, deployment

## Next Steps

1. ✅ I can create the Python backend structure
2. ✅ Set up MediaPipe Holistic with WebSocket
3. ✅ Port RAG knowledge base to Python
4. ✅ Update frontend to connect via WebSocket
5. ✅ Deploy and test

Ready to start implementation?

