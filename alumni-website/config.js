// Promo site settings — edit these before defense day.
window.SITE_CONFIG = {
  // Primary install link: signed APK on GitHub Releases. Keep in sync
  // with Site:ApkUrl in appsettings.json (backend invite emails).
  installUrl: "https://github.com/dibidjims17/Alumni-System/releases/download/v.1.0.0/Reunio-AlumniSystem.apk",

  // Fallback: self-hosted APK (drop the built file here). Used only when
  // installUrl is empty.
  apkPath: "downloads/alumni.apk",

  // Shown next to the download button.
  apkVersion: "v1.0.0",
  apkMinAndroid: "Android 8.0+",

  // Optional static fallback. The visible QR is generated automatically
  // from installUrl in the browser whenever the page loads.
  qrPath: "assets/qr-download.png",

  // Canonical URL where THIS site is hosted (no trailing fragment). The
  // Tracer Study QR is generated automatically as siteUrl + "#tracer".
  // Change only this value if the website moves to another address.
  siteUrl: "https://reunio-alumni.pages.dev/",
};
