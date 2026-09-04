// Promo site settings — edit these before defense day.
window.SITE_CONFIG = {
  // Primary install link: direct EAS artifact (Expo-hosted, always live).
  // Rebuild with:  npx eas build -p android --profile preview
  // (run inside alumni-mobile/), then paste the new artifact URL here.
  installUrl: "https://expo.dev/artifacts/eas/KywuzGDxXi0ZfJSncwVww6DuiYgwLtWsuac5VjhvvoE.apk",

  // Fallback: self-hosted APK (drop the built file here). Used only when
  // installUrl is empty.
  apkPath: "downloads/alumni.apk",

  // Shown next to the download button.
  apkVersion: "v1.0.0",
  apkMinAndroid: "Android 8.0+",

  // Static QR image (generate from the hosted APK URL, save as PNG).
  // If the file is missing, a styled placeholder is shown instead.
  qrPath: "assets/qr-download.png",
};
