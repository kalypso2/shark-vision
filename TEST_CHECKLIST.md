# Quick Test Checklist

## 🚀 Before You Start

1. [ ] Python backend running at http://localhost:8000
2. [ ] Next.js frontend running at http://localhost:3000
3. [ ] Webcam connected and working
4. [ ] Good lighting (face clearly visible)

## ✅ 5-Minute Validation Protocol

### Test 1: Perfect Presentation (60 seconds)
**What to do:**
- Good posture (shoulders back, spine straight)
- Look at camera 90% of time
- Make 5 symmetric hand gestures (both hands)
- Keep torso moving subtly
- Smile 3-4 times

**Expected Results:**
```
✅ Posture: 75-85
✅ Eye Contact: 85-95
✅ Gesture Quality: >60
✅ Gesture Frequency: 5/min
✅ Engagement: 70-90
✅ Smile Frequency: 3-4/min (Python only)
```

**If scores are in range → System is accurate** ✅

---

### Test 2: Bad Presentation (60 seconds)
**What to do:**
- Slouch deliberately
- Look away frequently
- No hand gestures
- Stand completely still
- No facial expressions

**Expected Results:**
```
✅ All scores: <50
✅ Timeline: Multiple negative events
✅ Coaching: Identifies all problems
```

**If all scores are low → System detects problems** ✅

---

### Test 3: Gesture Count Validation (60 seconds)
**What to do:**
- Count in your head: Make exactly 5 hand gestures
- Use both hands symmetrically
- Clear, deliberate movements

**Expected Results:**
```
✅ System detects: 4-6 gestures
✅ Gesture Frequency: ~5/min
✅ Manual count ±1 of system count
```

**If within ±1 → Gesture detection is accurate** ✅

---

### Test 4: Gaze Tracking (60 seconds)
**What to do:**
- Look at camera (20s)
- Look left (10s)
- Look at camera (20s)
- Look right (10s)

**Expected Results:**
```
✅ Eye Contact: ~66 (40s forward / 60s total)
✅ Timeline: 2 "looking_away" events
✅ Directions: "left" and "right"
```

**If events match your actions → Gaze tracking works** ✅

---

### Test 5: Facial Expressions - Python Only (60 seconds)
**What to do:**
- Neutral face (15s)
- Smile (15s)
- Neutral (15s)
- Smile (15s)

**Expected Results:**
```
✅ Real-time: smile value ~0 → ~0.8 → ~0 → ~0.8
✅ Smile Frequency: ~2/min
✅ Timeline: 2 "smiling" events
```

**If smile detection responds → Facial tracking works** ✅

---

## 🔍 Quick Diagnostic

### If Gesture Detection is Off:

**Too Many Gestures Detected:**
```python
# backend/body_language/analyzer.py, line ~190
# Increase threshold:
if gesture['movement'] > 0.05:  # Was 0.03
```

**Too Few Gestures Detected:**
```python
# Decrease threshold:
if gesture['movement'] > 0.02:  # Was 0.03
```

---

### If Engagement Always Shows 0:

**Check Movement Thresholds:**
```python
# backend/body_language/analyzer.py, line ~340
# Lower thresholds:
if movement < 0.004:  # Was 0.006
    movement_type = 'static'
elif movement > 0.010:  # Was 0.015
    movement_type = 'dynamic'
```

---

### If Posture Seems Too Strict:

**Relax Threshold:**
```python
# backend/body_language/analyzer.py, line ~120
shoulder_alignment = 1.0 - min(shoulder_diff / 0.20, 1.0)  # Was 0.15
```

---

## 📊 Real-Time Debugging

### While Recording, Watch:

1. **Frame Count**: Should increase steadily (~10/sec)
2. **Metrics Update**: Values change when you move
3. **No Detection Warning**: Appears if you leave frame
4. **Console**: No errors in browser or terminal

### Good Signs ✅:
- Posture score changes when you slouch/straighten
- Smile value jumps when you smile (Python)
- Gesture quality varies with hand movement
- Gaze direction updates when you look away

### Bad Signs ❌:
- Metrics frozen (not updating)
- All scores are 0
- Constant "No Person Detected"
- WebSocket disconnects repeatedly

---

## 🎯 Research Benchmark Quick Reference

| Metric | Target | Source |
|--------|--------|--------|
| Posture | 75-85 | Toastmasters |
| Eye Contact | 85-95 | Public Speaking Research |
| Gestures | 3-8/min | GestureLens |
| Engagement | 70-90 | GestureLens (movement) |
| Smile | 15-25% of time | Body Language PDF |

**Your scores should fall within ±15 of these targets for valid presentations**

---

## 🚨 Common Issues

### "No Person Detected"
- [ ] Move closer to camera
- [ ] Improve lighting
- [ ] Check if MediaPipe initialized (backend logs)

### "WebSocket Connection Failed"
- [ ] Is Python backend running? (`python main.py`)
- [ ] Check port 8000 is available
- [ ] Try http://localhost:8000 in browser

### "All Scores are 0"
- [ ] Was person detected throughout recording?
- [ ] Check timeline for any events
- [ ] Review backend logs for errors

---

## ✅ Success Criteria

**System is accurately calibrated if:**

1. ✅ Perfect presentation → All scores >70
2. ✅ Bad presentation → All scores <50
3. ✅ Manual gesture count ±20% of detected count
4. ✅ Gaze events match when you look away
5. ✅ Smile detection responds in real-time (Python)
6. ✅ Coaching cites research sources
7. ✅ RAG system provides specific benchmarks

**If all 7 criteria pass → Ready for production use!** 🎉

---

## 📖 Full Testing Guide

For detailed test protocols, see:
- **TESTING_METHODOLOGY.md** - Comprehensive testing guide
- **backend/test_metrics.py** - Automated test suite
- **TESTING_GUIDE.md** - Original testing documentation

---

## 🔄 Quick Retest

After adjusting thresholds:

```bash
# 1. Restart backend
cd backend
python main.py

# 2. Clear browser cache
# Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# 3. Re-run Test 1 (Perfect Presentation)
# 4. Compare new scores to benchmarks
```

---

**Goal: Every metric aligned with research within ±15% for valid presentations**

