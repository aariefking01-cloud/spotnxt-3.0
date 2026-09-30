# SpotNxt-AI Master Brief Audit

## Current repository baseline

The project is an existing Next.js 13.5.1 App Router application using npm and the existing `app/`, `components/`, `lib/`, and `app/api/` structure. It already has server-side intelligence routes for health, ads, ad analysis, assistant, competitors, competitor analysis, events, summary, and upload. The current frontend includes the dashboard, Ad Library, Creative Analyzer, Competitors, Assistant, Reports, Trends, Recommendations, Saved Intelligence, Settings, Notifications, and provider-adjacent admin surfaces.

## Confirmed demo/static assumptions

The backend still contains `DemoAdProvider` and selects it unless `SPOTNXT_DEMO_MODE=false` with a configured live provider. The store seeds demo inventory and demo-derived competitor profiles. The current source-labeling safeguards are honest about the demo state, but the product is not yet production-live by default.

The repository contained extensive references to a deprecated short-form platform in the server platform union, frontend data, trend narratives, recommendations, dashboard copy, and ad records. These must be removed from the target platform set rather than hidden with a UI filter.

The current competitor workflow searches locally indexed canonical ads and returns normalized demo profiles. It does not yet query an approved external company source or implement OAuth-backed Meta, Google, YouTube, Instagram, WhatsApp, LinkedIn, or Pinterest connectors. No live provider credentials were supplied in this task, so the correct behavior is to expose truthful unavailable/permission-required states rather than fabricate live results.

## Existing AI baseline

The current LLM adapter already supports structured JSON Schema output, an OpenAI-compatible provider, server-side secrets, configurable ad/competitor/assistant routing, bounded requests, and evidence/limitation output. The competitor workflow now has a single structured synthesis route with real staged lifecycle events. It is not yet a full 13-agent graph, and the implementation must not pretend that 13 independent agents or 13 independently configured models are running when they are not.

## Migration priorities

1. Remove the deprecated short-form platform from domain types, seeded data, UI data, trends, recommendations, reports, documentation, and provider logic.
2. Make demo mode opt-in and make unavailable live data explicit instead of silently falling back to demo inventory.
3. Introduce source/provenance/permission/freshness/provider-health contracts that every normalized record can carry.
4. Add provider capability and connection-status APIs/UI without claiming OAuth or permissions have been granted.
5. Strengthen the current competitor orchestration into typed stages/agent roles with evidence gates, model routing, and executive synthesis while retaining the existing UI.
6. Preserve the existing preview and verify typecheck, build, API failures, no-provider states, exports, search, analysis, and browser console behavior.

## Truthful limitations

Meta Ad Library/Marketing data, Google Ads, YouTube, Instagram, WhatsApp Business, and other platform data require provider-specific official APIs, OAuth, permissions, rate limits, and terms compliance. Without those credentials and approvals, the system must report `Unavailable through an approved API` or `Connect [provider] to enable this feature`; it must never present local demo records as live data.
