# Reunio · Alumni Connect — Promo Website

Static landing page that promotes the mobile app (capstone device #3:
**mobile app** + **desktop admin** + **this website**). There is no build
step or package installation — host the folder anywhere (GitHub Pages,
Netlify, a school server, or even a USB stick). The MIT-licensed QR
generator is vendored locally as `qrcode.js`, so QR generation also works
without a third-party service.

## Defense-day checklist

1. **Build the APK** (inside `alumni-mobile/`):
   ```bash
   npx eas build -p android --profile preview
   ```
   When it finishes, copy the direct artifact URL, or publish the signed
   APK to GitHub Releases and copy that download URL.
   Offline alternative: `npx expo run:android --variant release`, then
   `android/app/build/outputs/apk/release/app-release.apk`.
2. **Point the site at it**: set `installUrl` in `config.js` to the APK
   URL (current: v1.0.0 GitHub Release, ~190 MB). The download QR is
   generated automatically from that value every time the page loads;
   there is no separate QR command or image update.
   (`downloads/alumni.apk` remains as a self-hosted fallback — used only
   when `installUrl` is empty.) Update `apkVersion` in `config.js` if the
   version changed.
3. **Host this folder** and open it on a PC connected to the demo WiFi.
   Panel members on the same WiFi open the site, scan the QR, install,
   and log in with their alumni accounts.
4. **Tracer Study campaign QR**: the `#tracer` section explains the
   graduate pre-screening questionnaire. Its QR is generated
   automatically from `siteUrl + "#tracer"` in `config.js`. The current
   `siteUrl` points at the GitHub Pages path for this repo — update that
   one value if you host elsewhere. The PNG files in `assets/` are only
   offline fallbacks; the live page normally displays generated SVG QRs.

## Notes

- The app talks to the backend over the **local network** (`config.js` in
  `alumni-mobile/`), so installers must join the same WiFi as the demo
  server. A public release would need hosted API + rebuild — out of scope
  for the LAN demo.
- The download button auto-detects whether `downloads/alumni.apk` exists
  (via HEAD request when served over http) and shows a "not uploaded yet"
  state otherwise.
- Keep `installUrl` aligned with `Site:ApkUrl` in the API's local
  `appsettings.json` so website downloads and backend invitation messages
  point to the same release.
