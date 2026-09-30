# SpotNxt-AI Production Migration Plan

## Operating principles

The existing UI and product identity remain the product surface. The backend becomes source-truthful: a configured provider is the only source of live data, demo inventory is opt-in for local development, and unavailable/unauthorized capabilities produce explicit states rather than synthetic records.

Every normalized record carries provenance, source URL when available, provider, API version, observed/ingested/updated timestamps, market/country, permissions context, confidence, and freshness state. AI outputs may only claim what the evidence pack supports and must distinguish observation, interpretation, recommendation, and limitation.

## Provider capability matrix

| Provider | Official capability | Required access | Competitor-ad limitation | Product state |
|---|---|---|---|---|
| Meta Ad Library | Authorized archive queries within Meta's documented scope | Facebook account, app access, access token, policy-compliant usage | Not unrestricted global commercial-ad coverage; fields vary by ad type/region | Adapter boundary + explicit permission state |
| Google Ads | Authorized account/campaign reporting and management | OAuth, developer token, customer account access | Not a public competitor-ad archive | Adapter boundary + unavailable competitor state |
| YouTube Data API | Public/authorized channel, video, playlist, thumbnail, and metadata access | API key and/or OAuth | Not private ad-campaign data | Adapter boundary + public-signal state |
| WhatsApp Business | Authorized business messaging, account management, analytics, templates, and webhooks | Business portfolio, OAuth/token permissions, WABA access | Not a public WhatsApp ad library | Separate business-data adapter |
| Instagram/Facebook business | Authorized account/page data through Meta permissions | OAuth and granted scopes | No access claim without verification | Permission-gated adapter boundary |
| Other platforms | Only official/approved APIs or user-authorized data | Provider-specific | Unavailable through approved API when not configured | Capability registry state |

## Typed staged agent contract

The current orchestration is strengthened into one typed pipeline with thirteen responsibilities. A role is not counted as an active agent unless it actually runs and emits a typed result. A single configured LLM may serve multiple roles through explicit routing, and the final report must record the model used for each executed role.

| Stage | Agent role | Input | Output | Evidence gate |
|---|---|---|---|---|
| 01 | Data Acquisition | Provider capability + query | Source records + provider status | No records without approved source |
| 02 | Entity Resolution | Company identifiers | Canonical company identity | Match confidence required |
| 03 | Ad Intelligence | Normalized ads | Ad-level patterns | Source/provenance per ad |
| 04 | Creative Vision | Creative media | Visual/format observations | Only when media is available |
| 05 | OCR & Copy | Headline/body/CTA/OCR | Messaging patterns | No inferred text without source |
| 06 | Audience Intelligence | Copy/creative metadata | Audience signals | Label inference and confidence |
| 07 | Competitive Strategy | Company + evidence pack | Positioning, strengths, weaknesses | Evidence IDs required |
| 08 | Trend Detection | Observed timestamps + records | Time-bounded patterns | Period must be explicit |
| 09 | Cross-Platform Intelligence | Platform-normalized signals | Comparison | Only comparable fields |
| 10 | Performance Intelligence | Authorized metrics | Performance observations | No metrics means insufficient evidence |
| 11 | Forecasting | Time series + confidence | Scenarios | Scenario labels, not facts |
| 12 | Compliance & Evidence | All intermediate outputs | Claims validation + limitations | Blocks unsupported claims |
| 13 | Executive Intelligence | Validated sections | Final report + actions | Models, evidence, freshness included |

## Model routing contract

| Role family | Primary route | Fallback | Rule |
|---|---|---|---|
| Vision/OCR | Configured vision-capable model | Fast structured model | Never send image claims to text-only route |
| Retrieval | Store/index retrieval | Deterministic lexical match | No fabricated evidence |
| Long synthesis | Strong configured reasoning model | Fast structured model | Record actual model and fallback notice |
| Assistant | Fast grounded model | Strong model | Answer insufficient evidence explicitly |
| Compliance | Deterministic checks + structured model | Deterministic checks only | Fail closed on provenance gaps |

## Delivery order

1. Remove the deprecated short-form platform from the domain and all product content.
2. Make demo provider opt-in and fail closed to `Live data source not connected` when live mode lacks a compliant provider.
3. Add provider capability/health diagnostics and provenance metadata.
4. Add typed multi-stage orchestration contracts and evidence gates without pretending all roles are externally configured.
5. Connect provider states, market filters, freshness, and unavailable states to the existing pages.
6. Verify typecheck, build, API failures, repeated analysis/search, exports, upload analysis, browser console, and preview.
