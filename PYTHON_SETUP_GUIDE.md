# Python Backend Setup Guide

## ✅ What You Now Have

I've created a complete **Python backend** with:

1. **MediaPipe Holistic**: 543 landmarks (33 pose + 468 face + 42 hands)
2. **Real-time WebSocket**: Stream from browser, get instant analysis
3. **Enhanced Detection**:
   - Facial expressions (smiling, eyebrow raises)
   - Individual finger tracking
   - Precise eye gaze (actual eye landmarks)
   - Better posture (33 points vs 17)
4. **RAG System**: Fully ported with all research citations
5. **FastAPI**: Modern async Python web framework

## 🚀 How to Run It

### Step 1: Set Up Python Backend

```bash
cd /Users/samebaugh/shark-vision/backend
chmod +x setup.sh
./setup.sh
```

This will:
- Create a Python virtual environment
- Install all dependencies (MediaPipe, FastAPI, Gemini, etc.)

### Step 2: Configure API Key

```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### Step 3: Start Python Server

```bash
source venv/bin/activate
python main.py
```

Server runs at: **http://localhost:8000**

Test it: http://localhost:8000

### Step 4: Test the Backend

Visit http://localhost:8000 - you should see:
```json
{
  "status": "running",
  "backend": "python",
  "version": "2.0.0",
  "features": {
    "landmarks": 543,
    "pose_points": 33,
    "face_points": 468,
    "hand_points": 42,
    "rag_system": true,
    "real_time": true
  }
}
```

## 🔌 Frontend Integration (Next Step)

Your Next.js frontend needs to connect to the Python backend via WebSocket.

### Option 1: Update Existing Frontend

I can update your `/app/analysis/page.tsx` to:
- Connect to `ws://localhost:8000/ws/analyze`
- Stream webcam frames (10 FPS)
- Receive real-time analysis
- Display 543 landmarks instead of 17

### Option 2: Create New Analysis Page

Create `/app/analysis-v2/page.tsx` that uses Python backend while keeping the JavaScript version accessible.

### What Needs to Change:

**Current (JavaScript):**
```typescript
// Client-side TensorFlow.js
const analyzer = new BodyLanguageAnalyzer()
await analyzer.loadModel()
const results = await analyzer.process(frame)
```

**New (Python WebSocket):**
```typescript
// Connect to Python backend
const ws = new WebSocket('ws://localhost:8000/ws/analyze')

// Send frames
canvas.toBlob((blob) => {
  ws.send(blob) // Send JPEG
}, 'image/jpeg', 0.8)

// Receive analysis
ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  if (data.type === 'update') {
    // Real-time metrics with 543 landmarks
    displayMetrics(data.metrics)
  } else if (data.type === 'final') {
    // Complete analysis + RAG coaching
    showResults(data.analysis, data.coaching)
  }
}
```

## 📊 What's Different with Python?

### More Landmarks

| Detection | JavaScript | Python |
|-----------|-----------|---------|
| Pose | 17 keypoints | 33 keypoints |
| Face | 0 | 468 landmarks |
| Hands | 4 wrists | 42 finger landmarks |
| **Total** | **17** | **543** |

### New Capabilities

**Facial Expressions (NEW):**
```python
{
  "facial": {
    "smile": 0.8,           # 0-1 scale
    "eyebrow_raise": 0.3,   # Emphasis detection
    "mouth_open": 0.5       # Speaking indicator
  }
}
```

**Hand Shapes (NEW):**
```python
{
  "gesture": {
    "hand_shapes": {
      "left": "open_palm",   # open_palm, fist, pointing
      "right": "gesture"
    }
  }
}
```

**Precise Eye Gaze (NEW):**
```python
{
  "gaze": {
    "direction": "forward",
    "is_forward": true,
    "method": "precise_eye_tracking"  # Not nose proxy!
  }
}
```

## 🧪 Testing the Backend

### Test 1: Health Check

```bash
curl http://localhost:8000
```

Should return status with 543 landmarks.

### Test 2: View RAG Knowledge Base

```bash
curl http://localhost:8000/api/debug/knowledge-base
```

Should show 24+ research entries.

### Test 3: WebSocket Connection

```bash
# Install websocat (WebSocket client)
brew install websocat

# Connect to WebSocket
websocat ws://localhost:8000/ws/analyze
```

## 🎯 Next Steps

### Immediate:
1. ✅ Python backend created
2. ✅ RAG system ported
3. ⏳ Test backend (run `python main.py`)
4. ⏳ Update frontend to use WebSocket
5. ⏳ Test end-to-end with webcam

### Future Enhancements:
1. **Video Upload**: Process pre-recorded videos (not just webcam)
2. **Batch Analysis**: Analyze multiple presentations
3. **Custom Training**: Fine-tune models on your data
4. **Multi-person**: Detect multiple speakers
5. **Export Reports**: PDF/CSV export of analysis

## 📁 File Structure

```
shark-vision/
├── frontend/                 # Next.js (existing)
│   ├── app/
│   ├── components/
│   └── lib/
│
├── backend/                  # NEW: Python backend
│   ├── main.py              # FastAPI app
│   ├── requirements.txt     # Dependencies
│   ├── setup.sh             # Setup script
│   │
│   ├── body_language/       # MediaPipe Holistic
│   │   ├── detector.py      # 543 landmarks
│   │   └── analyzer.py      # Enhanced metrics
│   │
│   ├── rag/                 # RAG system
│   │   ├── knowledge_base.py
│   │   └── context_builder.py
│   │
│   ├── api/
│   │   └── coaching.py      # Gemini integration
│   │
│   └── utils/
│       ├── frame_processor.py
│       └── storage.py
│
└── storage/                 # Shared storage
    ├── videos/
    └── analysis/
```

## ❓ Questions?

### Do I need to rewrite the entire frontend?

No! You can:
- Keep the Next.js frontend
- Just update WebSocket connection
- Minimal changes to UI components

### Can I run both JavaScript and Python?

Yes! Run them on different ports:
- Python: `http://localhost:8000`
- Next.js: `http://localhost:3000`
- Choose which one to use

### Will this work with my teammate's Python code?

Yes! You can:
- Merge backends into one FastAPI app
- Or keep separate and call each other's APIs
- Both use Python, easier to integrate

## 🚨 Common Issues

### "ModuleNotFoundError: No module named 'mediapipe'"

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### "Address already in use"

Another process is using port 8000:
```bash
lsof -ti:8000 | xargs kill -9
python main.py
```

### "GEMINI_API_KEY not set"

Create `.env` file:
```bash
cd backend
cp .env.example .env
# Edit .env and add your key
```

## 🎉 Ready to Go!

Your Python backend is complete and ready to run. The system now has:
- ✅ 543 landmarks (vs 17)
- ✅ Facial expression detection
- ✅ Finger tracking
- ✅ Precise eye gaze
- ✅ RAG system with research citations
- ✅ Real-time WebSocket streaming

Run `cd backend && ./setup.sh && python main.py` to start!

