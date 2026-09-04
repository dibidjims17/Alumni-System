# Alumni Connect — Promo Website

Static landing page that promotes the mobile app (capstone device #3:
**mobile app** + **desktop admin** + **this website**). No build step, no
dependencies — host the folder anywhere (GitHub Pages, Netlify, school
server, or even a USB stick).

## Defense-day checklist

1. **Build the APK** (inside `alumni-mobile/`):
   ```bash
   npx eas build -p android --profile preview
   ```
   When it finishes, copy the direct artifact URL
   (`https://expo.dev/artifacts/eas/….apk`).
   Offline alternative: `npx expo run:android --variant release`, then
   `android/app/build/outputs/apk/release/app-release.apk`.
2. **Point the site at it**: set `installUrl` in `config.js` to the
   artifact URL (current: v1.0.0 preview build, ~190 MB).
   Regenerate the QR to match:
   ```bash
   python -m pip install qrcode pillow
   python -c "import qrcode; q=qrcode.make('<artifact-url>'); q.save('alumni-website/assets/qr-download.png')"
   ```
   (`downloads/alumni.apk` remains as a self-hosted fallback — used only
   when `installUrl` is empty.) Update `apkVersion` in `config.js` if the
   version changed.
3. **Host this folder** and open it on a PC connected to the demo WiFi.
   Panel members on the same WiFi open the site, scan the QR, install,
   and log in with their student accounts.

## Notes

- The app talks to the backend over the **local network** (`config.js` in
  `alumni-mobile/`), so installers must join the same WiFi as the demo
  server. A public release would need hosted API + rebuild — out of scope
  for the LAN demo.
- The download button auto-detects whether `downloads/alumni.apk` exists
  (via HEAD request when served over http) and shows a "not uploaded yet"
  state otherwise.
