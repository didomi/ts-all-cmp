# CMP Configuration Debugger

The website https://didomi.github.io/ts-all-cmp enables you to test, share, and troubleshoot Didomi CMP notices configurations.

## Consent Flows

Open [the Flows sandbox](flows.html) to test published Consent Flows with deployment, geo, regulation, language, brand, SDK URL, and rules-context overrides. It includes share links, generated loader URLs, and `Didomi.widgets` controls. The original page continues to test legacy Consent Notices.

See [Flows setup, query parameters, troubleshooting, and tests](docs/flows.md) for details. Run the isolated Flows checks with `npm run test:flows` after installing dependencies and the Playwright Chromium browser.

## 🔧 How to Use

1. Open the page with appropriate query parameters in the URL (e.g. `?apiKey=...&notice_id=...`).
2. Modify the inputs or JSON config in the UI.
3. The URL will update automatically — you can copy and share it.

## 🌐 Supported Query Parameters

| Parameter      | Description                                                                |
| -------------- | -------------------------------------------------------------------------- |
| `apiKey`       | Public API key used for the Didomi SDK                                     |
| `notice_id`    | ID of the notice to load                                                   |
| `country`      | User's country code (e.g., `FR`, `US`)                                     |
| `region`       | User's region code (e.g., `CA` for California)                             |
| `commit_hash`  | Git commit hash, used for debugging or testing purposes                    |
| `staging`      | If set to `1`, loads the SDK from the staging environment                  |
| `preprod`      | If set to `1`, loads the SDK from the pre-production environment           |
| `gpp_stub`     | If set to `1`, enables the GPP stub                                        |
| `ctv_platform` | If set to `1`, loads the web based CTV SDK                                 |
| `config`       | Base64-encoded JSON used for the `didomiConfig`                            |
| `apply_conf`   | If set to `1`, applies the decoded `didomiConfig` on page load             |
| `gtm`          | If set to `1`, loads Google Tag Manager (default container ID or `gtm_id`) |

## 📦 Example

```
https://didomi.github.io/ts-all-cmp/?apiKey=7dd8ec4e-746c-455e-a610-99121b4148df&notice_id=yZRMpq7b
```
