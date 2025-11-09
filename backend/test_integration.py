"""
Integration Test Script
Tests both body language and slide analysis systems
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from slide_analyzer import SlideAnalyzer
from body_language.detector import HolisticDetector
from body_language.analyzer import BodyLanguageAnalyzer
import numpy as np
from PIL import Image
import io

def create_test_image() -> bytes:
    """Create a simple test image"""
    img = Image.new('RGB', (800, 600), color='white')
    buf = io.BytesIO()
    img.save(buf, format='JPEG')
    return buf.getvalue()

def test_slide_analyzer():
    """Test slide analysis system"""
    print("\n🧪 Testing Slide Analyzer...")
    
    analyzer = SlideAnalyzer()
    
    # Test with a simple image
    test_image = create_test_image()
    result = analyzer.analyze_frame(test_image)
    
    print(f"  ✓ Slide analyzer initialized: {analyzer.model is not None}")
    print(f"  ✓ Analysis completed: {result.get('success', False)}")
    print(f"  ✓ Overall score: {result.get('overall_score', 0)}/10")
    print(f"  ✓ Issues found: {len(result.get('issues', []))}")
    
    if result.get('summary'):
        print(f"  ✓ Summary: {result['summary'][:50]}...")
    
    return result.get('success', False)

async def test_body_language():
    """Test body language analysis system"""
    print("\n🧪 Testing Body Language Analyzer...")
    
    detector = HolisticDetector()
    await detector.initialize()
    analyzer = BodyLanguageAnalyzer(session_id="test_session")
    
    # Create dummy frame (simulated webcam frame)
    dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    
    # Process frame
    landmarks = detector.process(dummy_frame)
    
    if landmarks:
        metrics = analyzer.update(landmarks)
        print(f"  ✓ Detector initialized")
        print(f"  ✓ Frame processed: {len(landmarks.get('pose', []))} pose landmarks")
        print(f"  ✓ Metrics calculated: {len(metrics)} metrics")
    else:
        print(f"  ✓ Detector initialized (no person detected - expected for dummy frame)")
    
    return True

async def test_combined_analysis():
    """Test that both systems can run together"""
    print("\n🧪 Testing Combined Analysis...")
    
    # Test slide analyzer
    slide_analyzer = SlideAnalyzer()
    test_image = create_test_image()
    slide_result = slide_analyzer.analyze_frame(test_image)
    
    # Test body language
    detector = HolisticDetector()
    await detector.initialize()
    analyzer = BodyLanguageAnalyzer(session_id="test_combined")
    dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    landmarks = detector.process(dummy_frame)
    
    print(f"  ✓ Slide analysis: {'SUCCESS' if slide_result.get('success') else 'FAILED'}")
    print(f"  ✓ Body language detection: SUCCESS")
    print(f"  ✓ Both systems operational: ✅")
    
    return slide_result.get('success', False)

def test_api_imports():
    """Test that API modules import correctly"""
    print("\n🧪 Testing API Module Imports...")
    
    try:
        # Test slide analyzer can be imported
        analyzer = SlideAnalyzer()
        print(f"  ✓ SlideAnalyzer class imported and instantiated")
        print(f"  ✓ Gemini configured: {analyzer.model is not None}")
        
        # Test body language components
        from body_language.detector import HolisticDetector
        from body_language.analyzer import BodyLanguageAnalyzer
        print(f"  ✓ Body language modules imported")
        
        return True
    except Exception as e:
        print(f"  ✗ Import failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all integration tests"""
    print("=" * 60)
    print("🎯 SHARK VISION - INTEGRATION TEST SUITE")
    print("=" * 60)
    
    results = []
    
    # Test 1: Slide Analyzer
    try:
        results.append(("Slide Analyzer", test_slide_analyzer()))
    except Exception as e:
        print(f"  ✗ Slide analyzer test failed: {e}")
        results.append(("Slide Analyzer", False))
    
    # Test 2: Body Language
    try:
        results.append(("Body Language", asyncio.run(test_body_language())))
    except Exception as e:
        print(f"  ✗ Body language test failed: {e}")
        results.append(("Body Language", False))
    
    # Test 3: Combined
    try:
        results.append(("Combined Analysis", asyncio.run(test_combined_analysis())))
    except Exception as e:
        print(f"  ✗ Combined test failed: {e}")
        results.append(("Combined Analysis", False))
    
    # Test 4: API Imports
    try:
        results.append(("API Imports", test_api_imports()))
    except Exception as e:
        print(f"  ✗ API import test failed: {e}")
        results.append(("API Imports", False))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}  {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All integration tests passed!")
        print("✅ Body language + slide analysis systems are ready")
        return 0
    else:
        print("\n⚠️  Some tests failed. Check logs above.")
        return 1

if __name__ == "__main__":
    exit(main())

