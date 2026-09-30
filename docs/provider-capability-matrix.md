# Official Provider Capability Matrix

## Meta Ad Library API

Meta's official Ad Library API requires a Facebook account and application access. The documented API is centered on political/social-issue/election ads globally and all ad types delivered in the UK/EU, with country-specific query parameters and publisher-platform metadata. It can expose Library IDs, page identity, creative text, delivery dates, publisher platforms, media type, and ad snapshot URLs, subject to the applicable terms and access scope. It does not justify claiming unrestricted global competitor-ad coverage or arbitrary spend/performance metrics.

Source: https://www.facebook.com/ads/library/api/

## Google Ads API

Google's official Google Ads API is an authenticated interface for managing and reporting on the user's own Google Ads accounts and campaigns. It is appropriate for authorized account/campaign synchronization, custom reporting, ad management, and bidding workflows. It must not be represented as a general public competitor-ad archive. Public competitive signals require a separate approved source or an explicit unavailable state.

Source: https://developers.google.com/google-ads/api/docs/get-started/introduction

## YouTube Data API

The official YouTube Data API exposes authorized resource operations for channels, videos, playlists, search results, thumbnails, and public metadata. Requests require an API key or OAuth token depending on the resource and operation. It is suitable for public channel/video metadata and authorized private-resource access, but it is not a private advertising-campaign API.

Source: https://developers.google.com/youtube/v3/docs

## WhatsApp Business Platform

The official WhatsApp Business Platform Cloud API supports authorized business messaging, calls, business-account management, analytics, templates, and webhooks. It is not a public WhatsApp advertising database. Any SpotNxt integration must be explicitly separated as authorized WhatsApp Business data and must not be used to fabricate competitor-ad inventory. OAuth/token permissions, business portfolios, rate limits, and webhooks are part of the real connection contract.

Source: https://developers.facebook.com/docs/whatsapp/cloud-api/

## Architecture consequence

The production system should use provider adapters with capability status, authentication state, permission state, last successful synchronization, rate-limit state, error state, freshness, provenance, and region metadata. When a provider is absent or lacks the requested capability, the UI must say `Unavailable through an approved API` or `Connect [provider] to enable this feature`. Demo records must never be returned as a silent fallback for a missing live source.
