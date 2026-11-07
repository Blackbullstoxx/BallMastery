# Browser tests

## Verified workflow (7 November 2026)

A separate cloud Chrome browser can open both the GitHub Pages app and the managed Sites preview. This was tested with the current app and synthetic record/colour-recognition data. No additional hosted Site or production URL change is needed.

### Before a UI release

1. Read the current GitHub main revision and prepare changes locally. Preserve all app files, their relative paths and asset versions.
2. Read the available Sites preview instructions. For the managed Linux environment (SITES_MANAGED_LINUX_CONTAINER=1), create a separate directory under /workspace with the edited app in dist/ and a local .openai/hosting.json containing:
   `{"static":{"directory":"dist"}}`
   This is a local QA directory, not a second canonical project or hosted Site.
3. Run `sites-preview start <absolute-QA-directory>`. Use the exact URL printed by the CLI in the cloud browser; do not guess the host or port or start a competing HTTP server.
4. Follow cua_repl instructions to open that URL. Verify visible UI and interactions, take screenshots when helpful, and inspect errors. Use synthetic fixtures for empty, sparse and sufficient records; keep all fixture pages and data exclusively in the QA directory.
5. Exercise affected views, expandable panels, period controls, normal and colour-recognition modes, and missing-score cases as relevant. Test narrow layouts through supported browser/device tooling when available; do not claim an unperformed mobile check.
6. Run applicable automated tests. Publish the identical verified application files to GitHub, without the QA manifest or synthetic fixture pages. Check deployment status, then smoke-test the deployed app.
7. Stop the preview with `sites-preview stop` at teardown.

If local browser installation fails, try the independent cloud browser. If preview start fails, inspect `sites-preview status` and the Sites troubleshooting guidance, and report the concrete remaining blocker instead of claiming browser testing was completed.

## Scope of the checks

- The isolated preview can verify rendering, navigation, chart values, folding panels and normal client-side behavior.
- An HTTP preview may not provide secure-context features: the verified preview reported offline startup unavailable. Check service-worker installation and offline-shell status on the HTTPS GitHub Pages app separately.
- Cloud Chrome is not iPhone Safari. Microphone recognition, iOS audio after interruption, screen wake locks and installed-PWA lifecycle need targeted checks on real devices. Use synthetic/mocked data for UI checks; do not claim a real speech test from a displayed percentage.
- Do not sign the preview into the family's live Dropbox profiles or upload synthetic backups there. Private playback and authenticated backup integration require their own explicitly scoped checks.

## Data checks

Run `node tests/record-insights.cjs` from the repository. It covers disjoint median windows, missing values versus entered zeroes, daily maxima, durations and mode separation, colour-only completed sets, interrupted trials, duplicate finishes, persistence, read-only behavior, old/new backup validation, and version references.

## Successful manual check

Using synthetic data on 7 November 2026, the actual app displayed:
- Expanded records chart: latest-five median 37, previous-five median 22.
- Independent colour-recognition result with no colour repetition scores: 20 of 25, 80%, previous group 60%.
- Successful navigation and expansion through area, level and drill.

The GitHub Pages app also opened successfully with its black play-button video placeholder and indicated offline readiness. This did not test authenticated video playback or an actual offline navigation.
