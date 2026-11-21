# ClipForge AI

A mobile-only (iOS + Android) AI video clipping app built with Expo. Turn long-form videos into short, shareable clips with AI curation, virality scoring, and animated captions.

## Features

- **Anonymous usage** — no login or onboarding. A persistent `deviceId` is generated on first launch and sent as an `x-device-id` header on every API request.
- **Import Video** — pick from your gallery (local upload) or paste a YouTube link.
- **AI Curation Settings** — custom prompt, genre, clip durations (30s / 60s / 90s), auto-hook, skip slicing, captions, emojis, watermark, and aspect ratio (9:16 / 1:1 / 16:9).
- **Processing** — live circular progress with stage list (Transcribing → AI Analysis → Rendering), polling every 3 seconds.
- **Clip Results** — horizontal card swiper with thumbnail, virality score, and duration; tap for a full-screen native video player with download and share.

## API Contract

Base URL: `http://localhost:3000/api` (override with `EXPO_PUBLIC_API_URL`).

| Endpoint | Purpose |
| --- | --- |
| `POST /source-videos` | Preflight a source video |
| `POST /upload-links-v2` | Get a simulated S3 upload link |
| `POST /clip-projects` | Create a clip project |
| `GET /clip-projects` | List past projects |
| `GET /cluster-jobs/{projectId}/progress` | Poll processing progress |
| `GET /exportable-clips?projectId=` | Fetch finished clips |

## Run

```bash
npm install
npm run dev
```

Then scan the QR code with Expo Go on iOS or Android.

## Tech

Expo (SDK 58), expo-router, zustand, axios, expo-video, expo-image-picker, expo-sharing, lucide-react-native. Dark mode throughout (`#0A0A0A` background, `#6366F1` accent), styled exclusively with `StyleSheet.create`.
