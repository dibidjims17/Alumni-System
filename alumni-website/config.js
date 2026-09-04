// Promo site settings — edit these before defense day.
window.SITE_CONFIG = {
  // Relative path of the installable APK (drop the built file here).
  // Build it with:  npx eas build -p android --profile preview
  // (run inside alumni-mobile/). See README.md for the full flow.
  apkPath: "downloads/alumni.apk",

  // Shown next to the download button.
  apkVersion: "v1.0.0",
  apkMinAndroid: "Android 8.0+",

  // Static QR image (generate from the hosted APK URL, save as PNG).
  // If the file is missing, a styled placeholder is shown instead.
  qrPath: "assets/qr-download.png",
};
