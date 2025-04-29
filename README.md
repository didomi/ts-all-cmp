# CMP Configuration Debugger

The website https://didomi.github.io/ts-all-cmp enables you to test, share, and troubleshoot Didomi CMP notices configurations.

## 🔧 How to Use

1. Open the page with appropriate query parameters in the URL (e.g. `?apiKey=...&notice_id=...`).
2. Modify the inputs or JSON config in the UI.
3. The URL will update automatically — you can copy and share it.

## 🌐 Supported Query Parameters

| Parameter      | Description                                               |
| -------------- | --------------------------------------------------------- |
| `apiKey`       | Public API key used to load the Didomi SDK                |
| `notice_id`    | ID of the notice to be loaded                             |
| `country`      | User's country code (e.g. `FR`, `US`)                     |
| `region`       | User's region code (e.g. `CA` for California)             |
| `commit_hash`  | Git commit hash, for tracking/testing purposes            |
| `staging`      | If set to `1`, loads the SDK from the staging environment |
| `preprod`      | If set to `1`, loads the SDK from the preprod environment |
| `static`       | If set to `1`, uses the static loader                     |
| `gpp_stub`     | If set to `1`, enables GPP stub                           |
| `ctv_platform` | If set to `1`, uses the CTV platform                      |
| `config`       | Base64-encoded JSON string to use as SDK config           |
| `apply_conf`   | If set to `1`, applies the decoded config on page load    |

## 📦 Example

```
https://didomi.github.io/ts-all-cmp/?apiKey=7dd8ec4e-746c-455e-a610-99121b4148df&notice_id=yZRMpq7b
```
