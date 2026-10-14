# Consent Flows sandbox

Open `flows.html` on the same static host as `index.html`. Enter a public API key and a published Consent Flow ID, choose the Flow deployment and SDK environments, then **Apply and reload**. The legacy page links to the Flows page and keeps its existing notice behavior.

Example (replace placeholders with a published Flow):

```text
flows.html?apiKey=YOUR_PUBLIC_KEY&flow_id=YOUR_FLOW_ID&environment=staging&country=US&region=CA
```

## Workspace

- **Setup:** a section navigation column and collapsible groups for Flow details, delivery overrides, SDK URL overrides, rules context, and advanced configuration. Apply and reload opens the test tab.
- **Test & troubleshoot:** widget controls and a compact applied-settings summary sit beside Console setup findings. The Console checklist, raw evidence, and captured runtime messages expand when needed.
- **Configuration:** an expandable tree and complete plain JSON view of `Didomi.getConfig()`, with refresh and copy controls. Runtime overrides are included; use browser Network for the original response. Tree branches render lazily; large collections show 100 entries at a time. Expand sections opens up to 1,000 sections per click. Plain JSON and Copy JSON always include the complete response.

Tabs support keyboard arrows, Home and End. The fragments `#setup`, `#test`, and `#config` open the relevant workspace; previous config and troubleshooting section anchors are also supported.

## Query parameters

| Parameters                                                                                                                                         | Behavior                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apiKey`, `flow_id`                                                                                                                                | Required. Loader path `/{apiKey}/loader.js?target_type=flow&target={flow_id}`. Also accepts incoming `target_type=flow&target=…` and normalizes it to `flow_id`.                                                                                                                      |
| `environment`                                                                                                                                      | Flow content deployment: `production` (default, omitted from loader URL) or `staging`.                                                                                                                                                                                                |
| `sdk_environment`                                                                                                                                  | Sandbox selector for infrastructure: `production`, `staging`, `preprod`. Independent of the Flow deployment.                                                                                                                                                                          |
| `platform`                                                                                                                                         | Browser test platform: `web` (default) or `ctv`. Use a matching published Flow. AMP is explicitly unsupported by the Flow embed generator; native apps require their native SDK.                                                                                                      |
| `country`, `region`                                                                                                                                | Loader geo overrides, also set on `window.didomiConfig.user`. Region requires country.                                                                                                                                                                                                |
| `regulation`                                                                                                                                       | Loader regulation override, e.g. `gdpr`, `cpra`. Resolution still requires that regulation in the deployed Flow.                                                                                                                                                                      |
| `lang`                                                                                                                                             | Loader language request. Single-language delivery only applies when the config enables `languages.requestedOnly`. This does not force the SDK display language.                                                                                                                       |
| `brand`, `brand_version`                                                                                                                           | Override the response's brand reference. A brand without a version requests latest; a version requires a brand. Does not edit the stored Flow.                                                                                                                                        |
| `opts`                                                                                                                                             | Only `gvl` is offered: explicitly include IAB Global Vendor List data in `loader.js`. Automatic omits `opts`; GDPR/IAB configurations normally include this data already. Unrecognized or JSON-endpoint-only tokens in older share links are rejected rather than silently forwarded. |
| `ts`                                                                                                                                               | CDN cache-key value. Change it to bypass an existing cached response.                                                                                                                                                                                                                 |
| `didomiConfig`                                                                                                                                     | Native SDK URL JSON object, filtered by the SDK to the allowlist below.                                                                                                                                                                                                               |
| `didomiConfig.notice.enable`, `didomiConfig.notice.showDataProcessing`, `didomiConfig.app.alwaysDisplayActionButtons`, `didomiConfig.sync.enabled` | Native boolean URL overrides. Blank inherits, `false` explicitly disables.                                                                                                                                                                                                            |
| `didomiConfig.experiment.group`, `didomiConfig.user.externalConsent.value`                                                                         | Native SDK URL overrides; interpreted by the SDK as JSON when parseable, otherwise strings.                                                                                                                                                                                           |
| `didomiConfig.app.vendors.iab.version`                                                                                                             | Native numeric SDK URL override.                                                                                                                                                                                                                                                      |
| `didomi_country`, `didomi_region`                                                                                                                  | Native runtime geo overrides. Distinct from loader selection; the inspected SDK reads two-letter values and gives URL geo priority.                                                                                                                                                   |
| `commit_hash`                                                                                                                                      | Sandbox setting for `window.didomiConfig.app.sdkVersion`: full 40-character commit or `latest`. The loader prefers an existing remote config SDK pin over this page value.                                                                                                            |
| `organization_user_id`, `age`, `page_category`, `attributes`                                                                                       | Sandbox rule context: maps to `user.organizationUserId`, `user.age`, `pageCategory`, `user.userContext.attributes`. Attributes must be a JSON object. Setting an organization user ID can also engage configured SDK identity/sync behavior.                                          |
| `config`, `apply_conf`                                                                                                                             | Sandbox full-config override: UTF-8 base64 JSON object; applied to `window.didomiConfig` only with `apply_conf=1`. Explicit sandbox inputs override conflicting JSON values. Invalid JSON blocks loading even when disabled so bad share links are visible.                           |
| `widget_id`, `layer_name`                                                                                                                          | Sandbox widget action settings: `Didomi.widgets.show({widgetId, layerName})`. Empty values are omitted; empty options let Flow rules select the widget. These are not native loader query parameters.                                                                                 |
| `gpp_stub`                                                                                                                                         | `1` loads the existing local GPP stub **before** SDK startup. The shared TCF bootstrap is always installed.                                                                                                                                                                           |

Native `didomiConfig.*` URL fields take precedence over the aggregate native `didomiConfig` URL JSON and are filtered by the SDK to its seven allowed properties. They are kept in the **page** URL, not forwarded to `loader.js`. The custom sandbox JSON applies before the SDK's native URL overrides. Unknown page parameters are preserved in share links but not forwarded to the loader.

Changes update the share URL with `replaceState`; SDK configuration and widget action settings take effect on reload. The page shows the generated loader URL and effective window config, and reports loader failures or a 20-second readiness timeout. A dedicated **Loaded SDK configuration** section automatically displays the full pretty-printed `Didomi.getConfig()` response on SDK readiness and after widget actions. **Refresh loaded config** reads it again, and **Copy JSON** copies the full response (with text-selection fallback if clipboard access is unavailable). The JSON panel scrolls independently within the Configuration tab. A loader returning HTTP 200 is not proof that a matching Flow was resolved: the service can fall back to an API-key-only loader. Verify the loaded regulation and widget config.

GPC comes from `navigator.globalPrivacyControl`. Consent status comes from the SDK consent store; use **Reset consent and reload** for a fresh state. URL-pattern rules use `window.location.pathname`, so rules targeting another site's pathname will not match this sandbox path. No fabricated native query parameters are provided for GPC, consent status, or pathname. To test rule selection for another path, use the URL-pattern tester described below.

## Loader options

This page loads `/{apiKey}/loader.js`; it does not issue a separate config JSON request. `Didomi.getConfig()` reads the initialized SDK’s configuration. The loader already includes the selected configuration in its JavaScript response.

**Automatic** omits `opts` and lets the loader decide whether vendor-list data is needed. **Include IAB Global Vendor List (gvl)** sends `opts=gvl`, requesting that data even when the selected regulation would not normally include it. This can help investigate IAB vendor-list availability with a non-GDPR location. GDPR or IAB-enabled configurations normally include it already, so selecting it may produce no visible difference. It does not enable TCF, change its version, or select staging/production. No other `opts` choices are currently exposed for Web/CTV.

The field has a tooltip and an accessible **Examples and behavior** disclosure. Shared links containing unrelated options are blocked with a clear correction message. Native SDK URL overrides and sandbox runtime controls remain separate from loader request parameters.

## CTV UI preview

In **Setup → Flow and deployment**, keep **Platform = web** and enable **Force CTV UI** to test the SDK’s CTV UI behavior against a web configuration. The sandbox parameter `ctv_ui=1` applies `window.didomiConfig.app.ctvEnabled = true` before SDK loading. It is not a native SDK URL parameter and is not forwarded to the loader; the selected platform stays unchanged. Leaving it off preserves the published config’s behavior.

This does not redesign a web widget, change the published Flow platform, or force an older SDK build. The SDK may display a CTV fallback notice when a Flow widget cannot render. The runtime summary reports notice visibility separately from widget visibility so this does not look like a successful widget test. Publish compatible CTV content in Console for a full TV integration test. The SDK CTV layout is designed for a TV viewport; use a 16:9 viewport for a representative preview. Sandbox styles are scoped to its own root so they do not affect SDK content. A floating Hide preview button dismisses the notice, preferences, or widget UI without accepting consent or resetting user status.

## Scope of troubleshooting

If Show widget fails or finishes without displaying a widget, a dialog explains the problem and offers a Read troubleshooting button. This opens tab 2 and focuses the Troubleshooting section. Close or Escape dismisses the dialog so you can adjust settings and try again.

Diagnostics use the config publicly returned to this browser and messages observed during the current page load. They are heuristic checks, not a full schema validator or an inspection of your Console account. Start in Console: review Flow regulation coverage, assigned widgets and display rules, saved brand settings, and successful publication to the selected environment. The page cannot confirm unsaved drafts, permissions, or publication status.

Setup checks cover missing widget assets, missing or inconsistent widget references, incomplete brand references, missing regulation or API key values, and display-rule conditions that may need review in Console. They do not assume all optional config sections are required. Recommendations prioritize Flows, Regulation Manager, Brand Manager, the widget editor, and successful publication. A widget version reference without a display asset does not establish an editor mistake. If the assignment and successful publication are confirmed, the guidance directs users to support for investigation rather than requiring arbitrary widget edits.

Runtime capture starts before the SDK and main page module load. It records console warnings/errors while preserving the original console calls, page exceptions, unhandled promise errors, failed resource loads, and CSP violations. Identical messages are grouped; at most 100 distinct records are retained in memory, with message/detail length limits. Clear captured messages removes only runtime evidence, not config findings. Messages are neither sent nor included in share links.

Technical evidence is available for support and site developers. Cross-origin restrictions may hide error details and resource events do not reveal HTTP response status. No customer presets, private repository references, internal service descriptions, or issue-tracker links are included.

## Development and verification

```sh
npm install
npx playwright install chromium
python3 -m http.server 4173 --bind 127.0.0.1
# Open http://127.0.0.1:4173/flows.html
# In another terminal:
npm run test:flows
```

The dedicated suite runs Node contract tests and headless browser tests with an intercepted SDK. It checks query forwarding/encoding, explicit false, Unicode sharing, config precedence, invalid inputs, bootstrap ordering, widget actions, config display/refresh/copy, failure handling, responsive layout, and legacy loader compatibility. Existing credentialed live-notice tests retain their original configuration. Verification results are recorded below.

### Verification on 2026-10-14

All 15 Node checks and 20 browser scenarios passed. Browser scenarios ran through the connected Playwright browser with an assertion adapter because the local CLI could not launch Chromium under the session’s macOS sandbox. Formatting and diff checks passed. Desktop and mobile views were inspected, including a 390px viewport.

Live production SDK spot checks covered regulation selection, configuration inspection, CTV fallback dismissal, and consent string retrieval. Successful widget rendering is covered with an intercepted SDK; the supplied live Flow had missing widget display assets and reproduced the corresponding troubleshooting findings. No customer account identifiers or test keys are included in source or documentation.

## Consent strings

On tab 2, Consent strings reads `Didomi.getCurrentUserStatus()` after SDK readiness and displays its `consent_string` (TC) and `gpp_string` values. Refresh after changing consent choices; this is a manual snapshot and does not modify consent. Copy buttons preserve the complete strings. Missing values have framework setup guidance; failed reads clear previous values so stale strings cannot be mistaken for the latest result.

Both IAB decoder links (TC and GPP) open the [IAB decoder](https://iabgpp.com/#) in new tabs with the displayed string after `#`. Refreshing updates those links; missing values or failed reads clear them back to the blank decoder so old strings are not reused. A returned string alone does not indicate agreement to all purposes or vendors. DCS is also available in this section as a saved browser snapshot, read separately from the configured cookie or local storage key (default `didomi_dcs`). The complete value, including signature parts, is preserved for copying. If cookie and local storage values differ, the cookie is shown with an explicit warning. DCS storage/config read errors clear its field without hiding TC/GPP results. The [Didomi DCS decoder](https://dcs-decoder.didomi.io/) opens in a new tab without putting the string in its URL.

## URL-pattern testing

On tab 2, expand **URL-pattern test**, enter a pathname such as `/checkout`, and click **Check path rules**. The sandbox calls `Didomi.widgets.getApplicable({ currentUrl: pathname })`, overriding only the path for that query and retaining the SDK’s other current context. It displays the selected rule/widget, default fallback, or unavailable result. This requires an SDK version that exposes `widgets.getApplicable`.

This checks rule selection without navigating, rendering a widget, or changing the SDK’s automatic selection. Automatic display and **Show widget** still use the real sandbox pathname. Other Setup changes must be applied first. The test path is temporary and is not included in share links. A matching rule does not prove that the widget’s published assets can render. Full page behavior should also be checked on the intended site path.
