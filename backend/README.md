# Shark Vision Python Backend

Real-time body language analysis with **MediaPipe Holistic** (543 landmarks) and **RAG-enhanced coaching**.

## Features

- **543 Landmarks**: 33 pose + 468 face + 42 hands (vs 17 in JavaScript version)
- **Real-Time WebSocket**: Stream video frames from browser, get instant analysis
- **Enhanced Detection**:
  - Precise facial expressions (smile, eyebrow raise, mouth openness)
  - Detailed hand gestures with finger tracking
  - Accurate eye gaze (actual eye landmarks, not nose proxy)
  - Better posture tracking (33 points vs 17)
- **RAG System**: Research-backed coaching with citations
- **FastAPI**: Modern, async Python web framework

## Quick Start

### 1. Setup

```bash
cd backend
chmod +x setup.sh
./setup.sh
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### 3. Run

```bash
source venv/bin/activate
python main.py
```

Server starts at: **http://localhost:8000**

## API Endpoints

### HTTP Endpoints

- `GET /` - Health check
- `GET /api/health` - Detailed health status
- `GET /api/sessions/{session_id}` - Retrieve saved analysis
- `GET /api/debug/knowledge-base` - View RAG knowledge base

### WebSocket Endpoint

- `WS /ws/analyze` - Real-time analysis stream

#### WebSocket Protocol:

**Client → Server (Video Frames):**
```
Binary: JPEG image data (10 FPS)
```

**Server → Client (Real-Time Updates):**
```json
{
  "type": "update",
  "frame": 123,
  "timestamp": 12.3,
  "metrics": {
    "posture": {"score": 85, "is_good": true},
    "facial": {"smile": 0.7, "eyebrow_raise": 0.2},
    "gesture": {"movement": 0.05, "symmetry": 0.8},
    "gaze": {"direction": "forward", "is_forward": true},
    "movement": {"amount": 0.012, "type": "dynamic"}
  },
  "events": [...]
}
```

**Server → Client (Final Analysis):**
```json
{
  "type": "final",
  "session_id": "session_1234567890",
  "analysis": {
    "aggregates": {...},
    "timeline": [...],
    "session_meta": {...}
  },
  "coaching": "**Strengths:**\n1. Your posture (82/100) meets professional standards...",
  "rag_context": {
    "definitions_used": 3,
    "benchmarks_used": 5,
    "techniques_recommended": 2
  }
}
```

## Architecture

```
┌─────────────┐         WebSocket          ┌──────────────────┐
│   Browser   │ ◄────────────────────────► │  FastAPI Server  │
│             │    JPEG frames (10 FPS)    │                  │
│  - Webcam   │    ───────────────────►    │  - MediaPipe     │
│  - Canvas   │    ◄───────────────────    │  - 543 Landmarks │
│  - Display  │    Analysis + Coaching     │  - RAG System    │
└─────────────┘                            └──────────────────┘
```

## Dependencies

- **fastapi** - Web framework
- **mediapipe** - Pose/face/hand detection (Google)
- **opencv-python** - Image processing
- **google-generativeai** - Gemini API for coaching
- **websockets** - Real-time communication
- **uvicorn** - ASGI server

## Development

### Run with Hot Reload

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Test MediaPipe Detector

```python
python -c "
from body_language.detector import HolisticDetector
import asyncio

async def test():
    detector = HolisticDetector()
    await detector.initialize()
    print('✓ MediaPipe Holistic loaded')
    print(f'✓ Pose landmarks: 33')
    print(f'✓ Face landmarks: 468')
    print(f'✓ Hand landmarks: 42')

asyncio.run(test())
"
```

### View RAG Knowledge Base

```bash
curl http://localhost:8000/api/debug/knowledge-base | python -m json.tool
```

## File Structure

```
backend/
├── main.py                   # FastAPI app + WebSocket handler
├── requirements.txt          # Python dependencies
├── setup.sh                  # Setup script
├── .env.example              # Environment template
│
├── body_language/           # Detection & analysis
│   ├── detector.py          # MediaPipe Holistic wrapper
│   └── analyzer.py          # Metrics calculation (543 landmarks)
│
├── rag/                     # RAG system (ported from TS)
│   ├── knowledge_base.py    # 24+ research entries
│   └── context_builder.py   # Intelligent retrieval
│
├── api/                     # API routes
│   └── coaching.py          # Gemini integration
│
└── utils/                   # Utilities
    ├── frame_processor.py   # JPEG decode/encode
    └── storage.py           # Session persistence
```

## MediaPipe Holistic vs MoveNet

| Feature | JavaScript (MoveNet) | Python (MediaPipe Holistic) |
|---------|---------------------|------------------------------|
| Pose Landmarks | 17 | 33 |
| Face Landmarks | 0 | 468 |
| Hand Landmarks | 0 (wrist only) | 42 (21 per hand) |
| **Total** | **17** | **543** |
| Facial Expressions | ❌ | ✅ |
| Finger Tracking | ❌ | ✅ |
| Precise Eye Gaze | ❌ (nose proxy) | ✅ (actual eyes) |
| Hand Shapes | ❌ | ✅ (open palm, fist, pointing) |

## Performance

- **Processing Speed**: ~50ms per frame with GPU
- **Target Frame Rate**: 10 FPS (100ms intervals)
- **Latency**: <100ms end-to-end (frame → landmarks → metrics → WebSocket)
- **GPU Acceleration**: Automatic with CUDA-capable GPU

## Troubleshooting

### Import Error: No module named 'mediapipe'

```bash
source venv/bin/activate
pip install -r requirements.txt
```

### WebSocket Connection Refused

Make sure server is running:
```bash
python main.py
```

Check that frontend connects to correct URL: `ws://localhost:8000/ws/analyze`

### Slow Processing (>200ms per frame)

- Enable GPU acceleration (MediaPipe auto-detects)
- Reduce frame quality in browser (lower JPEG quality)
- Process fewer frames (reduce to 5 FPS)

### GEMINI_API_KEY Error

```bash
# Add to .env file:
GEMINI_API_KEY=your_key_here
```

Or use fallback coaching (no API key needed).

## Next Steps

1. **Frontend Integration**: Update Next.js to connect via WebSocket
2. **Video Recording**: Save videos alongside analysis
3. **Batch Processing**: Analyze uploaded videos (not just webcam)
4. **Custom Models**: Fine-tune on presentation-specific data
5. **Multi-person**: Detect multiple speakers

## Resources

- [MediaPipe Holistic](https://google.github.io/mediapipe/solutions/holistic.html)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [WebSocket Protocol](https://websockets.spec.whatwg.org/)
- [Gemini API](https://ai.google.dev/docs)

