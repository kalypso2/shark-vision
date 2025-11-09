# Shark Vision - Unified Presentation Analysis System

## 🎯 Integration Complete

This document describes the successful integration of **body language analysis** (sam branch) with **slide content analysis** (kyle-branch/main).

## 🏗️ Architecture

### Unified Backend (FastAPI)

```
backend/
├── main.py                    # FastAPI server with both systems
├── slide_analyzer.py          # Kyle's slide analysis (Gemini)
├── body_language/             # Sam's body language system (MediaPipe)
│   ├── detector.py
│   ├── analyzer.py
│   └── debug_logger.py
├── api/
│   ├── coaching.py            # Body language coaching (RAG + Gemini)
│   └── slide_analysis.py      # NEW: Slide analysis endpoints
└── rag/                       # Research-backed knowledge base
```

### Dual Analysis System

**1. Body Language Analysis (Real-time WebSocket)**
- **Endpoint**: `ws://localhost:8000/ws/analyze`
- **Technology**: MediaPipe Holistic (543 landmarks)
- **Metrics**: 
  - Posture quality
  - Eye contact
  - Gesture quality
  - Facial expressions (smile, eyebrow raise)
  - Engagement score
- **Output**: Live status indicators + final aggregate scores + timestamped events

**2. Slide Content Analysis (HTTP REST)**
- **Endpoint**: `POST http://localhost:8000/api/slide/analyze-frame`
- **Technology**: Gemini 2.0 Flash
- **Metrics**:
  - Text Clarity (6x6 rule, readability)
  - Visual Design (color, contrast, hierarchy)
  - Content Quality (message clarity)
  - Overall Impact (professionalism)
- **Output**: Overall score (0-10) + specific issues with severity + suggestions

## 📡 API Endpoints

### Body Language (WebSocket)
```python
# Connect to WebSocket
ws://localhost:8000/ws/analyze

# Send frame for analysis
{
  "frame": "base64_encoded_jpeg",
  "timestamp": 1.5  # seconds
}

# Receive live updates
{
  "live_status": {
    "posture": "good",
    "eye_contact": "forward",
    "gesture": "active",
    "smile": 0.85,
    "engagement": "engaged"
  },
  "timestamp": 1.5
}
```

### Slide Analysis (REST)
```python
# Analyze a slide/board
POST /api/slide/analyze-frame
Content-Type: multipart/form-data

image: [file upload]
timestamp: 3.0 (optional)
session_id: "abc123" (optional)

# Response
{
  "overall_score": 7,
  "issues": [
    {
      "category": "Text Clarity",
      "issue": "Too much text on slide",
      "severity": "high",
      "suggestion": "Apply 6x6 rule: max 6 words per line"
    }
  ],
  "summary": "Slide is readable but overcrowded...",
  "timestamp": 3.0
}
```

### Health Check
```bash
GET /api/slide/health
# Returns: {"status": "healthy", "gemini_configured": true}
```

## 🎬 Usage Flow

### For Live Presentations
1. **Start body language analysis** via WebSocket
2. **Optionally analyze slides** via REST API every 3-5 seconds
3. Receive real-time feedback for both body language and slide quality
4. At end: Get comprehensive report combining both analyses

### Frontend Integration Example
```typescript
// 1. Connect WebSocket for body language
const ws = new WebSocket('ws://localhost:8000/ws/analyze');

// 2. Stream video frames for body language
ws.send(JSON.stringify({
  frame: captureFrame(),
  timestamp: getCurrentTime()
}));

// 3. Analyze slides periodically
if (timeToAnalyzeSlide()) {
  const formData = new FormData();
  formData.append('image', captureSlide());
  formData.append('timestamp', getCurrentTime());
  
  fetch('http://localhost:8000/api/slide/analyze-frame', {
    method: 'POST',
    body: formData
  }).then(res => res.json())
    .then(analysis => displaySlideIssues(analysis));
}
```

## 📊 Combined Analysis Output

**Final Report Structure:**
```json
{
  "session_id": "1762661234567",
  "duration": 120.5,
  
  "body_language": {
    "aggregates": {
      "posture_score": 82,
      "eye_contact_proxy": 75,
      "gesture_quality": 88,
      "smile_score": 65,
      "engagement_score": 79
    },
    "timeline": [
      {"timestamp": 5.2, "type": "posture", "subtype": "slouching"},
      {"timestamp": 15.7, "type": "gaze", "subtype": "looking_down"}
    ],
    "video_path": "storage/session_1762661234567.mp4",
    "coaching": "AI-generated personalized feedback..."
  },
  
  "slide_analysis": {
    "frames_analyzed": 24,
    "average_score": 7.2,
    "total_issues": 8,
    "issues_by_category": {
      "Text Clarity": 3,
      "Visual Design": 2,
      "Content Quality": 2,
      "Overall Impact": 1
    },
    "timestamped_issues": [
      {
        "timestamp": 3.0,
        "overall_score": 6,
        "issues": [
          {
            "category": "Text Clarity",
            "issue": "Font size too small",
            "severity": "high",
            "suggestion": "Increase font to minimum 24pt"
          }
        ]
      }
    ]
  }
}
```

## 🚀 Setup Instructions

### 1. Backend Setup
```bash
cd backend

# Activate virtual environment
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies (already includes google-generativeai)
pip install -r requirements.txt

# Set environment variables
echo "GEMINI_API_KEY=your_key_here" > .env

# Start server
python main.py
# Server runs on http://localhost:8000
```

### 2. Frontend Setup
```bash
# Install dependencies
npm install

# Start Next.js dev server
npm run dev
# Frontend runs on http://localhost:3000
```

### 3. Test the Integration
```bash
# 1. Navigate to body language analysis page
http://localhost:3000/analysis-python

# 2. Start recording - body language analysis begins
# 3. Optionally test slide analysis:
curl -X POST http://localhost:8000/api/slide/analyze-frame \
  -F "image=@test_slide.jpg" \
  -F "timestamp=3.0"
```

## 🎓 Key Benefits

1. **Comprehensive Feedback**: Analyzes both presenter (body language) and content (slides)
2. **Real-time Insights**: Immediate feedback during presentation
3. **Evidence-Based**: RAG system grounds coaching in research
4. **Timestamped**: Every issue pinpointed to exact moment
5. **Actionable**: Specific suggestions for improvement
6. **Unified Backend**: Single FastAPI server handles both analyses

## 📝 Next Steps

### Frontend Enhancements
- [ ] Add slide upload/capture UI to analysis page
- [ ] Display slide issues alongside body language metrics
- [ ] Create unified results page showing both analyses
- [ ] Add toggle to enable/disable slide analysis

### Backend Enhancements
- [ ] Batch slide analysis endpoint
- [ ] Combined coaching that incorporates both analyses
- [ ] Session management for multi-frame slide analysis
- [ ] Export combined report as PDF

### Future Features
- [ ] Automatic slide detection from webcam
- [ ] Slide synchronization with body language timeline
- [ ] Comparative analytics across multiple presentations
- [ ] AI suggestions for slide improvements

## 🐛 Troubleshooting

**Issue**: Gemini not configured
- **Solution**: Ensure `GEMINI_API_KEY` is in `backend/.env`

**Issue**: Slide analysis returns error
- **Solution**: Check image format (JPEG/PNG), file size < 10MB

**Issue**: Body language and slide timestamps don't align
- **Solution**: Use same timestamp source for both systems

## 📚 References

- **Body Language Analysis**: `backend/body_language/`
- **RAG System**: `backend/rag/`
- **Slide Analysis**: `backend/slide_analyzer.py`
- **API Routes**: `backend/api/slide_analysis.py`
- **Frontend**: `app/analysis-python/page.tsx`

---

**Status**: ✅ Integration Complete
**Version**: 2.0.0
**Last Updated**: 2025-11-09

