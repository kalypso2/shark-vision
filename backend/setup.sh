#!/bin/bash

# Shark Vision Python Backend Setup Script

echo "🦈 Setting up Shark Vision Python Backend..."
echo ""

# Check Python version
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "✓ Python version: $python_version"

# Create virtual environment
echo ""
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "✓ Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "✓ Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo ""
echo "📥 Installing dependencies..."
pip install -r requirements.txt

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env and add your GEMINI_API_KEY"
echo "2. Run: source venv/bin/activate"
echo "3. Run: python main.py"
echo ""
echo "Server will start at http://localhost:8000"
echo "WebSocket endpoint: ws://localhost:8000/ws/analyze"

