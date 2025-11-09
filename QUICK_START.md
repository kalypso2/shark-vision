# 🚀 Quick Start Guide

## Your System is Ready!

You now have a **fully functional** body language analysis system with:
- ✅ Python backend (543 landmarks)
- ✅ MediaPipe Holistic initialized
- ✅ RAG system with research citations
- ✅ All tests passing

## Start Using It Now (2 Steps)

### Step 1: Start Python Backend

```bash
cd backend
source venv/bin/activate
python main.py
```

**Expected output:**
```
🦈 Shark Vision Python Backend Starting...
📊 MediaPipe Holistic: 543 landmarks
✅ Backend ready!
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 2: Start Next.js Frontend (New Terminal)

```bash
# In project root
npm run dev
```

**Expected output:**
```
✓ Ready in 2s
○ Local:   http://localhost:3000
```

## Test It!

1. **Visit**: http://localhost:3000
2. **Click**: "🐍 Python Analysis (543 Landmarks)"
3. **Grant webcam access**
4. **Click**: "Start Analysis"
5. **Present** for 30-60 seconds
6. **Click**: "Stop Analysis"
7. **View results** with RAG-enhanced coaching!

## What You'll See

### Real-Time (During Recording):
- **Posture score** updating live
- **Facial expressions** (smile, eyebrows) - NEW!
- **Hand shapes** (open palm, fist, pointing) - NEW!
- **Gaze direction** (forward, left, right)
- **Engagement** (static, moderate, dynamic)

### Results Page (After Recording):
- **Aggregate scores** for all metrics
- **Timeline** of events with timestamps
- **AI coaching** with research citations
- **Smile frequency** tracking (Python only)

## Troubleshooting

### "Backend not running"
```bash
cd backend
source venv/bin/activate
python main.py
```

### "WebSocket connection failed"
- Make sure backend is running at http://localhost:8000
- Check: `curl http://localhost:8000` should return JSON

### "No person detected"
- Move closer to camera
- Improve lighting
- Check webcam is working

## Testing Accuracy

Follow **TEST_CHECKLIST.md** for 5-minute validation:

```bash
# Quick validation:
# 1. Record perfect presentation (60s)
#    - Expected: All scores >70
# 
# 2. Record bad presentation (60s)
#    - Expected: All scores <50
#
# 3. Manual gesture count (make 5 gestures)
#    - Expected: System detects 4-6
```

## Optional: Add Gemini API Key

For AI coaching feedback:

```bash
cd backend
cp .env.example .env
# Edit .env and add:
GEMINI_API_KEY=your_key_here
```

Without API key, you'll still get full analysis, just generic coaching.

## What's Next?

- **Test metrics**: See TEST_CHECKLIST.md
- **Calibrate thresholds**: See TESTING_METHODOLOGY.md
- **Integrate with teammate**: Python backend ready for API calls
- **Deploy**: Both backends run independently

## Files You Need to Know

- **Start backend**: `backend/main.py`
- **Analysis page**: http://localhost:3000/analysis-python
- **Test script**: `backend/test_metrics.py`
- **Testing guide**: `TEST_CHECKLIST.md`
- **Full docs**: `TESTING_METHODOLOGY.md`

---

**You're all set! Start the backend, open your browser, and analyze your first presentation!** 🦈🎉
