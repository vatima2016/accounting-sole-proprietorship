#!/usr/bin/env bash
# Start backend and frontend dev servers

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Starting backend (port 3020)..."
cd "$ROOT/backend" && npm run dev &
BACKEND_PID=$!

echo "Starting frontend (port 5173)..."
cd "$ROOT/frontend" && npm run dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT

echo ""
echo "Backend:  http://localhost:3020"
echo "Frontend: http://localhost:5173"
echo ""
echo "Stop with: npm stop or Ctrl+C"

wait
