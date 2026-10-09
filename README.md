<div align="center">

<img src="./assets/social-preview.svg" alt="JARVIS 2.0 — project visual" width="100%">

## MOJEALTEREGO · PROJECT PROFILE

</div>

---

# JARVIS 2.0

Real Android AI assistant project.

## Repository layout

- `jarvis-2-android/` — native Android application built with Expo / React Native.
- `backend/` — authenticated Node.js API used by the mobile client.
- `.github/workflows/` — cloud APK build pipeline using EAS Build.

## Security

Secrets are never committed to this repository. The backend reads credentials from environment variables. The Android client stores its API URL and bearer token in secure device storage.

For CI, configure the GitHub Actions repository secret `EXPO_TOKEN` with an Expo access token. Never paste the token into source files or chat.

## Android build

The `preview` EAS profile produces an installable APK. The `production` profile is configured for an Android App Bundle.

## Backend

The backend defaults to port `8787` and supports authenticated API access through `JARVIS_API_TOKEN`. Its current persistence layer is a JSON state file; PostgreSQL configuration is reserved for the next persistence phase.

## Current status

Android compilation repairs and connection improvements are being verified through GitHub Actions. The APK workflow waits for EAS and downloads a completed APK. When EAS is unavailable, it builds an internal testing APK and AAB with Gradle and the generated debug keystore. Build provenance and SHA-256 checksums are included with each artifact.

The mobile app preserves stored credentials on settings changes, validates server URLs, sends conversation history, loads the agent response envelope, handles microphone errors and supports task completion. Public servers require HTTPS; local HTTP is supported only for private IP addresses and localhost.

An installable APK is published as a GitHub Actions artifact only after compilation finishes. An internal testing AAB is not a Play Store release.
