# Changelog

## 0.3.2

- Packaging: declare `dsh.bundle` (with `cordis.patch.yml`) so
  `dsh plugin --profile web add dsh-usage-panel` installs it as a profile
  bundle, as required by community plugin lists.
- Docs: add a preview screenshot, a Simplified Chinese README, and an English
  README.

## 0.3.1

- Fix: prefer the session header seat; the sidebar seat is now a delayed (4s)
  fallback, so the pill no longer lands bottom-left on a normal boot.
- Packaging: proper manifest (license, files, engines, keywords), LICENSE,
  .gitignore, and this changelog.

## 0.3.0

- Three-level balance alert (sufficient / warning / insufficient) with
  user-editable thresholds, persisted per browser.
- Recharge entry with three open modes and quick links to the DeepSeek
  top-up, usage, and sign-in pages.
- Efficiency: visibility-aware polling, exponential backoff, manual refresh,
  and a 30s host cache with single-flight.
- Host: configurable routePath / cacheMs / apiKeyEnv / baseUrl; webserver
  fallback; Node >= 18.

## 0.2.0

- Colored pill with icons, a segmented token bar, a cache-hit meter, and
  entrance animations.

## 0.1.0

- Initial balance + per-session token usage panel in the session header.
