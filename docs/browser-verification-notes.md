# Browser verification notes

On 2026-08-16, the running preview rendered the existing SpotNxt-AI dashboard shell and dark visual identity correctly. The overview displayed `Live data source not connected`, the CTA `Connect a compliant provider to activate live intelligence`, and a link to `Open Data Sources & Connections`. The dashboard did not render the historical charts when no source-backed data was available.

The Settings page rendered the existing settings cards plus the new `Data Sources & Connections` section and `API Access` handling. The page states that credentials are never collected or exposed in the browser and that the credential field is `Managed server-side; never displayed in the browser`. Provider card content was below the initial viewport and requires a scroll verification.

The settings page scroll completed without a visible crash, but the extracted text did not include the provider card titles/statuses even though the diagnostics section and refresh control rendered. The API endpoint itself was verified separately and returned provider records with `not_configured`/`enabled` states and no secret values. This is treated as a visual extraction limitation, not a source-status failure.

The Ad Library preview rendered the existing styled shell, approved-platform filters (`All`, `Meta`, `Google`, `YouTube`, `LinkedIn`), `Loading approved-source inventory…`, `Live data source not connected`, and `Freshness unavailable`. No static ads were shown while the live provider was unavailable.

After the final cache reset and live-mode restart, the dashboard rendered correctly and showed `Live data source not connected`, `Checking provider and freshness state…`, unavailable KPI values, and the connection CTA. The competitor page rendered correctly with market selectors for All markets, India, Global, Asia, North America, and Europe; it showed `Source: Live data source not connected`, `Data freshness: Freshness unavailable`, and the provider connection error with no fabricated competitors.

The final Trends page rendered the existing shell with `Checking provider and freshness state…` followed by the provider gate; the Recommendations page rendered `Live data source not connected`, `Recommendations are unavailable`, and the connection CTA. Seeded charts and recommendation cards were not shown in live mode.

On 2026-08-16, Settings rendered a new `Secure Google Ads connection` section with password inputs for developer token, OAuth client secret, refresh token, and server setup token; text inputs for client ID and customer IDs; and a `Connect Google Ads securely` button. The page states that secrets are held in memory only in the form, sent over HTTPS, encrypted at rest, cleared after save, never returned to the browser, and never committed. Provider diagnostics showed Google Ads `Not connected` and the setup endpoint reported secure entry available with no configured credentials. No secret values appeared in page content or screenshot.
