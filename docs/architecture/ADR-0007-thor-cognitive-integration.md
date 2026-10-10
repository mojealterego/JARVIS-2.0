# ADR-0007 — Cognitive architecture and THOR research intake

Status: **Accepted as staged design, not implemented**  
Target: JARVIS OMEGA INFINITY Android application and existing Node backend.

## Evidence and boundaries
Inputs: user-provided THOR multi-agent architecture report and *Analiza AGI I Ludzkich AI* (17-page research report). These are design inputs, **not** evidence that the described components already run or that AGI/ASI has been achieved.

## Existing baseline (verified 2026-10-10)
- Android: Expo Router / React Native, `jarvis-2-android/`.
- Backend: Node entrypoint `backend/server.mjs`, `JarvisService`, `FileStateStore`, `OpenAIGateway`.
- CI: `.github/workflows/jarvis-android.yml` builds Android with EAS and a Gradle fallback.
Do not replace this baseline with an unrelated monorepo or break the APK build.

## Target component contracts
1. **Cognitive router:** accepts a user request, device capability summary, privacy mode, latency budget and permitted tool scopes; returns a plan with provider selection and estimated cost. Cloud requests require explicit network availability and configured credentials.
2. **Memory:** working/session/episodic/semantic stores with provenance, timestamp, subject, TTL, access scope and deletion. Start with backend storage interfaces and migration tests; add hybrid retrieval and temporal graph behind adapters. Never treat extracted third-party text as instructions.
3. **Agent orchestration:** bounded DAG tasks with IDs, owner scopes, deadlines, cancellation, retries, idempotency keys and audit trails. Tool execution is denied by default and requires capability-specific authorization; consequential actions require approval.
4. **MCP gateway:** registry with schema validation, per-server allowlists, timeouts, output-size caps, token redaction and prompt-injection isolation. Never load hundreds of schemas into a model context by default.
5. **Android sensory layer:** opt-in microphone and camera permissions, visible capture indicators, explicit background behavior and on-device preprocessing where feasible. Voice and vision are features, not claims of persistent surveillance.
6. **Local inference:** native Android integration and model download manager as an isolated optional module; measure available memory, context/KV-cache consumption, thermal throttling, tokens/s and OOM. Select a model from measured headroom, not just advertised RAM. Do not modify vendor Vulkan libraries or hard-code device driver paths.
7. **Controlled self-improvement:** generate candidate skills/tools in a staging directory, lint and test in isolated runners, require review before publishing, record versions and support rollback. No self-granted privileges.
8. **Creative workloads:** video, music and PDF jobs execute asynchronously on suitable workers with quotas, licensing checks and downloadable artifacts. Android acts as client; do not assume desktop GPU models fit mobile hardware.

## Research corrections
- Zenoh is a transport/data fabric; Byzantine consensus is **not** provided merely by using Zenoh.
- A Z3 SAT result over unconstrained Boolean placeholders does **not** prove generated code memory-safe or terminating. Formal verification requires a sound program-to-constraints translation and clearly scoped properties.
- Android TrustZone/TEE is not a general-purpose hosting environment for arbitrary application MCP servers.
- `mmap` does not guarantee GPU-only allocation, zero copies, or freedom from OOM.
- The sample Agora registration hash is not authentication: anyone can recompute it. Use signed receipts with trusted key identities and replay protection.
- WebContainers are not a general Python/Linux runtime and should not be treated as a native React Native feature. Monaco/XYFlow are web-oriented; expose them through a separately secured web workspace or build native alternatives.
- Model names, benchmark numbers, claimed latencies, performance and licensing in research material require independent verification before being used as product claims.
- Generated media is not automatically free of copyright or licensing obligations.

## Implementation order and measurable acceptance
### P0 — Baseline
- Run backend tests and Android typecheck/tests; produce a traceable APK artifact with commit SHA.
- Verify API auth, input limits, errors, secrets isolation, app/backend connection.
- **Gate:** CI green, installable APK and a documented smoke-test transcript.

### P1 — Memory and orchestrator
- Implement versioned memory records with CRUD, retrieval provenance and delete/export; test isolation between users and sessions.
- Implement task DAG execution with cancellation, approval checks, retries and durable audit.
- **Gate:** deterministic tests for access denial, prompt injection, replay, cancellation and recovery.

### P2 — Multimodal and local intelligence
- Camera/mic opt-in flows; voice interruption and graceful offline behavior.
- Native GGUF spike with measured device profiles; no unconditional auto-download of large models.
- **Gate:** measured cold start, memory peak, thermal behavior, offline correctness and permission revocation.

### P3 — Agent/skill ecosystem
- MCP registry and per-tool capability enforcement; staging-based skill creator; isolated sandbox executor.
- **Gate:** malicious-tool fixtures blocked, no secret leakage, rollback and reproducible evaluations.

### P4 — Creative studio and advanced research
- Async video/music/report jobs, native or secured web builder, experimental symbolic reasoning behind flags.
- **Gate:** job recovery, quota enforcement, verified licenses and end-to-end output checks.

## Non-goals
No claim of AGI, ASI, human consciousness, mathematically proven safety of arbitrary generated code, automatic censorship removal, or unrestricted system privileges. All advanced claims require independent evidence and repeatable evaluation.
