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
   Download the `.apk` from the EAS link when it finishes.
   Offline alternative: `npx expo run:android --variant release`, then
   `android/app/build/outputs/apk/release/app-release.apk`.
2. **Drop it here**: save the file as `downloads/alumni.apk`
   (exact name — the button and availability check use it).
   Update `apkVersion` in `config.js` if the version changed.
3. **Generate the QR**: point any free QR generator at the *hosted* APK
   URL (e.g. `https://<your-site>/downloads/alumni.apk`) and save it as
   `assets/qr-download.png` (until then a styled placeholder shows).
4. **Host this folder** and open it on a PC connected to the demo WiFi.
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
