# JARVIS OMEGA INFINITY — architecture implementation contract

Status: target architecture, **not** a claim that every subsystem is implemented.

## Product acceptance gate

The product is an installable Android application. Each milestone must identify an exact Git revision, Android APK/AAB artifact, build logs, signing provenance, checksums and device validation status. A web mockup does not satisfy this gate. Preserve the current Expo/React Native Android project and Node.js backend until an explicit, tested migration is approved.

## Seven logical layers and boundaries

| Layer | Ownership | First verifiable deliverable |
| --- | --- | --- |
| Cognitive core | Intent routing, planning, policy decisions | Typed plan with bounded steps and explicit tool approvals |
| Memory | Working/episodic records, semantic retrieval, temporal links | Durable state, retrieval, provenance, user deletion, migrations |
| Multi-agent | Orchestrator, bounded workers, verification | Agent registry, task lifecycle, budgets, audit, cancellation |
| Multimodal | Camera, screen, microphone, voice | Permission-gated Android camera/mic and actual device smoke tests |
| Self-improvement | Skill proposals and evaluations | Generate **inactive** candidate, test in sandbox, human approval to activate |
| Execution | Android, cloud sandbox, inference, MCP | Capability-scoped backend tools and hardware profiling evidence |
| Experience | Polish UI, cyborg identity, agent workspace | Accessible native screens, working flows, crash-free smoke tests |

## Deployment order and dependencies

### Phase 1 — stabilize what exists (release blocker)
1. Keep backend authentication, credential storage, TLS requirements and state corruption protection.
2. Run backend and mobile tests, TypeScript, dependency audit, Expo compatibility, Android build.
3. Verify backend URL, microphone permission, transcription, chat, TTS, task persistence on a physical device.
4. Publish a preview APK with exact build SHA and digest; mark untested hardware paths as unverified.

### Phase 2 — incremental capability slices
1. Introduce a versioned memory schema with source attribution, temporal fields, retention/deletion and deterministic lexical search. Add embeddings only after an evaluation corpus exists.
2. Introduce typed agent actions and explicit execution state machine: queued → running → completed/failed/cancelled, with timeouts, retries, idempotency and audit.
3. Add on-device model **profiling** (RAM headroom, thermal throttling, token throughput, context allocation, supported backends) before any model recommendation; record actual device measurements.
4. Integrate camera/voice through permission-gated native modules. Android Accessibility is optional and requires informed user opt-in; never assume unrestricted screen capture.
5. Treat Zenoh as an optional transport, not a source of consensus. Start with signed events and a single authority. BFT requires a specified fault model, quorum and membership protocol, then adversarial tests.

### Phase 3 — controlled extensions
1. Tool/Skill Creator writes candidate artifacts to an isolated workspace, never directly into executable trusted paths.
2. Validate JSON schemas, permissions, provenance, dependencies, tests and sandbox behavior before explicit approval.
3. Use Z3 only on formally specified properties of a supported subset of operations. SAT of unconstrained booleans is **not** a proof of program safety.
4. Add optional cloud adapters for media generation, document compilation and browser extraction behind quotas, explicit credentials and observable jobs.
5. Introduce workspace IDE/NoCode components only when compatible with the Android runtime; Monaco/WebContainers and XYFlow are browser-centric and need a supported embedded-web or remote-workspace design.

## Corrections required before copying the supplied examples

- Rust examples reference nonexistent project-local crates/types and version-sensitive Zenoh/Z3 APIs; they are **illustrative**, not compilable modules.
- The proposed Z3 sample does not assert safety requirements in a way that proves them; satisfiability is not a security certificate.
- The Python tool creator assumes an LLM response dictionary and overwrites a fixed file; require structured validation, unique artifact IDs, path isolation and review.
- The Agora hash derived from public data is not authentication. Use signed receipts, authenticated identities, replay protection and an explicit trust root.
- MCP stdio execution of arbitrary user-supplied server paths is code execution; require an allowlist and sandbox.
- Do not force Android Vulkan ICD paths, pretend mobile VRAM is discrete, or depend on undocumented allocator environment variables. Probe supported Vulkan devices and fall back safely.
- Do not treat 14B GGUF viability as established from total RAM. Measure sustained throughput, memory pressure, temperature and battery drain.
- Wan/AudioCraft GPU examples target server-class CUDA environments, not a proven phone-local pipeline. RIFE 60 FPS is a separate optional measured stage.
- LiveKit streaming requires correctly framed PCM, track lifecycle, interruption handling and authentication; the provided Kokoro interface is unverified.
- A generated Typst PDF is not automatically PDF/A compliant; validate conformance independently.
- Web crawling must block private network targets, redirects to internal hosts and oversized responses; untrusted page text must not become agent instructions.
- E2B requires verified SDK versions, secrets, resource quotas, timeouts and cleanup. MicroVM isolation is not a blanket guarantee against all attacks.
- Skill pruning should archive/disable only after usage metrics and regression tests; never silently delete baseline capabilities. The stated count of 333 baseline skills is a **target requiring inventory**, not an audited count.

## Release evidence

For each subsystem record: repository SHA, source paths, dependency versions, commands executed, tests passed/failed, Android device model/API level, measured latency and memory/thermal results where relevant, security approvals and exact artifact digest. Label missing evidence UNVERIFIED, not PASS.

## Current observed baseline

Existing repository uses Expo SDK 57 / React Native and Node.js backend, with JSON-file persistence and authenticated APIs. Existing automation records are configuration only; agent swarm execution, Zenoh/BFT, local GGUF, native camera and formal verification are **not established** by the current code inspection. Preserve that distinction in all release notes.
