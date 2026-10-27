# Continuous CI & Any-Branch GitHub Pages Deployment

## Overview

GitHub Pages for `autonomatono/sonobjet` is configured with `build_type: "workflow"` and an unrestricted `github-pages` environment (`deployment_branch_policy: null`).

Every push to **any branch** (including active Arena session branches such as `arena/ebe788b1-sonobjet` as well as `main`) automatically triggers `.github/workflows/deploy.yml`, which:
1. Checks out the pushed commit on `ubuntu-latest` with Node.js 22,
2. Runs `npm ci`,
3. Runs `npm run typecheck` (`tsc --noEmit`),
4. Runs `npm test` (`vitest run`),
5. Builds the static production bundle (`npm run build`) with `base: './'` and injects `VITE_GIT_SHA`, `VITE_GIT_BRANCH`, and `VITE_BUILD_TIME` (visible in the Studio HUD footer),
6. Copies `@mediapipe/tasks-vision` WASM binaries into `dist/mediapipe-wasm/` (keeping large WASM binaries out of Git history while serving them same-origin on Pages),
7. Uploads `./dist` via `actions/upload-pages-artifact@v3` and deploys to **`https://autonomatono.github.io/sonobjet/`** via `actions/deploy-pages@v4`.

---

## Turn-End Operational Checklist (Mandatory After Every Turn)

To ensure continuous deployment and zero-loss continuity if a session is interrupted, execute this sequence at the end of **every** turn:

1. **Verify Locally:**
   ```bash
   npm run typecheck && npm test && npm run build
   ```
2. **Update Documentation & `HANDOFF.md`:**
   - Record all architectural changes, newly added works/modules, current commit/branch status, and next steps in `HANDOFF.md` (and `docs/*` where applicable).
3. **Commit & Push to Current Session Branch:**
   ```bash
   git add -A
   git commit -m "<descriptive message>"
   git push origin arena/ebe788b1-sonobjet
   ```
4. **Verify GitHub Actions Pages Deployment:**
   ```bash
   gh run list --branch arena/ebe788b1-sonobjet --limit 1
   ```
   Wait/confirm the `CI & Deploy GitHub Pages` workflow completes green so `https://autonomatono.github.io/sonobjet/` reflects the latest turn.
