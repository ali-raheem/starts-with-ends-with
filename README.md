# Starts With, Ends With

A small, offline-capable word race for people around one screen. Play it at https://ali-raheem.github.io/starts-with-ends-with/.

Spin the three marked dials, then be the first to shout a word that starts and ends with the selected letters and matches the category.

## Run locally

Requires Node.js 18 or newer; no packages to install.

```sh
npm start
```

Open http://localhost:5173. Use `PORT=8080 npm start` to change the port. The deployable app is the self-contained `dist/` directory; serve it over HTTPS for offline support on other devices. Opening `index.html` directly as a file does not support service workers or ES modules.

## Play

- **Friendly pairs** picks a category and letters with a known example word in that category, respecting locked dials. It avoids repeating the exact challenge when another valid round is available.
- **All letters** chooses a category and letters from all 26 × 26 combinations, respecting locks. Some combinations have no ordinary English answer.
- The dials spin as soon as the page loads, so a pull-to-refresh on a phone starts a new round. After that, click **Spin again**, or press **Space** outside a form control. The purple category dial is on the left and settles first, followed by the orange starting letter, then the green ending letter. On phones, the category sits above the two letters. The ring markers agree with the displayed result.
- **Tap a dial** to lock its value while the others spin; tap again to unlock. Locking all three disables spinning until one is unlocked. If friendly mode has no known word for the locks, it asks you to unlock a dial or change mode.
- **Give up** ends a round. If there is an example word, it pops up with the answer and the next round spins after four seconds; otherwise (often in All letters mode) the next round spins straight away.
- Optional sound is generated locally, and a 30-second timer starts only after all unlocked dials settle. Time continues to pass in a background tab. In friendly mode, when time runs out a popup shows an answer and the next round spins after four seconds; **Stay on this round** or Esc cancels the automatic spin.
- Settings persist when browser storage is available. Scores and dictionary adjudication are left to players.

## Offline and installation

Visit once online; the service worker saves a copy in the background. All game code, styles, icons, and the word list are cached by the service worker. Reopening the same URL and playing then works without a connection. Clearing site storage removes the offline copy. HTTPS or localhost is required; private browsing and browser storage policies may prevent persistence.

Install using the in-app button when supported, or the browser’s Add to Home Screen / Install menu. The game has no third-party fonts, requests, analytics, or runtime dependencies.

Bump the cache name in `dist/sw.js` whenever changing app assets. The new service worker caches the full release before activation and removes only old `swew-` caches. Navigation tries the network and falls back to the cached page; game assets are served from cache.

## Validation

```sh
npm test
node --check dist/app.js
node --check dist/sw.js
```

Unit tests cover dial alignment, every lock combination, category-specific example words, and selection without immediate repeats. Service worker tests cover precaching real app files, offline navigation and modules, and safe cache cleanup.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` tests the app and deploys `dist/` after pushes to `main`, or on manual dispatch. In repository Settings → Pages, select **GitHub Actions** as the source before running the first deployment. It uses GitHub’s Pages environment and built-in token; no deployment secret is required.

All asset, module, manifest, and service-worker paths are relative, so the game can be hosted at a repository URL such as `/starts-with-ends-with/`.
