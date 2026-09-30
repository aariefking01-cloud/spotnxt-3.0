# Competitor Intelligence Upgrade Blueprint

## Scope

The existing SpotNxt-AI dashboard remains the source UI. This upgrade adds a server-backed competitor search and analysis vertical slice without replacing the current navigation, cards, visual theme, or ad-level analyzer.

## Truth and freshness

The current provider is `DemoAdProvider`, so results must be labelled `Demo data` and must not use live or synchronized claims. Freshness is derived only from canonical ad timestamps. The API returns `observedThrough`, `recordCount`, `sourceLabel`, and `freshnessLabel` so the UI can display an honest data period.

## Search contract

`GET /api/intelligence/competitors?q=<query>` returns normalized competitor profiles aggregated from canonical ads. A query matches advertiser name, advertiser ID, platform, headline, primary text, or metadata. Empty queries return the full indexed set. Missing or invalid data returns a structured error and never fabricates a company.

## Analysis contract

`POST /api/intelligence/competitors/analyze` accepts `{ competitorId, force? }`. It first builds a bounded evidence pack from the selected competitor’s actual canonical ads. It then runs one structured competitor synthesis call using a routed model: `SPOTNXT_COMPETITOR_MODEL` when configured, otherwise the strongest available configured default (`gpt-5` for text reasoning, with `gpt-5-mini` remaining the ad-analysis default). The response includes model ID, prompt version, confidence, evidence IDs, limitations, source label, observed-through timestamp, and structured insights.

## Staged processing

The analysis route records real lifecycle events for collection, creative analysis, messaging analysis, audience/positioning synthesis, pattern comparison, opportunity detection, and recommendation generation. The client polls `/api/intelligence/events` while the actual LLM request runs. No artificial sleep is used; stages represent backend milestones and stop immediately on success or failure.

## Structured result sections

The competitor result contains overview, creative intelligence, copy intelligence, positioning, trend intelligence, strategic opportunities, strengths, weaknesses, and actionable recommendations. Every section is generated from the selected competitor’s evidence pack and states when a claim is inference or when the available data is insufficient.

## Model routing

| Task | Default route | Required capability |
|---|---|---|
| Ad image and creative analysis | `SPOTNXT_AI_MODEL` or `gpt-5-mini` | Vision + JSON Schema |
| Competitor synthesis | `SPOTNXT_COMPETITOR_MODEL` or `gpt-5` | Reasoning + JSON Schema |
| Large multimodal/long-context fallback | `SPOTNXT_VISION_MODEL` or `gemini-3-flash-preview` | Vision + long context |
| Grounded assistant | `SPOTNXT_ASSISTANT_MODEL` or `gpt-5-mini` | JSON Schema |

The server reports the actual model ID returned by the selected configuration. No model is described as active unless the configured request succeeds.
