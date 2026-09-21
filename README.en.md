# dsh-usage-panel

**English** | [简体中文](README.md)

DeepSeek account balance and per-session token usage for the [DSH (DeepSeek Harness)](https://github.com/deepseek-ai/deepseek-harness) web GUI, rendered as a colored pill in the session header (top right).

![Panel preview](assets/preview.png)

## Features

- **Balance** from the official `GET /user/balance` (total / topped-up / granted).
- **Token usage** from the host `tokenUsage` projection: uncached input, cache read, cache write, output, total, and cache-hit rate.
- **Three-level balance alert** with user-editable thresholds: sufficient / warning / insufficient, recoloring the pill and the detail card.
- **Recharge entry**: top-up, usage detail, sign-in, and copy-link, with three open modes (new tab / same tab / copy link).
- **Query efficiency**: visibility-aware polling (paused on hidden tabs), exponential backoff on failure, a 30s host cache with single-flight, and manual refresh.
- **Version tolerant**: the host prefers `ctx.connection.fetch` and falls back to `ctx.webServer`; the browser tries the session-header seats in order.

## Install

Option 1 - install it as a plugin package (recommended):

```sh
dsh plugin --profile web add dsh-usage-panel
```

Option 2 - local installer:

```sh
node install.mjs --home ~/.dsh --profile web
```

Restart `dsh web` (or let the live patch watcher apply it) and refresh the GUI.

## Configuration (host)

`apply(ctx, config)` reads an optional config object from the patch row:

| Field | Default | Meaning |
| --- | --- | --- |
| `routePath` | `/api/usage-panel/balance` | route served by the host half |
| `cacheMs` | `30000` | upstream cache and single-flight window |
| `apiKeyEnv` | `DEEPSEEK_API_KEY` | resolved via `ctx.credentials`, then env |
| `baseUrl` | `https://api.deepseek.com` | provider base URL |
| `baseUrlEnv` | `DEEPSEEK_BASE_URL` | env var overriding `baseUrl` |

## Compatibility

- **Host**: Node >= 18, no imports, so it loads from any path. Prefers `ctx.connection.fetch.register` and falls back to `ctx.webServer.register`. Key resolution uses `ctx.credentials` when present.
- **Browser**: requires only the seeded React module and the `slots` service. Preferred seat is `conversation.session.header.utilities`, then `conversation.session.header.corner`; `sidebar.footer.action` is a delayed (4s) fallback, so the pill never pre-empts the header on a normal boot. Token usage needs the session-scoped `useProjection` hook; without it the balance still renders.
- No platform-specific code, so it is machine independent.

## Verify

```sh
node tools/verify.mjs --port 3080 --home ~/.dsh
```

Reports boot-graph presence, the HMR channel, and the served bundle features.

## Uninstall

Remove the `usage-panel` insert row from the profile patch and delete `<home>/plugins/dsh-usage-panel`.

## Author

Mysterious Mark

## License

[MIT](LICENSE)
