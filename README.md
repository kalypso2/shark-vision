# 🎯 Shark Vision - Unified Presentation Analysis System

**Real-time body language analysis + AI-powered slide content evaluation**

Combining MediaPipe Holistic (543 landmarks) with Gemini AI to provide comprehensive presentation feedback.

## ✨ Key Features

### 🎥 Body Language Analysis (Real-time)
- **543-landmark tracking** - Pose, face, and hand detection
- **Live status indicators** - Instant feedback on posture, eye contact, gestures
- **Facial expression analysis** - Smile detection, eyebrow raise, engagement
- **Video recording** - Saves presentation with timestamped events
- **AI coaching** - Research-backed feedback via RAG system

### 📊 Slide Content Analysis (Gemini AI)
- **Text clarity** - 6x6 rule compliance, readability, font size
- **Visual design** - Color contrast (4.5:1), hierarchy, whitespace
- **Content quality** - Message clarity, audience appropriateness
- **Overall impact** - Professionalism rating (0-10 scale)
- **Actionable suggestions** - Specific improvements for each issue

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- Webcam
- [Gemini API key](https://makersuite.google.com/app/apikey)

### 1. Backend Setup (Python)

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure API key
echo "GEMINI_API_KEY=your_key_here" > .env

# Start server
python main.py
# Runs on http://localhost:8000
```

### 2. Frontend Setup (Next.js)

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
# Runs on http://localhost:3000
```

### 3. Run Integration Tests

```bash
cd backend
source venv/bin/activate
python test_integration.py

# Expected output:
# ✅ PASS  Slide Analyzer
# ✅ PASS  Body Language
# ✅ PASS  Combined Analysis
# ✅ PASS  API Imports
```

## 📖 Usage

1. Navigate to http://localhost:3000
2. Click **"Presentation Analysis"**
3. Grant camera permissions
4. Click **"Start Analysis"**
5. Present for 10-30 seconds
6. Click **"Stop Analysis"**
7. View comprehensive results!

## 🏗️ Architecture

```
Shark Vision/
├── app/                        # Next.js frontend
│   ├── page.tsx               # Landing page
│   ├── analysis-python/       # Analysis UI
│   └── results-python/        # Results display
├── backend/
│   ├── main.py                # FastAPI server
│   ├── slide_analyzer.py      # NEW: Gemini slide analysis
│   ├── body_language/         # MediaPipe analysis
│   │   ├── detector.py        # 543-landmark detection
│   │   ├── analyzer.py        # Metric calculation
│   │   └── debug_logger.py    # Detailed diagnostics
│   ├── api/
│   │   ├── coaching.py        # RAG-based feedback
│   │   └── slide_analysis.py  # NEW: Slide endpoints
│   └── rag/                   # Research knowledge base
└── lib/
    └── websocket_client.ts    # Real-time connection
```

## 🔌 API Endpoints

### Body Language (WebSocket)
```javascript
// Connect
const ws = new WebSocket('ws://localhost:8000/ws/analyze');

// Send frame
ws.send(JSON.stringify({
  frame: "base64_jpeg",
  timestamp: 1.5
}));

// Receive live updates
{
  "live_status": {
    "posture": "good",
    "eye_contact": "forward",
    "gesture": "active",
    "smile": 0.85,
    "engagement": "engaged"
  }
}
```

### Slide Analysis (REST)
```bash
# Analyze a slide
curl -X POST http://localhost:8000/api/slide/analyze-frame \
  -F "image=@slide.jpg" \
  -F "timestamp=3.0"

# Response
{
  "overall_score": 7,
  "issues": [{
    "category": "Text Clarity",
    "issue": "Too much text",
    "severity": "high",
    "suggestion": "Apply 6x6 rule"
  }],
  "summary": "Slide is readable but overcrowded..."
}
```

## 📊 Output

### Body Language Metrics
- **Posture Score** (0-100): % of time with good posture
- **Eye Contact** (0-100): % of time looking forward
- **Gesture Quality** (0-100): % of time gesturing well
- **Smile Score** (0-100): % of time smiling
- **Engagement** (0-100): % of time engaged

### Slide Metrics
- **Overall Score** (0-10): Professional quality rating
- **Issues by Category**: Text, Design, Content, Impact
- **Severity Levels**: Critical, High, Medium, Low
- **Timestamped**: Each issue linked to exact moment

### Combined Report
- Video playback with synchronized timeline
- Timestamped body language events
- Timestamped slide issues
- AI coaching incorporating both analyses

## 🧪 Testing

```bash
# Run all tests
cd backend
source venv/bin/activate
python test_integration.py

# Test specific systems
python -m pytest test_metrics.py  # Body language
curl http://localhost:8000/api/slide/health  # Slide analysis
```

## 📚 Documentation

- **[INTEGRATION_COMPLETE.md](INTEGRATION_COMPLETE.md)** - Full integration guide
- **[backend/README.md](backend/README.md)** - Python backend docs
- **API Documentation**: http://localhost:8000/docs (when running)

## 🎓 How It Works

### Body Language Pipeline
1. **Capture** - WebSocket receives webcam frames
2. **Detect** - MediaPipe extracts 543 landmarks
3. **Analyze** - Calculate metrics (posture, gaze, gestures)
4. **Record** - Save video with CV2
5. **Coach** - Generate feedback using RAG + Gemini

### Slide Analysis Pipeline
1. **Upload** - Send slide image via REST API
2. **Process** - Gemini analyzes visual and textual content
3. **Evaluate** - Score across 4 categories
4. **Suggest** - Provide specific improvement recommendations
5. **Track** - Link issues to presentation timeline

## 🛠️ Development

```bash
# Frontend development
npm run dev

# Backend development (auto-reload)
cd backend
source venv/bin/activate
uvicorn main:app --reload

# Lint Python code
black backend/
```

## 📦 Dependencies

### Backend
- `fastapi` - Web framework
- `mediapipe` - Body language detection
- `google-generativeai` - Slide + coaching AI
- `opencv-python` - Video processing
- `websockets` - Real-time streaming

### Frontend
- `next` - React framework
- `typescript` - Type safety
- `react` - UI library

## 🤝 Contributing

This is a unified system combining:
- **Sam's work**: Body language analysis (sam branch)
- **Kyle's work**: Slide content analysis (main branch)

## 📄 License

MIT

## 🙏 Acknowledgments

- MediaPipe team for landmark detection
- Google for Gemini AI
- Research papers cited in `backend/rag/knowledge_base.py`

---

**Status**: ✅ Fully Integrated | **Version**: 2.0.0 | **Last Updated**: 2025-11-09
