"""
Presentation Analyzer with Video Recording & Timestamped Issue Detection
Records video, analyzes slides with Gemini AI, detects new issues, timestamps them
"""

from flask import Flask, render_template, request, jsonify, send_file
import google.generativeai as genai
from google.cloud import speech
import os
from dotenv import load_dotenv
import base64
from PIL import Image
import io
from datetime import datetime
import json
from pathlib import Path
import re
from collections import defaultdict

load_dotenv()

app = Flask(__name__)
app.config['RECORDINGS_FOLDER'] = 'recordings'
os.makedirs(app.config['RECORDINGS_FOLDER'], exist_ok=True)

# Configure Gemini
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
model = genai.GenerativeModel('gemini-2.0-flash-exp')

# Configure Google Speech-to-Text
speech_client = None
try:
    # Read credentials path from .env file
    creds_path = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
    if creds_path:
        # Convert relative path to absolute path if needed
        if not os.path.isabs(creds_path):
            # Get the directory where app_new.py is located
            app_dir = os.path.dirname(os.path.abspath(__file__))
            creds_path = os.path.join(app_dir, creds_path)
        
        # Verify the file exists
        if os.path.exists(creds_path):
            # Set the environment variable (Google Cloud library reads this)
            os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = creds_path
            print(f"✅ Using Google Speech-to-Text credentials: {creds_path}")
        else:
            print(f"⚠️ Credentials file not found: {creds_path}")
            print("Make sure GOOGLE_APPLICATION_CREDENTIALS points to a valid JSON file in .env")
    
    # Initialize the client (it will use GOOGLE_APPLICATION_CREDENTIALS from environment)
    speech_client = speech.SpeechClient()
    print("✅ Google Speech-to-Text client initialized successfully")
except Exception as e:
    print(f"Warning: Could not initialize Google Speech-to-Text client: {e}")
    print("Make sure GOOGLE_APPLICATION_CREDENTIALS is set in .env file")
    print("Example: GOOGLE_APPLICATION_CREDENTIALS=./project-rater-7f5a159846c6.json")

# Session storage: {session_id: {frames: [], issues: [], video_chunks: [], audio_chunks: [], transcription: [], speech_issues: [], speech_scores: {}, start_time: timestamp}}
sessions = {}

ANALYSIS_PROMPT = """Analyze this presentation slide/board for effectiveness. Evaluate:

1. **Text Clarity** - Readable font size, clear hierarchy, not too much text (6x6 rule: max 6 words per line, 6 lines)
2. **Visual Design** - Color psychology, contrast (4.5:1 minimum), visual hierarchy, white space
3. **Content Quality** - Message clarity, coherence, audience appropriateness
4. **Overall Impact** - Persuasiveness, memorability, professional quality

Provide your response as JSON:
{
  "overall_score": <0-10>,
  "issues": [
    {"category": "Text Clarity|Visual Design|Content Quality|Overall Impact", "issue": "specific problem description", "severity": "critical|high|medium|low", "suggestion": "how to fix it"}
  ],
  "summary": "brief 2-3 sentence analysis"
}

Focus on identifying SPECIFIC, ACTIONABLE issues. Only mention problems that actually exist."""

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/recorder')
def recorder():
    return render_template('recorder.html')

@app.route('/start-recording', methods=['POST'])
def start_recording():
    """Initialize a new recording session"""
    session_id = datetime.now().strftime('%Y%m%d_%H%M%S')
    sessions[session_id] = {
        'frames': [],
        'issues': [],  # List of {timestamp, issue_text, category, severity, suggestion}
        'video_chunks': [],
        'audio_chunks': [],  # List of audio chunk paths
        'transcription': [],  # List of {timestamp, text, start_time, end_time}
        'speech_issues': [],  # List of {timestamp, category, issue, score_deduction, suggestion}
        'speech_scores': {
            'dialect': 2.5,
            'grammar': 2.5,
            'filler_words': 2.5,
            'pace': 2.5
        },
        'start_time': datetime.now().timestamp(),
        'issue_fingerprints': set(),  # Track unique issues to avoid duplicates
        'speech_fingerprints': set()  # Track unique speech issues to avoid duplicates
    }
    
    session_folder = os.path.join(app.config['RECORDINGS_FOLDER'], session_id)
    os.makedirs(session_folder, exist_ok=True)
    
    return jsonify({
        'success': True,
        'session_id': session_id
    })

@app.route('/capture-frame', methods=['POST'])
def capture_frame():
    """Capture frame and analyze with Gemini"""
    data = request.get_json()
    session_id = data.get('session_id')
    image_data_url = data.get('frame')
    current_time = data.get('timestamp', 0)  # Time in seconds since recording started
    
    if session_id not in sessions:
        return jsonify({'error': 'Invalid session'}), 400
    
    session = sessions[session_id]
    
    # Decode image
    if ',' in image_data_url:
        image_data_url = image_data_url.split(',')[1]
    image_data = base64.b64decode(image_data_url)
    
    # Save frame
    frame_number = len(session['frames']) + 1
    frame_path = os.path.join(app.config['RECORDINGS_FOLDER'], session_id, f'frame_{frame_number:04d}.jpg')
    with open(frame_path, 'wb') as f:
        f.write(image_data)
    
    session['frames'].append({
        'number': frame_number,
        'timestamp': current_time,
        'path': frame_path
    })
    
    # Analyze with Gemini
    try:
        img = Image.open(io.BytesIO(image_data))
        response = model.generate_content([ANALYSIS_PROMPT, img])
        text = response.text.strip()
        
        # Parse JSON response
        if '```json' in text:
            text = text.split('```json')[1].split('```')[0].strip()
        elif '```' in text:
            text = text.split('```')[1].split('```')[0].strip()
        
        analysis = json.loads(text)
        
        # Process issues and detect new ones
        new_issues_detected = []
        for issue_obj in analysis.get('issues', []):
            # Create fingerprint to detect duplicates
            fingerprint = f"{issue_obj['category']}:{issue_obj['issue'][:50]}"
            
            if fingerprint not in session['issue_fingerprints']:
                session['issue_fingerprints'].add(fingerprint)
                
                issue_entry = {
                    'timestamp': current_time,
                    'timestamp_formatted': format_timestamp(current_time),
                    'frame_number': frame_number,
                    'category': issue_obj['category'],
                    'issue': issue_obj['issue'],
                    'severity': issue_obj.get('severity', 'medium'),
                    'suggestion': issue_obj['suggestion']
                }
                
                session['issues'].append(issue_entry)
                new_issues_detected.append(issue_entry)
        
        return jsonify({
            'success': True,
            'frame_number': frame_number,
            'timestamp': current_time,
            'overall_score': analysis.get('overall_score', 5),
            'summary': analysis.get('summary', ''),
            'new_issues': new_issues_detected,
            'total_issues': len(session['issues'])
        })
        
    except Exception as e:
        print(f"Analysis error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'frame_number': frame_number
        }), 500

@app.route('/save-video-chunk', methods=['POST'])
def save_video_chunk():
    """Save video chunk (sent from browser)"""
    session_id = request.form.get('session_id')
    chunk_number = int(request.form.get('chunk_number', 0))
    
    if session_id not in sessions:
        return jsonify({'error': 'Invalid session'}), 400
    
    video_file = request.files.get('video')
    if not video_file:
        return jsonify({'error': 'No video data'}), 400
    
    chunk_path = os.path.join(app.config['RECORDINGS_FOLDER'], session_id, f'chunk_{chunk_number:04d}.webm')
    video_file.save(chunk_path)
    
    sessions[session_id]['video_chunks'].append(chunk_path)
    
    return jsonify({'success': True})

@app.route('/stop-recording', methods=['POST'])
def stop_recording():
    """Finalize recording and generate report"""
    data = request.get_json()
    session_id = data.get('session_id')
    
    if session_id not in sessions:
        return jsonify({'error': 'Invalid session'}), 400
    
    session = sessions[session_id]
    
    # Calculate final oral presentation score
    oral_score = sum(session['speech_scores'].values())
    
    # Get full transcription/manuscript
    full_transcript = ' '.join([entry['text'] for entry in session['transcription']])
    
    # Save final report
    report = {
        'session_id': session_id,
        'total_frames': len(session['frames']),
        'total_issues': len(session['issues']),
        'issues': session['issues'],
        'duration': data.get('duration', 0),
        'speech_analysis': {
            'oral_presentation_score': oral_score,
            'speech_scores': session['speech_scores'],
            'speech_issues': session['speech_issues'],
            'total_speech_issues': len(session['speech_issues']),
            'transcription': session['transcription'],
            'full_transcript': full_transcript
        }
    }
    
    report_path = os.path.join(app.config['RECORDINGS_FOLDER'], session_id, 'analysis_report.json')
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    return jsonify({
        'success': True,
        'session_id': session_id,
        'total_frames': len(session['frames']),
        'total_issues': len(session['issues']),
        'oral_presentation_score': oral_score,
        'speech_scores': session['speech_scores'],
        'speech_issues': session['speech_issues'],
        'total_speech_issues': len(session['speech_issues']),
        'full_transcript': full_transcript,
        'report_path': report_path
    })

@app.route('/get-session-data/<session_id>')
def get_session_data(session_id):
    """Get all data for a session"""
    if session_id not in sessions:
        return jsonify({'error': 'Session not found'}), 404
    
    session = sessions[session_id]
    return jsonify({
        'success': True,
        'total_frames': len(session['frames']),
        'total_issues': len(session['issues']),
        'issues': session['issues']
    })

@app.route('/download-report/<session_id>')
def download_report(session_id):
    """Download JSON report"""
    report_path = os.path.join(app.config['RECORDINGS_FOLDER'], session_id, 'analysis_report.json')
    if os.path.exists(report_path):
        return send_file(report_path, as_attachment=True, download_name=f'report_{session_id}.json')
    return jsonify({'error': 'Report not found'}), 404

def format_timestamp(seconds):
    """Format seconds as MM:SS"""
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{mins:02d}:{secs:02d}"

def transcribe_audio(audio_path):
    """Transcribe audio file using Google Speech-to-Text"""
    if speech_client is None:
        return None, None
    
    try:
        with open(audio_path, 'rb') as audio_file:
            content = audio_file.read()
        
        audio = speech.RecognitionAudio(content=content)
        # Try different encodings - WebM Opus may need ENCODING_UNSPECIFIED for auto-detection
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.ENCODING_UNSPECIFIED,
            sample_rate_hertz=48000,
            language_code='en-US',
            enable_word_time_offsets=True,
            audio_channel_count=1
        )
        
        response = speech_client.recognize(config=config, audio=audio)
        
        transcript_text = ''
        segments = []
        
        for result in response.results:
            transcript_text += result.alternatives[0].transcript + ' '
            if result.alternatives[0].words:
                start_time = result.alternatives[0].words[0].start_time.total_seconds()
                end_time = result.alternatives[0].words[-1].end_time.total_seconds()
                segments.append({
                    'start': start_time,
                    'end': end_time,
                    'text': result.alternatives[0].transcript
                })
        
        return transcript_text.strip(), segments
    except Exception as e:
        print(f"Transcription error: {e}")
        return None, None

def detect_filler_words(text):
    """Detect filler words in text"""
    filler_patterns = [
        r'\bum\b', r'\buh\b', r'\ber\b', r'\bah\b',
        r'\blike\b', r'\byou know\b', r'\bwell\b',
        r'\bso\b', r'\bactually\b', r'\bbasically\b'
    ]
    
    filler_count = 0
    filler_positions = []
    
    text_lower = text.lower()
    for pattern in filler_patterns:
        matches = list(re.finditer(pattern, text_lower))
        filler_count += len(matches)
        for match in matches:
            filler_positions.append({
                'word': match.group(),
                'position': match.start()
            })
    
    return filler_count, filler_positions

def calculate_pace(text, duration_seconds):
    """Calculate words per minute"""
    if duration_seconds <= 0:
        return 0, 'good', 0
    
    words = text.split()
    word_count = len(words)
    wpm = (word_count / duration_seconds) * 60
    
    # Ideal pace: 150-180 WPM
    ideal_min = 150
    ideal_max = 180
    
    if wpm < ideal_min:
        deviation = ideal_min - wpm
        return wpm, 'too_slow', deviation
    elif wpm > ideal_max:
        deviation = wpm - ideal_max
        return wpm, 'too_fast', deviation
    else:
        return wpm, 'good', 0

def analyze_speech_with_gemini(transcript_text, audio_metadata):
    """Use Gemini to analyze dialect/pronunciation and grammar"""
    prompt = f"""Analyze this speech transcript for presentation quality. Evaluate:

1. **Dialect/Pronunciation** - Assess clarity, articulation, pronunciation accuracy, and speech intelligibility
2. **Grammar** - Identify grammatical errors, incorrect word usage, sentence structure issues

Provide your response as JSON:
{{
  "dialect_score": <0-2.5>,
  "grammar_score": <0-2.5>,
  "dialect_issues": [
    {{"issue": "specific pronunciation or clarity problem", "severity": "high|medium|low"}}
  ],
  "grammar_issues": [
    {{"issue": "specific grammatical error", "severity": "high|medium|low"}}
  ],
  "dialect_feedback": "overall assessment of pronunciation and clarity",
  "grammar_feedback": "overall assessment of grammar"
}}

Transcript: "{transcript_text}"

Focus on SPECIFIC, ACTIONABLE issues. Only mention problems that actually exist."""
    
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        # Parse JSON response
        if '```json' in text:
            text = text.split('```json')[1].split('```')[0].strip()
        elif '```' in text:
            text = text.split('```')[1].split('```')[0].strip()
        
        analysis = json.loads(text)
        return analysis
    except Exception as e:
        print(f"Gemini speech analysis error: {e}")
        return {
            'dialect_score': 2.5,
            'grammar_score': 2.5,
            'dialect_issues': [],
            'grammar_issues': [],
            'dialect_feedback': 'Analysis unavailable',
            'grammar_feedback': 'Analysis unavailable'
        }

@app.route('/capture-audio-chunk', methods=['POST'])
def capture_audio_chunk():
    """Receive audio chunk, transcribe, and analyze"""
    session_id = request.form.get('session_id')
    current_time = float(request.form.get('timestamp', 0))
    chunk_number = int(request.form.get('chunk_number', 0))
    
    if session_id not in sessions:
        return jsonify({'error': 'Invalid session'}), 400
    
    audio_file = request.files.get('audio')
    if not audio_file:
        return jsonify({'error': 'No audio data'}), 400
    
    session = sessions[session_id]
    
    # Save audio chunk
    audio_path = os.path.join(app.config['RECORDINGS_FOLDER'], session_id, f'audio_{chunk_number:04d}.webm')
    audio_file.save(audio_path)
    session['audio_chunks'].append(audio_path)
    
    # Transcribe audio
    transcript_text, segments = transcribe_audio(audio_path)
    
    if not transcript_text:
        return jsonify({
            'success': True,
            'transcribed': False,
            'message': 'Transcription unavailable'
        })
    
    # Calculate chunk duration (estimate from segments or use default)
    chunk_duration = 5.0  # Default 5 seconds per chunk
    if segments:
        chunk_duration = segments[-1].get('end', 5.0) - segments[0].get('start', 0.0)
    
    # Store transcription
    transcript_entry = {
        'timestamp': current_time,
        'text': transcript_text,
        'start_time': current_time,
        'end_time': current_time + chunk_duration,
        'chunk_number': chunk_number
    }
    session['transcription'].append(transcript_entry)
    
    # Analyze speech
    filler_count, filler_positions = detect_filler_words(transcript_text)
    wpm, pace_status, pace_deviation = calculate_pace(transcript_text, chunk_duration)
    
    # Use Gemini for dialect and grammar analysis
    gemini_analysis = analyze_speech_with_gemini(transcript_text, {
        'duration': chunk_duration,
        'word_count': len(transcript_text.split())
    })
    
    # Calculate filler words score (2.5 points max)
    # Penalty: 0.1 points per filler word per minute
    filler_per_minute = (filler_count / chunk_duration) * 60 if chunk_duration > 0 else 0
    filler_deduction = min(2.5, filler_per_minute * 0.1)
    filler_score = max(0, 2.5 - filler_deduction)
    
    # Calculate pace score (2.5 points max)
    # Penalty: 0.05 points per WPM deviation from ideal (150-180)
    pace_deduction = min(2.5, pace_deviation * 0.05) if pace_status != 'good' else 0
    pace_score = max(0, 2.5 - pace_deduction)
    
    # Update session scores (use latest scores from this chunk)
    session['speech_scores']['dialect'] = gemini_analysis.get('dialect_score', 2.5)
    session['speech_scores']['grammar'] = gemini_analysis.get('grammar_score', 2.5)
    session['speech_scores']['filler_words'] = filler_score
    session['speech_scores']['pace'] = pace_score
    
    # Create speech issues with timestamps
    new_speech_issues = []
    
    # Add filler word issues
    if filler_count > 0:
        filler_fingerprint = f"filler_words:{current_time}"
        if filler_fingerprint not in session['speech_fingerprints']:
            session['speech_fingerprints'].add(filler_fingerprint)
            issue = {
                'timestamp': current_time,
                'timestamp_formatted': format_timestamp(current_time),
                'category': 'Filler Words',
                'issue': f'Detected {filler_count} filler word(s) in this segment ({filler_per_minute:.1f} per minute)',
                'score_deduction': filler_deduction,
                'suggestion': 'Practice pausing instead of using filler words. Take a breath when you need to think.',
                'severity': 'high' if filler_per_minute > 5 else 'medium' if filler_per_minute > 2 else 'low'
            }
            session['speech_issues'].append(issue)
            new_speech_issues.append(issue)
    
    # Add pace issues
    if pace_status != 'good':
        pace_fingerprint = f"pace:{current_time}"
        if pace_fingerprint not in session['speech_fingerprints']:
            session['speech_fingerprints'].add(pace_fingerprint)
            issue = {
                'timestamp': current_time,
                'timestamp_formatted': format_timestamp(current_time),
                'category': 'Pace',
                'issue': f'Speech pace is {pace_status.replace("_", " ")} ({wpm:.0f} WPM). Ideal range is 150-180 WPM.',
                'score_deduction': pace_deduction,
                'suggestion': 'Slow down' if pace_status == 'too_fast' else 'Speak slightly faster to maintain audience engagement',
                'severity': 'high' if abs(pace_deviation) > 30 else 'medium'
            }
            session['speech_issues'].append(issue)
            new_speech_issues.append(issue)
    
    # Add dialect issues from Gemini
    for dialect_issue in gemini_analysis.get('dialect_issues', []):
        issue_text = dialect_issue.get('issue', '')
        fingerprint = f"dialect:{issue_text[:50]}:{current_time}"
        if fingerprint not in session['speech_fingerprints']:
            session['speech_fingerprints'].add(fingerprint)
            score_deduction = 0.2 if dialect_issue.get('severity') == 'high' else 0.1 if dialect_issue.get('severity') == 'medium' else 0.05
            issue = {
                'timestamp': current_time,
                'timestamp_formatted': format_timestamp(current_time),
                'category': 'Dialect/Pronunciation',
                'issue': issue_text,
                'score_deduction': score_deduction,
                'suggestion': gemini_analysis.get('dialect_feedback', 'Focus on clear articulation and pronunciation'),
                'severity': dialect_issue.get('severity', 'medium')
            }
            session['speech_issues'].append(issue)
            new_speech_issues.append(issue)
    
    # Add grammar issues from Gemini
    for grammar_issue in gemini_analysis.get('grammar_issues', []):
        issue_text = grammar_issue.get('issue', '')
        fingerprint = f"grammar:{issue_text[:50]}:{current_time}"
        if fingerprint not in session['speech_fingerprints']:
            session['speech_fingerprints'].add(fingerprint)
            score_deduction = 0.2 if grammar_issue.get('severity') == 'high' else 0.1 if grammar_issue.get('severity') == 'medium' else 0.05
            issue = {
                'timestamp': current_time,
                'timestamp_formatted': format_timestamp(current_time),
                'category': 'Grammar',
                'issue': issue_text,
                'score_deduction': score_deduction,
                'suggestion': gemini_analysis.get('grammar_feedback', 'Review grammar rules and practice clear sentence structure'),
                'severity': grammar_issue.get('severity', 'medium')
            }
            session['speech_issues'].append(issue)
            new_speech_issues.append(issue)
    
    # Calculate current oral presentation score
    oral_score = sum(session['speech_scores'].values())
    
    return jsonify({
        'success': True,
        'transcribed': True,
        'transcript': transcript_text,
        'filler_count': filler_count,
        'filler_per_minute': filler_per_minute,
        'wpm': wpm,
        'pace_status': pace_status,
        'speech_scores': session['speech_scores'],
        'oral_score': oral_score,
        'new_speech_issues': new_speech_issues,
        'total_speech_issues': len(session['speech_issues'])
    })

if __name__ == '__main__':
    print("🎯 Presentation Analyzer with Video Recording")
    print("📹 Records video with timestamped issue detection")
    print("🤖 Powered by Gemini AI")
    print("🌐 http://localhost:5000/recorder")
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)
