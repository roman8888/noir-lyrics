# Plan: protected deployment of hyperfeeling (obfuscation, infosec, hosting)

_Written 2026-10-17. Plan only; nothing in it is built yet. Roman decides the order and the scope._

## 1. Findings that shape the plan

- **The source repo is public.** Anyone can read `roman8888/noir-lyrics` on GitHub today: the code, its comments, the choreography, the timing tools and this file. Obfuscating only the deployed copy protects nothing while the source stays public. Every option below therefore starts by making the source private and serving a **built copy** from somewhere else.
- **Obfuscation is baked at build time.** VR360TLV renames ids, classes and JS names on every page load from its own server. A static copy can only be renamed once per build, so names rotate per deploy, not per visit. (With the self-hosted server in §4 per-load rotation becomes possible later, but it isn't needed for this site.)
- **No new tools are needed.** VR360TLV's pure-Python stack is already on this Mac: `rjsmin` (JS minify), `rcssmin` (CSS minify), `esprima` (JS parser, for renaming). Node 24 and Playwright (`~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node`) run the headless gates. The esprima parser predates some syntax the site uses (`?.`, `??`, `catch {`, `1_300_000`, top-level `await`), so it needs the same compatibility copy VR360TLV built.
- **Where the value is.** The comments explain every scene; names like `buryAt`, `T_DROWN`, `pushAt` describe the choreography; lyric regexes (`/karma is coming/`) map scenes to lines; `timing.json` carries the AI style prompts per section. Those are what the protection should remove.

## 2. Obfuscation (build-time, the copy visitors get)

| # | Item | What it does | Benefit | Effort | Tokens |
|---|---|---|---|---|---|
| O1 | Source / site split | Private source repo. The built copy lives in a separate repo (public for GitHub Pages, private for the self-hosted server). A workflow deploys: every push = latest, a manual run = an exact commit SHA (also the rollback) | Highest | S–M | 60–100k |
| O2 | Build tool `tools/build_site.py` | Writes `dist/` with only what a visitor needs; no tools, designs, server script, transcripts, LRC, notes, git files. Real pages for each song, `/about/` and `/playlist/` (no 404 redirect) | High | M | 80–120k |
| O3 | One JS bundle | All modules joined in dependency order (three.js stays external), comments removed, minified | High | M | 60–90k |
| O4 | Identifier renaming | Every variable, function and parameter renamed by scope (esprima + compat copy); properties, DOM APIs and three.js names kept | Medium–high | L | 250–400k |
| O5 | String and regex encoding | String literals and regex sources moved to an encoded table decoded once at start (like VR360TLV #5, values byte-identical at run time) | Medium | M–L | 120–180k |
| O6 | HTML ids, classes, attributes | Renamed consistently across HTML, CSS and JS; HTML and CSS minified; no map shipped | Low–medium | M–L | 150–250k |
| O7 | Remove dev-only features | `?record`, tap-sync and LRC export, `window.__noir` debug hooks, `?lead`, `?live`, `?video` | Medium | S–M | 40–60k |
| O8 | Content scrub | Drop AI style prompts (`desc`) and unused fields from `timing.json`; no `whisper.json`, `lyrics.lrc`, `lyrics.txt` headers | Medium | S | 15–25k |
| O9 | Gates (any failure = no deploy) | Leak scan (personal email, `/Users/`, localhost, Claude/Codex, tool and file names, a 200-name sample of real identifiers); no maps in `dist/`; `node --check`; headless run of the front page and both songs with zero console errors, canvas rendering, lyrics populating; same commit = same bytes | High | M | 100–150k |
| O10 | Fingerprint | Per-build id hidden in the bundle + `MANIFEST.json` (sha256 of every file) to recognise copies | Low–medium | S | 15–25k |

## 3. Infosec

| # | Item | What it does | Benefit | Effort | Tokens |
|---|---|---|---|---|---|
| I1 | Content Security Policy | Only this site and the pinned three.js may run code; hashes for the inline scripts; `object-src 'none'`, `base-uri 'self'`, `form-action 'none'` | High | S–M | 30–50k |
| I2 | three.js supply chain | Host three.js inside the site, or lock the CDN files with integrity hashes. Needs Roman's OK for a one-time download of `three@0.160.0` | Medium–high | S | 20–35k |
| I3 | Framing and links | Anti-framing (header on the self-hosted server, script on Pages), referrer policy, `noopener noreferrer` on external links | Medium | S | 10–20k |
| I4 | History scan | Scan the repo history for secrets and personal data before the split; what has been public is assumed seen | Medium | S | 15–25k |
| I5 | Public files | `security.txt`, `robots.txt`, a short privacy note (no cookies, no tracking; only local preferences) | Low–medium | S | 10–15k |
| I6 | Media | m4a only (no mp3), hashed media names. Anyone can still record what they hear | Low | S | 10k |
| I7 | Tamper and link check | Weekly job: the live site must match the build manifest; broken-link check | Medium | S–M | 30–50k |
| I8 | Local Infosec report | Per build, never deployed (like VR360TLV `/infosec`): what was removed or renamed, gate results, leak scan, sizes, CSP | Medium | M | 50–80k |

## 4. Hosting options

### Option A: GitHub Pages (free)

- Source repo private, built copy in a public repo `hyperfeeling-site` (free Pages needs a public repo; GitHub Pro, about $4 a month, serves from private).
- Domain at Namecheap, five DNS records to GitHub, HTTPS by GitHub.
- No headers can be set (CSP via `<meta>`, anti-framing via script), no server rewrites.
- Nothing to maintain; worldwide CDN.

### Option B: a spare MacBook at home + Cloudflare Tunnel (free, fixed)

**How it works.** The spare Mac serves the built copy with a small web server (Caddy). `cloudflared` on the same Mac opens an **outbound** tunnel to Cloudflare; Cloudflare answers visitors at `hyperfeeling.com` and passes requests through the tunnel. No router ports are opened and the home IP stays hidden. Cloudflare's free plan adds HTTPS, caching at its edge (most audio and video would be served from Cloudflare after the first request, not from the home connection), DDoS protection and basic analytics.

**What it needs from the domain.** A tunnel only works when the domain's DNS is on Cloudflare. The domain can still be bought at Namecheap: in Namecheap's dashboard the two nameservers are changed to the two Cloudflare gives. That is the only Namecheap screen after buying, and Cloudflare is used through its command-line tool and API afterwards, so its dashboard is barely needed.

**Deploying to it (pull, no inbound door).**
1. The build runs on this Mac or in GitHub Actions and pushes `dist/` to a **private** repo `hyperfeeling-site` (no public repo needed in this option).
2. The server Mac has a read-only deploy key for that repo. A `launchd` job checks every minute which commit should be live: the latest `main`, or a SHA pinned in a `DEPLOY_REF` file/tag.
3. Each release is checked out into `releases/<sha>/`; a symlink `current` is switched atomically. Rollback = pin an older SHA. The last five releases are kept.
4. After switching, the job requests the front page and both songs through the tunnel and switches back if any fails.

**What the server can do that Pages can't.** Real headers (CSP, anti-framing, HSTS, permissions policy), real rewrites (line addresses could return without 404s), compression, cache rules per file type, and per-load renaming later if wanted.

**Preparing the spare Mac.**
- Fresh macOS install (nothing personal on it), a separate non-admin account for the services, automatic security updates on.
- Never sleeps: `pmset` sleep off, restart after power failure on; lid open or a dummy display, on power and wired network if possible.
- **FileVault trade-off:** with FileVault on, a reboot waits at the password screen and the site stays down until someone unlocks it (planned reboots can use `fdesetup authrestart`). With it off, the disk is readable if the laptop is stolen. The disk only holds the built copy, so off is acceptable here.
- Battery: an always-plugged MacBook should cap charging (macOS optimised charging, or a charge limiter) to avoid battery swelling.
- Firewall on with stealth mode; no incoming ports. Remote access only over SSH with a key, LAN only, or through Cloudflare Access.
- `launchd` services: `cloudflared`, Caddy, the deploy puller; logs rotated.
- Monitoring: a free external uptime ping (alerts to Roman) and Cloudflare's own health view.

**Costs.** Domain about $11 the first year at Namecheap, renewals a few dollars more; Cloudflare free plan $0; electricity for an idle MacBook about €1–2 a month. No hosting fee, nothing variable.

**Risks.**
- Home power or internet down = site down. Cloudflare can serve cached pages for a while; GitHub Pages can stay as a cold standby.
- Upload speed: mitigated by Cloudflare's cache for the media.
- **Cloudflare's terms limit serving large amounts of video and audio through the free CDN.** The 78 MB fallback video and the songs may have to bypass the cache or move to Cloudflare R2 or another host. Check the current terms before launch.
- Some home internet contracts forbid running servers; a tunnel is outbound-only and small sites are rarely an issue, but it is worth checking.

**Who does what.**
- **Roman:** buys the domain; creates a free Cloudflare account and adds the domain; changes the two nameservers at Namecheap; prepares the spare Mac (fresh install, power, network, turns on Remote Login) and approves SSH access from this Mac; clicks the one-time `cloudflared` authorisation in the browser.
- **Claude:** everything else over SSH and the Cloudflare API: installs Caddy and `cloudflared`, creates the tunnel and DNS routes, writes the Caddy config (headers, rewrites, caching), the deploy puller with releases and rollback, the `launchd` services, the `pmset` and firewall settings, cache rules, monitoring, and an end-to-end test.

| # | Self-host step | Effort | Tokens |
|---|---|---|---|
| S1 | Prepare the server Mac (accounts, power, updates, firewall) | M | 60–100k |
| S2 | Tunnel and DNS for `hyperfeeling.com` and `www` | S–M | 40–60k |
| S3 | Caddy: static files, headers, rewrites, cache headers | S–M | 40–60k |
| S4 | Deploy puller: releases, SHA pinning, health check, rollback | M | 60–90k |
| S5 | Hardening: separate user, SSH keys, logs, battery cap | M | 50–80k |
| S6 | Cloudflare cache rules, uptime monitoring, alerts | S | 30–50k |

### Option A vs B

| | GitHub Pages | Spare Mac + Tunnel |
|---|---|---|
| Cost | Free | Free + electricity |
| Maintenance | None | Updates, uptime, the laptop itself |
| Speed worldwide | GitHub's CDN | Cloudflare's CDN (cached files) |
| Security headers | Meta tags only | Full |
| Line addresses without 404 | Only with generated pages | Yes |
| Source and site both private | Needs GitHub Pro (~$4/month) | Yes, free |
| Room for the "hyperreal" platform later | No | Yes, same machine and tunnel |

## 5. Suggested order

1. **Phase A, essentials (~450–650k tokens):** O2, O3, O7, O8, O9, I1, I3, I4, I5. Then the hosting switch-over last: O1 for Option A, or S1–S6 for Option B. Making the source private before the new host is live would take the site down.
2. **Phase B, real obfuscation (~450–700k):** O4, O5, I2, O10, I8.
3. **Phase C, optional (~200–320k):** O6, I7, I6.

Self-hosting (Option B, S1–S6) adds about 280–440k tokens on top of Phase A.

## 6. Decisions for Roman

- Hosting: Option A (GitHub Pages) or Option B (spare Mac + Cloudflare Tunnel).
- Which phases, in which order.
- I2: OK to download `three@0.160.0` once and host it inside the site?
- Option B: OK to leave FileVault off on the server Mac?
- Media: m4a only (drop the mp3 fallback for older browsers)?
