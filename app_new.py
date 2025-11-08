"""
Presentation Analyzer with Video Recording & Timestamped Issue Detection
Records video, analyzes slides with Gemini AI, detects new issues, timestamps them
"""

from flask import Flask, render_template, request, jsonify, send_file
import google.generativeai as genai
import os
from dotenv import load_dotenv
import base64
from PIL import Image
import io
from datetime import datetime
import json
from pathlib import Path

load_dotenv()

app = Flask(__name__)
app.config['RECORDINGS_FOLDER'] = 'recordings'
os.makedirs(app.config['RECORDINGS_FOLDER'], exist_ok=True)

# Configure Gemini
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
model = genai.GenerativeModel('gemini-2.0-flash-exp')

# Session storage: {session_id: {frames: [], issues: [], video_chunks: [], start_time: timestamp}}
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
        'start_time': datetime.now().timestamp(),
        'issue_fingerprints': set()  # Track unique issues to avoid duplicates
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
    
    # Save final report
    report = {
        'session_id': session_id,
        'total_frames': len(session['frames']),
        'total_issues': len(session['issues']),
        'issues': session['issues'],
        'duration': data.get('duration', 0)
    }
    
    report_path = os.path.join(app.config['RECORDINGS_FOLDER'], session_id, 'analysis_report.json')
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    return jsonify({
        'success': True,
        'session_id': session_id,
        'total_frames': len(session['frames']),
        'total_issues': len(session['issues']),
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

if __name__ == '__main__':
    print("🎯 Presentation Analyzer with Video Recording")
    print("📹 Records video with timestamped issue detection")
    print("🤖 Powered by Gemini AI")
    print("🌐 http://localhost:5000/recorder")
    app.run(debug=True, host='0.0.0.0', port=5000, threaded=True)
