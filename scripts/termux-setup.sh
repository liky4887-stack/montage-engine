#!/data/data/com.termux/files/usr/bin/bash
# ClipForge engine setup for Termux. Run inside Termux on the same phone as the app.
set -e

echo "== ClipForge Termux setup =="
pkg update -y
pkg install -y nodejs git ffmpeg python postgresql cmake clang make binutils

echo "-- versions --"
node --version
npm --version
git --version
ffmpeg -version | head -1
python --version
psql --version

echo "== whisper.cpp (small model first) =="
if [ ! -d "$HOME/whisper.cpp" ]; then
  git clone https://github.com/ggml-org/whisper.cpp "$HOME/whisper.cpp"
fi
cd "$HOME/whisper.cpp"
if [ ! -f build/bin/whisper-cli ] && [ ! -f main ]; then
  cmake -B build -DGGML_OPENMP=OFF
  cmake --build build --config Release -j"$(nproc)"
fi
bash ./models/download-ggml-model.sh ggml-tiny.en || echo "model download failed; download ggml-tiny.en manually"

cd "$HOME"
echo "== yt-dlp (optional downloader, off by default) =="
pip install yt-dlp || echo "yt-dlp install failed; downloader stays disabled"

echo "== Codex CLI (Termux community fork) =="
echo "Install the Termux Codex fork, then run: codex login"
echo "If the browser flow fails try: codex login --device-auth"
echo "Never set OPENAI_API_KEY. Never copy auth files elsewhere."

echo "== FastMCP (optional; pinned) =="
pip install fastmcp==2.14.0 || echo "FastMCP failed to build on this device; MCP stays disabled"

echo "== Postgres =="
if [ ! -d "$PREFIX/var/lib/postgresql" ]; then
  initdb "$PREFIX/var/lib/postgresql" || true
fi
pg_ctl -D "$PREFIX/var/lib/postgresql" start || true
createdb clipforge 2>/dev/null || echo "db clipforge exists"
pg_ctl -D "$PREFIX/var/lib/postgresql" stop || true
echo "Postgres binds to localhost only by default in Termux. Keep it that way."

echo "== Android lifecycle checklist (do these before long jobs) =="
echo "1. termux-wake-lock while jobs run"
echo "2. Settings > Apps > Termux > Battery > Unrestricted"
echo "3. Android 14+: Developer options > 'Disable child process restrictions'"
echo "   Android 12-13: adb shell device_config put activity_manager max_phantom_processes 2147483647"
echo "4. Keep the screen on while exporting; short clips first"

cd "$(dirname "$0")/.."
npm install
echo "== doctor =="
npm run doctor
