#!/bin/bash

# Start ngrok tunnels for both frontend and backend
echo "🚀 Starting ngrok tunnels..."

# Kill any existing ngrok processes
pkill -9 ngrok 2>/dev/null
sleep 2

# Start frontend tunnel (port 3001)
echo "📱 Starting frontend tunnel (port 3001)..."
./ngrok http 3001 --log=stdout > ngrok-frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait a bit for first tunnel to start
sleep 3

# Start backend tunnel (port 8000)
echo "🔧 Starting backend tunnel (port 8000)..."
./ngrok http 8000 --log=stdout > ngrok-backend.log 2>&1 &
BACKEND_PID=$!

# Wait for tunnels to initialize
sleep 5

# Display tunnel URLs
echo ""
echo "✅ Ngrok tunnels started!"
echo ""
echo "📊 Tunnel Status:"
curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[] | "  \(.proto)://\(.public_url | sub("https://"; "")) -> \(.config.addr)"'
echo ""
echo "Frontend PID: $FRONTEND_PID"
echo "Backend PID: $BACKEND_PID"
echo ""
echo "🌐 Access your app:"
curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[] | select(.config.addr | contains("3001")) | "  \(.public_url)/analysis-python"' | head -1
echo ""
echo "📝 Logs:"
echo "  Frontend: tail -f ngrok-frontend.log"
echo "  Backend: tail -f ngrok-backend.log"
