# SpotNxt AI Backend and Intelligence Blueprint

## Scope

This implementation preserves the existing Next.js App Router website and adds a server-only intelligence vertical slice. The first complete path is:

```text
Existing dashboard UI
  -> Next.js API route
  -> typed validation and request ID
  -> provider abstraction
  -> JSON persistence adapter
  -> evidence pack
  -> structured LLM call
  -> schema validation
  -> persisted analysis / assistant answer
  -> existing UI state
```

The storage adapter is intentionally replaceable. Local development uses a JSON file under `.data/` so the repository runs without requiring a database service. A production deployment can swap the adapter for PostgreSQL/Supabase without changing API contracts or AI orchestration.

## Implemented provider model

`AdDataProvider` is the domain boundary. `DemoAdProvider` exposes clearly labelled seed data from the existing project, while uploaded creatives are normalized into the same canonical `Ad` shape. The API never presents demo data as live external data and retains source attribution and freshness timestamps.

## Intelligence contracts

The analysis endpoint returns a typed `AIAnalysis` compatible with the current analyzer UI, plus model metadata, confidence, evidence, limitations, and request ID. The assistant endpoint returns observation, evidence, interpretation, recommendation, confidence, and citations. LLM output is requested with strict JSON Schema and validated again in application code.

## Feature matrix

| Feature | UI | API | Service | Persistence | AI | Event | Error handling | Test target |
|---|---|---|---|---|---|---|---|---|
| Creative analysis | Existing analyzer page | `POST /api/intelligence/analyze` | `analyzeAd` | Analysis record | Structured creative/copy/strategy analysis | `ANALYSIS_COMPLETED` | Typed 4xx/5xx response and request ID | Route + schema + LLM adapter |
| Grounded assistant | Existing assistant page | `POST /api/intelligence/assistant` | `answerQuestion` | Conversation context and analysis evidence | Grounded answer with citations | `ASSISTANT_COMPLETED` | No ungrounded fallback; returns configuration errors | Route + evidence pack |
| Ad inventory | Existing ad data and analyzer cards | `GET /api/intelligence/ads` | `AdDataProvider` | Canonical ads | Not required | `AD_DISCOVERED` on upload | Provider errors and source labels | Normalization + dedupe |
| Upload normalization | Existing analyzer upload affordance | `POST /api/intelligence/upload` | `UploadedAdProvider` | Canonical ad metadata and file | Available for subsequent analysis | `AD_DISCOVERED` | MIME/size validation | Upload validation |
| Intelligence summary | Existing dashboard-compatible data | `GET /api/intelligence/summary` | `getSummary` | Derived from stored ads/analyses | Not required | Summary is request-time fresh | Empty-state safe response | Summary aggregation |
| Runtime health | None required | `GET /api/health` | Runtime checks | None | LLM availability status | None | Stable health contract | Smoke test |

## Guardrails

Secrets are read only in server-side modules. No client component imports the LLM adapter. The assistant receives an evidence pack built from stored ads and analyses, and the prompt requires explicit uncertainty when evidence is insufficient. If no LLM credentials are configured, the API returns a structured `LLM_NOT_CONFIGURED` error instead of fabricated intelligence.

## Environment

- `OPENAI_API_KEY` and `OPENAI_API_BASE` or `BUILT_IN_FORGE_API_KEY` and `BUILT_IN_FORGE_API_URL`: server-side OpenAI-compatible model access.
- `SPOTNXT_AI_MODEL`: optional model override; defaults to `gpt-5` for high-quality structured reasoning.
- `SPOTNXT_DATA_DIR`: optional persistent data directory; defaults to `.data/` in the project root.
- `SPOTNXT_DEMO_MODE`: optional explicit demo provider flag; defaults to `true` for local seeded inventory.

The implementation does not alter the current visual design or remove existing routes.
