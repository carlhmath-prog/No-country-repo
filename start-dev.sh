
#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo "==> Levantando backend y base de datos con Docker Compose"
docker compose up --build -d

echo "==> Esperando la API en el puerto 8000"
API_READY=false
for attempt in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:8000/ >/dev/null 2>&1; then
    API_READY=true
    break
  fi
  sleep 1
done

if [ "$API_READY" != true ]; then
  echo "ERROR: la API no respondió en http://localhost:8000. Logs del backend:"
  docker compose logs --tail=80 backend
  exit 1
fi

echo "==> Levantando frontend con Vite"
cd "$ROOT_DIR/frontend"
if [ ! -d node_modules ]; then
  npm install
fi

if curl -fsS http://127.0.0.1:5173/ >/dev/null 2>&1; then
  echo "Frontend ya responde en http://localhost:5173"
else
  if ss -ltn | grep -q ':5173 '; then
    echo "ERROR: el puerto 5173 está ocupado, pero no responde como frontend."
    ss -ltnp | grep ':5173 ' || true
    exit 1
  fi

  nohup npm run dev -- --host 0.0.0.0 --port 5173 --strictPort > "$ROOT_DIR/.frontend.log" 2>&1 &
  FRONTEND_PID=$!
  echo "$FRONTEND_PID" > "$ROOT_DIR/.frontend.pid"

  for attempt in $(seq 1 20); do
    if curl -fsS http://127.0.0.1:5173/ >/dev/null 2>&1; then
      break
    fi
    if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
      echo "ERROR: Vite terminó al iniciar. Log: $ROOT_DIR/.frontend.log"
      cat "$ROOT_DIR/.frontend.log"
      rm -f "$ROOT_DIR/.frontend.pid"
      exit 1
    fi
    sleep 0.5
  done

  if ! curl -fsS http://127.0.0.1:5173/ >/dev/null 2>&1; then
    echo "ERROR: Vite no respondió en http://localhost:5173."
    cat "$ROOT_DIR/.frontend.log"
    exit 1
  fi
fi

echo ""
echo "Proyecto levantado:"
echo "- Frontend: http://localhost:5173"
echo "- Backend: http://localhost:8000"
echo "- Swagger: http://localhost:8000/docs"
echo "- Logs frontend: $ROOT_DIR/.frontend.log"
