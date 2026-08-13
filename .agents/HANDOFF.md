# Handoff — Finance Tracker (mobile tabs / nav / profile)

> Use this file at the start of a new chat: `@.agents/HANDOFF.md`  
> Full prior thread (searchable): agent transcript `fe53c0f2-abc3-4f06-85ce-f8b903b080c6`  
> Repo: `https://github.com/Rissho-Labs/Financy-Tracker.git` · package `com.financetracker.app`

## Goal of recent work

Stabilize Android tab UX (Home / Cards / Goals / Profile): kill menu/content jumps (FOUC), then share-profile + align cross-tab spacing — **without regressing nav geometry**.

## Done (keep intact)

| Area | What | Key files / commits |
|------|------|---------------------|
| Tab carousel | Icon-only bottom nav, 44px pill, settled indicator via CSS `::before`, JS thumb only while dragging | `ft-tab-carousel.css/js`, early `ft-tab-nav-boot.js` · `fc65b95`…`1db0c3c` |
| Nav geometry | `.bottom-nav` stays **absolute** (not `relative` — relative grew outline upward); fixed height 58px; safe-area on `bottom` only | · `e1140b2` |
| Identity FOUC | Early hydrate username/`@user`/`#tag`; stable expenses empty/list min-heights | home/profile scripts + CSS · `57aa75f` |
| Share profile | Native `navigator.share` (+ clipboard fallback); invite URL `https://financy-4d5f7.web.app/invite?u=&t=`; landing + `ft-friend://` deep link | `ft-qr.js`, `profile.js`, `invite.html`, `firebase.json`, AndroidManifest · `573deb0` |
| Avatar photo | Tap avatar/camera → system image picker; compress JPEG; local `ft_user` + Storage `avatars/{uid}/profile.jpg` + Auth/Firestore when online | `profile.js/html/css`, `firebase-entry.mjs`, `storage.rules` |
| Spacing | Tokens `--home-content-top: 4px`, `--home-scroll-spacer: 118px` shared across Home/Cards/Goals/Profile; Profile `padding-top: 0` on `.profile-scroll` | `home.css`, `cards.css`, `goals.css`, `profile.css` · (spacing commit) |
| Type scale | Shared `--home-page-title` (28), `--home-section-title` (20), `--home-label-size` (13), `--home-body-size` (14), `--home-meta-size` (12), `--home-icon-btn` (38); notif icons 20×20 @ 1.8; greeting without emoji | `home.css` (ft-ios) + tab CSS |

## Do NOT touch (regression traps)

- Bottom-nav position: keep **absolute**; do not switch to `relative` to “fix” layout
- Do not restore text labels that expand the pill over neighbors
- Do not remove early identity / expenses hydrate or min-height locks that prevent FOUC
- Prefer not to HTML-prefetch adjacent tabs (caused jumps before)
- Avoid casual edits to settled-indicator / thumb drag split in carousel CSS/JS

## Device / build

- Device used: Samsung S10e (`SM-G970F`)
- `JAVA_HOME` = Android Studio JBR (`C:\Program Files\Android\Android Studio\jbr`)
- `ANDROID_HOME` / adb = `%LOCALAPPDATA%\Android\Sdk`
- Flow: `npm run cap:sync` → `android/gradlew.bat installDebug`
- **After every UI/feature implementation in a session:** run the flow above and install on the USB-connected device (do not wait for the user to ask)

## Still open / next likely tasks

1. **Visual QA on device**: confirm type scale + spacing + balance-hide persist after tab switches
2. **Invite hosting**: public invite links need `firebase deploy --only hosting` (placeholders: Play/App Store URLs)
3. **Storage rules**: `firebase login` then `npm run deploy:rules` so avatar upload syncs to cloud
4. **Avisos modal**: still demo mock — polish when resumed
5. Any new feature work should treat the frozen chrome table above as intact unless the user asks to change nav/FOUC again

## How next chat should start

Paste or attach:

```text
Continue from @.agents/HANDOFF.md
Do not regress tab nav / FOUC fixes listed there.
Current focus: <what you want next>
```

Optional deeper context: ask the agent to search prior conversation / transcript `fe53c0f2-abc3-4f06-85ce-f8b903b080c6` only for specifics — prefer this handoff over dumping the full chat (avoids context wear).
