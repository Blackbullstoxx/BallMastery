# BallMastery: working instructions

GitHub repository: Blackbullstoxx/BallMastery. Production: https://blackbullstoxx.github.io/BallMastery/.

## Browser verification before publication

For UI changes, use a separate preview of the exact edited app files and test it with the cloud browser BEFORE moving the production main branch. Do not treat a failed local Playwright browser download as evidence that the cloud browser is unavailable.

Read BROWSER_TESTS.md for the verified preview workflow and limits. Keep GitHub as the canonical source. Do not use the former hosted Site as the source for new changes.

Preserve the established German UI, compact layouts, green palette, private Dropbox video authorization, read-only mode, device-local training data, and Dropbox backup isolation. Use synthetic data in an isolated preview; never connect tests to the children's Dropbox backup profiles.

When app shell files change, update their query versions consistently in index.html and sw.js and increment the service worker release. Updates must keep waiting for existing app windows to close; never force a reload during training.

Run applicable data and backup tests, including node tests/record-insights.cjs when changing records or colour-recognition history. Report exactly which browser and device checks passed, and any remaining limitations. Do not describe desktop Chrome testing as an iPhone Safari test.

The footer's data-app-version and visible version in index.html must match RELEASE in sw.js. Increment the visible release for every application change, including same-day releases, so users can compare installed versions across devices. Do not display a fetched server version as the installed app version. Preserve this label across tab switches and read-only mode; offline availability is recorded in the footer's data-offline-status instead of replacing the version text.
