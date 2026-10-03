#!/bin/sh
set -eu

if [ "${STV_REMOTE_DESKTOP_ENABLED:-false}" = "true" ] || [ "${STV_REMOTE_DESKTOP_ENABLED:-false}" = "1" ]; then
  export DISPLAY="${DISPLAY:-:99}"
  export NOVNC_ASSET_DIR="${NOVNC_ASSET_DIR:-/usr/share/novnc}"

  Xvfb "$DISPLAY" -screen 0 1280x720x24 -ac >/tmp/xvfb.log 2>&1 &
  xvfb_pid=$!

  display_ready=false
  for attempt in $(seq 1 50); do
    if xdpyinfo -display "$DISPLAY" >/dev/null 2>&1; then
      display_ready=true
      break
    fi
    sleep 0.1
  done

  if [ "$display_ready" != "true" ]; then
    echo "Xvfb did not start on $DISPLAY" >&2
    exit 1
  fi

  x11vnc -display "$DISPLAY" -rfbport 5900 -localhost -forever -shared -nopw >/tmp/x11vnc.log 2>&1 &
  x11vnc_pid=$!
  websockify --web="$NOVNC_ASSET_DIR" 127.0.0.1:6080 127.0.0.1:5900 >/tmp/websockify.log 2>&1 &
  websockify_pid=$!

  trap 'kill "$websockify_pid" "$x11vnc_pid" "$xvfb_pid" 2>/dev/null || true' EXIT INT TERM
fi

exec python3 -m uvicorn main:app --host 0.0.0.0 --port 7860
