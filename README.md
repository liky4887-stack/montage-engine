# ClipForge engine (Termux side)

This is the engine half of ClipForge. It runs **inside Termux on the same Android
phone** as the ClipForge Expo app. It is not an AI provider API and costs nothing:
it is my app talking to my own engine over the phone's loopback interface
(`127.0.0.1:8787`). It never talks to the internet to do its work.

## What it does today (Phase 1)

- **Pairing**: on start it prints a one-time 6-digit code in the Termux window.
  Type it once in the app; the app gets a short-lived access token plus a refresh
  token. Every request after that needs the access token. Pairing attempts are
  rate limited.
- **Device check** (`GET /capabilities`): ffmpeg presence, Node version, free
  storage (new jobs are refused under 2 GB free), and what is still missing
  (whisper.cpp, Codex CLI, headless Chromium — all installed by the setup script
  or left in manual mode).
- **Chunked upload** (5 MB pieces, resumable by re-sending from the failed chunk,
  SHA-256 per file), probed with ffprobe on arrival.
- **Jobs**: probe and trim-export (including 9:16 crop), one at a time, with live
  progress over server-sent events. If Android kills a job (signal 9), the job is
  marked "Killed by Android" instead of pretending it finished.
- **EditPlan validation**: the only thing the AI may ever produce. Rejects shell
  text, filesystem paths, unknown file ids, out-of-range times, unknown template
  ids. Manual edits are stored as separate JSON overrides so re-asking the AI
  never wipes them.

## Install (inside Termux)

```sh
pkg install git nodejs
git clone <this repo>
cd clipforge-engine
bash scripts/termux-setup.sh
npm start
```

The setup script prints every installed version, builds whisper.cpp, and ends
with `npm run doctor`. The engine binds to `127.0.0.1` only. Never change that.

## Android lifecycle

Run `termux-wake-lock` while jobs run, exempt Termux from battery optimisation,
and turn off the phantom process killer (Android 14+: Developer options >
"Disable child process restrictions"; Android 12-13: adb `max_phantom_processes`).

## Tests

```sh
npm test
```

Covers EditPlan validation (including malicious plans), pairing and token expiry,
and path-traversal safety. Passing these on a computer does NOT prove the video
work works on Android — fill in `DEVICE_TEST.md` on the real phone.
