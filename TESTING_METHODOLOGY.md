# Metric Accuracy Testing Methodology

## Overview

This guide provides systematic tests for validating each body language metric against research benchmarks and expected behaviors.

## Testing Architecture

```
Test Scenario → Expected Behavior → Measure Output → Compare to Benchmark → Adjust if Needed
```

---

## 1. POSTURE TESTING

### Test 1.1: Good Posture Baseline
**Objective:** Verify system detects good posture correctly

**Setup:**
1. Sit/stand with perfect posture:
   - Shoulders back and level
   - Spine straight
   - Head level, chin parallel to ground
   - Weight evenly distributed

**Expected Results:**
- `posture_score`: 75-85 (research benchmark)
- `is_good`: true
- `shoulder_alignment`: >0.85
- `spine_quality`: >0.85

**How to Validate:**
```bash
# Record 30 seconds maintaining perfect posture
# Check results:
- Posture score should be 75-85
- Timeline should have minimal "slouching" events
```

### Test 1.2: Slouching Detection
**Objective:** Verify system detects poor posture

**Setup:**
1. Deliberately slouch:
   - Shoulders hunched forward
   - Spine curved
   - Head tilted down

**Expected Results:**
- `posture_score`: <60
- `is_good`: false
- Timeline should show "slouching" events
- Events should appear within 2-3 seconds of slouching

**Validation:**
```bash
# Slouch for 10 seconds, then correct for 10 seconds, repeat
# Timeline should show:
- "slouching" events during slouch periods
- Higher scores during correct posture periods
```

### Test 1.3: Posture Transitions
**Objective:** Verify system tracks posture changes

**Setup:**
1. Alternate every 5 seconds:
   - Good posture (5s)
   - Slouch (5s)
   - Good posture (5s)
   - Slouch (5s)

**Expected Results:**
- Posture score should fluctuate between high (>75) and low (<60)
- Timeline should show events at transition points
- Average score should be ~60-70 (50% good, 50% bad)

---

## 2. FACIAL EXPRESSION TESTING (Python Only)

### Test 2.1: Smile Detection
**Objective:** Verify facial expression tracking

**Setup:**
1. Record 60 seconds:
   - Neutral face (15s)
   - Smiling (15s)
   - Neutral (15s)
   - Smiling (15s)

**Expected Results:**
- `facial.smile`: ~0.0 during neutral
- `facial.smile`: >0.5 during smiling
- Timeline: "smiling" events during smile periods
- `smile_frequency`: 2 smiles in 60s = ~2/min

**Validation:**
```python
# Check real-time metrics during recording
# Should see smile value jump from ~0 to >0.5 when you smile
# Aggregate smile_frequency should match actual smiles
```

### Test 2.2: Eyebrow Raises
**Objective:** Verify emphasis detection

**Setup:**
1. Raise eyebrows deliberately 5 times during 60s recording
2. Rest between each raise

**Expected Results:**
- `facial.eyebrow_raise`: >0.3 during raises
- `facial.eyebrow_raise`: ~0.0 at rest
- Should detect at least 4 of 5 raises

### Test 2.3: Speaking Indicator
**Objective:** Verify mouth openness tracking

**Setup:**
1. Record 60 seconds:
   - Mouth closed (15s)
   - Talking/mouth open (15s)
   - Mouth closed (15s)
   - Talking/mouth open (15s)

**Expected Results:**
- `facial.mouth_open`: ~0.0 when closed
- `facial.mouth_open`: >0.3 when speaking/open
- Clear distinction between closed and open states

---

## 3. GESTURE TESTING

### Test 3.1: Gesture Frequency Validation
**Objective:** Verify gesture counting accuracy

**Setup:**
1. Record 60 seconds
2. Make exactly 5 deliberate hand gestures (count manually)
3. Use both hands symmetrically

**Expected Results:**
- `gesture_frequency`: Should be close to 5/min
- Acceptable range: 4-6 gestures detected (80% accuracy)
- Timeline: 4-6 "gesture" events

**Validation:**
```bash
# Manual count: 5 gestures in 60s
# System count: Should detect 4-6
# If outside range, threshold needs adjustment
```

### Test 3.2: Gesture Quality (Symmetry)
**Objective:** Verify bilateral gesture detection

**Setup:**
1. Test A: Use only right hand (10 gestures, 60s)
2. Test B: Use only left hand (10 gestures, 60s)
3. Test C: Use both hands equally (10 gestures, 60s)

**Expected Results:**
- Test A: `gesture_quality`: 30-50 (one-handed)
- Test B: `gesture_quality`: 30-50 (one-handed)
- Test C: `gesture_quality`: >60 (symmetric)

**Research Benchmark:**
- >60% symmetric gestures = high engagement (GestureLens)
- Test C should score higher than Tests A and B

### Test 3.3: Hand Shape Detection (Python Only)
**Objective:** Verify finger tracking

**Setup:**
1. Hold each shape for 5 seconds:
   - Open palm (fingers extended)
   - Closed fist (fingers curled)
   - Pointing (index extended, others closed)

**Expected Results:**
- `hand_shapes.left/right`: "open_palm", "fist", "pointing"
- Real-time display should update as you change shapes
- Shapes should be detected within 1-2 seconds

---

## 4. EYE GAZE TESTING

### Test 4.1: Forward Gaze Baseline
**Objective:** Verify forward-facing detection

**Setup:**
1. Look directly at camera for 60 seconds
2. Don't move head or eyes

**Expected Results:**
- `eye_contact_proxy`: 90-100
- `gaze.direction`: "forward"
- `gaze.is_forward`: true for >90% of frames
- Minimal "looking_away" events

**Research Benchmark:**
- Professional speakers: 85-95% forward gaze
- Your result should be >90%

### Test 4.2: Looking Away Detection
**Objective:** Verify off-screen gaze detection

**Setup:**
1. Record 60 seconds alternating:
   - Look at camera (10s)
   - Look left (5s)
   - Look at camera (10s)
   - Look right (5s)
   - Look at camera (10s)
   - Look down (5s)
   - Look at camera (15s)

**Expected Results:**
- Timeline: "looking_away" events at 10s, 25s, 40s
- Directions: "left", "right", "down"
- `eye_contact_proxy`: ~70-75 (45s forward, 15s away)

### Test 4.3: Precise Eye Tracking (Python Only)
**Objective:** Verify eye landmark accuracy

**Setup:**
1. Move only eyes (not head):
   - Look left with eyes only (5s)
   - Look right with eyes only (5s)
   - Look center (5s)

**Expected Results:**
- Python: Should detect eye movement even without head movement
- `gaze.method`: "precise_eye_tracking" (not "nose_proxy")
- More sensitive than JavaScript version

---

## 5. ENGAGEMENT/MOVEMENT TESTING

### Test 5.1: Static Period Detection
**Objective:** Verify static detection

**Setup:**
1. Record 60 seconds:
   - Stand completely still (20s)
   - Move dynamically (20s)
   - Stand completely still (20s)

**Expected Results:**
- Periods 1 & 3: `movement.type`: "static"
- Period 2: `movement.type`: "dynamic"
- `engagement_score`: ~33 (only 1/3 of time is dynamic)
- Timeline: "static_period" events during still moments

**Research Benchmark:**
- Engaging speakers show 0.008-0.015 movement/second
- Static periods should not exceed 5-10 seconds

### Test 5.2: Dynamic Engagement
**Objective:** Verify engagement scoring

**Setup:**
1. Record 60 seconds with continuous subtle movement:
   - Small torso shifts
   - Head nods
   - Weight shifts
   - Leaning forward/back slightly
   - NO large hand gestures (those are separate)

**Expected Results:**
- `engagement_score`: 70-90
- `movement.type`: "dynamic" or "moderate" for most frames
- `movement.amount`: 0.008-0.015 (research range)

### Test 5.3: Torso-Only Movement (Validation)
**Objective:** Verify engagement doesn't overlap with gestures

**Setup:**
1. Test A: Wave hands frantically, keep torso still (30s)
2. Test B: Keep hands still, move torso continuously (30s)

**Expected Results:**
- Test A: High `gesture_quality`, LOW `engagement_score`
- Test B: Low `gesture_quality`, HIGH `engagement_score`
- Confirms: Engagement = torso only, Gestures = hands only

---

## 6. INTEGRATED TESTING

### Test 6.1: Perfect Presentation
**Objective:** Achieve optimal scores on all metrics

**Setup:**
1. Record 60 seconds following research guidelines:
   - Good posture (shoulders back, spine straight)
   - Forward gaze 90% of time
   - 5 symmetric gestures (both hands)
   - Continuous subtle torso movement
   - Smile 3-4 times

**Expected Results:**
- `posture_score`: 75-85
- `eye_contact_proxy`: 85-95
- `gesture_quality`: >60
- `gesture_frequency`: 5/min (within 3-8 range)
- `engagement_score`: 70-90
- `smile_frequency`: 3-4/min

**This is your "gold standard" test**

### Test 6.2: Poor Presentation
**Objective:** Verify system detects all problems

**Setup:**
1. Record 60 seconds doing everything wrong:
   - Slouch
   - Look away frequently
   - No hand gestures
   - Stand completely still
   - No facial expressions

**Expected Results:**
- All scores should be <50
- Timeline full of negative events
- Coaching should identify all problem areas

### Test 6.3: Research Benchmark Validation
**Objective:** Compare to published data

**Setup:**
1. Record a TED-style presentation (5 minutes)
2. Compare your results to research benchmarks

**Research Targets:**
| Metric | Research Range | Your Target |
|--------|----------------|-------------|
| Posture | 75-85% good | 75-85 score |
| Eye Contact | 85-95% forward | 85-95 score |
| Gestures | 3-8 per minute | 3-8 detected |
| Engagement | 0.008-0.015/sec | 70-90 score |

---

## 7. DEBUGGING TOOLS

### Tool 7.1: Real-Time Metric Viewer
**Location:** `/analysis-python` page

**What to Watch:**
- Posture score: Should change within 1-2 seconds of posture change
- Facial expressions: Should respond immediately to smiles/eyebrow raises
- Gesture quality: Should update during hand movements
- Gaze direction: Should update when you look away

**Debug Checklist:**
```
[ ] Metrics update in real-time (not frozen)
[ ] Scores change when you change behavior
[ ] Values make intuitive sense
[ ] No errors in browser console
```

### Tool 7.2: Timeline Event Analysis
**Location:** Results page → Event Timeline

**What to Check:**
- Events occur at correct timestamps
- Event types match what you did
- Event frequency matches manual count
- No duplicate/spurious events

### Tool 7.3: Python Backend Logs
**Terminal Output:**

```bash
# While recording, watch for:
📊 Processed 50 frames (5.0s)
📊 Processed 100 frames (10.0s)

# Should see steady frame processing
# No errors about detection failures
# Consistent timing
```

### Tool 7.4: RAG Context Validation
**Endpoint:** `http://localhost:8000/api/debug/knowledge-base`

**Verify:**
- 24+ knowledge entries exist
- Benchmarks have quantitative data
- Categories cover all metrics
- Sources are cited

---

## 8. CALIBRATION PROCESS

### When to Adjust Thresholds

**If gesture detection is too sensitive:**
```python
# backend/body_language/analyzer.py
# Increase movement threshold:
if gesture['movement'] > 0.05:  # Was 0.03
    # Detect gesture
```

**If engagement always shows 0:**
```python
# backend/body_language/analyzer.py
# Lower movement thresholds:
if movement < 0.004:  # Was 0.006
    movement_type = 'static'
elif movement > 0.010:  # Was 0.015
    movement_type = 'dynamic'
```

**If posture detection is too strict:**
```python
# Adjust alignment thresholds
POSTURE_SHOULDER_ALIGNMENT_THRESHOLD = 0.20  # Was 0.15
```

### Calibration Workflow

1. **Baseline Test:** Record perfect presentation
2. **Compare:** Check scores against research benchmarks
3. **Identify Issues:** Which metrics are off?
4. **Adjust Threshold:** Modify one threshold at a time
5. **Retest:** Record same test again
6. **Iterate:** Repeat until aligned with research

---

## 9. VALIDATION CHECKLIST

### Before Deployment:

```
POSTURE:
[ ] Good posture scores 75-85
[ ] Slouching scores <60
[ ] Transitions detected within 2s

FACIAL (Python):
[ ] Smile detected (>0.5 when smiling)
[ ] Neutral face ~0.0
[ ] Eyebrow raises detected
[ ] Mouth openness tracks speaking

GESTURES:
[ ] Manual count ±20% of detected count
[ ] Symmetric gestures score >60
[ ] One-handed gestures score <50
[ ] Frequency within 3-8/min for normal presentation

EYE GAZE:
[ ] Forward gaze scores 90+ when looking at camera
[ ] Looking away detected within 2s
[ ] Directions (left/right/down) correct
[ ] Python: Precise eye tracking vs nose proxy

ENGAGEMENT:
[ ] Static periods score <50
[ ] Dynamic movement scores 70-90
[ ] Hand gestures don't inflate engagement score
[ ] Torso movement is primary factor

RAG SYSTEM:
[ ] Coaching cites research sources
[ ] Benchmarks compared to user scores
[ ] Techniques recommended for problem areas
[ ] All scores have research context

INTEGRATION:
[ ] WebSocket connects successfully
[ ] Real-time updates <200ms
[ ] Final analysis completes
[ ] Results page displays correctly
[ ] Session saved and retrievable
```

---

## 10. ADVANCED TESTING

### Test 10.1: Comparison Study
**Objective:** Validate against JavaScript version

**Setup:**
1. Record same presentation twice:
   - Once with JavaScript backend (17 landmarks)
   - Once with Python backend (543 landmarks)

**Compare:**
- Which detected more events?
- Which scores are more stable?
- Python should detect facial expressions (JS doesn't)
- Python should detect hand shapes (JS doesn't)

### Test 10.2: Multi-Session Consistency
**Objective:** Verify reproducibility

**Setup:**
1. Record identical presentation 3 times
2. Keep everything the same (same posture, gestures, gaze)

**Expected:**
- Scores should vary by <10% between sessions
- Event counts should be similar (±2)
- Shows system is consistent

### Test 10.3: External Validation
**Objective:** Get human verification

**Setup:**
1. Record presentation
2. Have a colleague manually score you (1-100) on:
   - Posture
   - Eye contact
   - Gestures
   - Energy/engagement

**Compare:**
- Human scores vs AI scores
- Should be within ±15 points
- Identifies if system is systematically too harsh/lenient

---

## 11. METRIC-SPECIFIC EDGE CASES

### Posture Edge Cases:
- [ ] Sitting vs standing (both should work)
- [ ] Different camera angles (higher/lower)
- [ ] Partial body visibility (torso cut off)

### Facial Edge Cases:
- [ ] Different skin tones (should work equally)
- [ ] Glasses (should still detect eyes)
- [ ] Beard (should still detect mouth)
- [ ] Side profile (may reduce accuracy)

### Gesture Edge Cases:
- [ ] Hands out of frame temporarily
- [ ] Very fast gestures
- [ ] Very slow gestures
- [ ] Hands overlapping body

### Gaze Edge Cases:
- [ ] Head tilt without looking away
- [ ] Eyes closed briefly (blinking)
- [ ] Reading from notes vs looking away

---

## 12. AUTOMATED TESTING SCRIPT

```python
# Create test_metrics.py in backend/

import asyncio
from body_language.detector import HolisticDetector
from body_language.analyzer import BodyLanguageAnalyzer
import cv2

async def test_posture_detection():
    """Test posture with known good/bad frames"""
    detector = HolisticDetector()
    await detector.initialize()
    
    # Load test images
    good_posture_frame = cv2.imread('test_data/good_posture.jpg')
    bad_posture_frame = cv2.imread('test_data/bad_posture.jpg')
    
    # Process
    good_result = await detector.process_async(good_posture_frame)
    bad_result = await detector.process_async(bad_posture_frame)
    
    # Analyze
    analyzer = BodyLanguageAnalyzer('test')
    good_metrics = analyzer.calculate_metrics(good_result, 0)
    bad_metrics = analyzer.calculate_metrics(bad_result, 0)
    
    # Validate
    assert good_metrics['posture']['score'] > 75, "Good posture should score >75"
    assert bad_metrics['posture']['score'] < 60, "Bad posture should score <60"
    
    print("✅ Posture detection test passed")

# Run all tests
if __name__ == "__main__":
    asyncio.run(test_posture_detection())
```

---

## Summary: Quick Test Protocol

**5-Minute Validation:**

1. **Record 60 seconds with perfect technique**
   - Expected: All scores >70

2. **Record 60 seconds with deliberate mistakes**
   - Expected: All scores <50

3. **Count 5 gestures manually, record**
   - Expected: System detects 4-6

4. **Look away 3 times, record**
   - Expected: Timeline shows 3 gaze events

5. **Smile 3 times, record (Python only)**
   - Expected: 3 smile events detected

**If all 5 tests pass → System is accurately calibrated**

---

## Resources

- **Research Benchmarks:** `/backend/rag/knowledge_base.py`
- **Threshold Values:** `/backend/body_language/analyzer.py`
- **Debug Endpoint:** `http://localhost:8000/api/debug/knowledge-base`
- **Real-time Display:** `http://localhost:3000/analysis-python`

---

**Goal:** Every metric should align with research benchmarks within ±15% for valid presentations.

