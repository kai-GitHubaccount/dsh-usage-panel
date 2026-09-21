# dsh-usage-panel

DeepSeek account balance + per-session token usage for the DSH web GUI,
rendered as a colored pill in the conversation session header (top right).

## Features

- Balance from the official DeepSeek Get User Balance endpoint.
- Per-session token usage from the host tokenUsage projection (uncached input
  / cache read / cache write / output / total / cache-hit rate).
- Three balance levels with colors, driven by user thresholds:
  sufficient (>= warnAt), warning (>= criticalAt), insufficient (< criticalAt).
- Editable thresholds, refresh interval, open mode, and recharge/usage URLs,
  persisted per browser in localStorage.
- Recharge entry with three open modes (new tab / same tab / copy link) and
  quick links to the DeepSeek top-up, usage, and sign-in pages. Opening the
  top-up page reuses the browser's existing platform.deepseek.com login.
- Efficiency: visibility-aware polling (paused on hidden tabs), exponential
  backoff on failure, a server-side cache with single-flight, manual refresh.

## Layout

- lib/index.js  host half: authenticated balance route, dependency free.
- lib/client.js browser half: hand-written window.__ModuleLoader__ bundle.
- install.mjs   idempotent installer for any DSH home/profile.
- tools/verify.mjs doctor: boot graph, HMR channel, served bundle features.

## Install

    node install.mjs --home ~/.dsh --profile web

It copies this package to <home>/plugins/dsh-usage-panel and ensures the
profile patch inserts it. Restart `dsh web` (or let the live patch watcher
apply it) and refresh the GUI.

Manual install: add this to <home>/profiles/web/cordis.patch.yml

    - insert:
        - id: usage-panel
          name: /absolute/path/to/dsh-usage-panel/lib/index.js

## Configuration (host)

apply(ctx, config) reads an optional config object from the patch row:

| Field | Default | Meaning |
|---|---|---|
| routePath | /api/usage-panel/balance | route served by the host half |
| cacheMs | 30000 | upstream cache and single-flight window |
| apiKeyEnv | DEEPSEEK_API_KEY | resolved via ctx.credentials, then env |
| baseUrl | https://api.deepseek.com | provider base URL |
| baseUrlEnv | DEEPSEEK_BASE_URL | env var overriding baseUrl |

## Compatibility

- Host: Node >= 18 (global fetch / Response), no imports, so it loads from
  any path. Prefers ctx.connection.fetch.register and falls back to
  ctx.webServer.register. Key resolution uses ctx.credentials when present.
- Browser: requires only the seeded React module and the slots service.
  Preferred seat is conversation.session.header.utilities, then
  conversation.session.header.corner. The sidebar.footer.action seat is a
  delayed (4s) fallback used only when no header seat materialises, so the
  pill never pre-empts the header on a normal boot. Token usage needs the
  session-scoped useProjection hook; without it the balance still renders.
- No platform-specific code, so it is machine independent.

## Verify

    node tools/verify.mjs --port 3080 --home ~/.dsh

Reports boot-graph presence, the HMR channel, and the served bundle features.

## Publish to GitHub

    cd <this-directory>
    git init
    git add -A
    git commit -m 'dsh-usage-panel 0.3.1'
    git branch -M main
    git remote add origin git@github.com:<you>/dsh-usage-panel.git
    git push -u origin main

Then add the repository topics deepseek-harness-plugins, deepseek-harness,
and dsh-plugin so it shows up under the community topic pages.

The .gitignore excludes the runtime .state.json marker, so the repository
holds only source.

## Author

Mysterious Mark

## Uninstall

Remove the usage-panel insert row from the profile patch and delete
<home>/plugins/dsh-usage-panel.
