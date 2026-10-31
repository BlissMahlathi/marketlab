#!/bin/bash
# Kill any process listening on a range of ports (default 3000‑3422).
# Useful before starting Vite to avoid the "trying another one" cascade.

START=3000
END=3422

for ((p=START; p<=END; p++)); do
  PID=$(lsof -t -i:${p} 2>/dev/null || true)
  if [[ -n "$PID" ]]; then
    echo "Killing process $PID occupying port $p"
    kill -9 $PID
  fi
done

echo "Port range $START‑$END cleared."
