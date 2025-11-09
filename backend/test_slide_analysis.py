"""
Test Script for Slide Content Analysis
Tests the slide analysis API with webcam frames or image files
"""

import cv2
import requests
import time
import sys
from pathlib import Path

def capture_and_analyze_webcam():
    """Capture a frame from webcam and analyze it"""
    print("📹 Opening webcam...")
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("❌ Error: Could not open webcam")
        return
    
    print("✅ Webcam opened successfully")
    print("\nInstructions:")
    print("  - Position yourself and your slides/whiteboard in frame")
    print("  - Press SPACE to capture and analyze")
    print("  - Press 'q' to quit")
    print()
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("❌ Failed to read frame")
            break
        
        # Display the frame
        cv2.imshow('Slide Analysis Test - Press SPACE to analyze, Q to quit', frame)
        
        key = cv2.waitKey(1) & 0xFF
        
        if key == ord('q'):
            break
        elif key == ord(' '):  # Space bar
            print("\n📸 Capturing frame...")
            
            # Save frame temporarily
            cv2.imwrite('temp_slide.jpg', frame)
            
            # Analyze it
            analyze_image('temp_slide.jpg')
            
            print("\n✅ Press SPACE again to analyze another frame, or Q to quit\n")
    
    cap.release()
    cv2.destroyAllWindows()
    print("👋 Webcam closed")


def analyze_image(image_path: str, timestamp: float = 0.0):
    """Send an image to the slide analysis API"""
    
    if not Path(image_path).exists():
        print(f"❌ Image file not found: {image_path}")
        return
    
    print(f"🔄 Analyzing {image_path}...")
    
    try:
        with open(image_path, 'rb') as f:
            files = {'image': ('slide.jpg', f, 'image/jpeg')}
            data = {
                'timestamp': str(timestamp),
                'session_id': 'test_session'
            }
            
            response = requests.post(
                'http://localhost:8000/api/slide/analyze-frame',
                files=files,
                data=data,
                timeout=30
            )
        
        if response.ok:
            result = response.json()
            print("\n" + "="*60)
            print("📊 SLIDE ANALYSIS RESULTS")
            print("="*60)
            print(f"\n🎯 Overall Score: {result.get('overall_score', 0)}/10")
            print(f"⏰ Timestamp: {result.get('timestamp_formatted', '00:00')}")
            
            print(f"\n📝 Summary:")
            print(f"   {result.get('summary', 'No summary available')}")
            
            issues = result.get('issues', [])
            if issues:
                print(f"\n⚠️  Issues Found ({len(issues)}):")
                for i, issue in enumerate(issues, 1):
                    severity = issue.get('severity', 'unknown')
                    category = issue.get('category', 'Unknown')
                    problem = issue.get('issue', 'No description')
                    suggestion = issue.get('suggestion', 'No suggestion')
                    
                    severity_emoji = {
                        'critical': '🔴',
                        'high': '🟠',
                        'medium': '🟡',
                        'low': '🟢'
                    }.get(severity, '⚪')
                    
                    print(f"\n  {i}. {severity_emoji} [{severity.upper()}] {category}")
                    print(f"     Problem: {problem}")
                    print(f"     Fix: {suggestion}")
            else:
                print("\n✅ No major issues found!")
            
            print("\n" + "="*60 + "\n")
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"   {response.text}")
    
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Is the backend running at http://localhost:8000?")
    except requests.exceptions.Timeout:
        print("❌ Timeout: Gemini API took too long to respond")
    except Exception as e:
        print(f"❌ Error: {e}")


def main():
    print("="*60)
    print("🦈 SHARK VISION - Slide Content Analysis Tester")
    print("="*60)
    print()
    
    # Check if backend is running
    try:
        response = requests.get('http://localhost:8000/api/slide/health', timeout=2)
        if response.ok:
            data = response.json()
            print(f"✅ Backend: {data.get('status', 'unknown')}")
            print(f"✅ Gemini: {'Configured' if data.get('gemini_configured') else 'Not configured'}")
            print()
        else:
            print("⚠️  Backend health check failed")
            print()
    except:
        print("❌ Backend not accessible at http://localhost:8000")
        print("   Make sure to run: cd backend && python main.py")
        print()
        return
    
    if len(sys.argv) > 1:
        # Analyze provided image file
        image_path = sys.argv[1]
        analyze_image(image_path)
    else:
        # Use webcam
        capture_and_analyze_webcam()


if __name__ == '__main__':
    main()

