// Promo site behavior: mobile nav, config-driven labels, APK availability
// check, and QR codes generated from config. Depends on qrcode.js (MIT).
(function () {
  "use strict";
  var cfg = window.SITE_CONFIG || {};

  // Footer year.
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  // Labels from config.
  if (cfg.apkVersion) {
    var hv = document.getElementById("heroVersion");
    var dv = document.getElementById("dlVersion");
    if (hv) hv.textContent = cfg.apkVersion;
    if (dv) dv.textContent = cfg.apkVersion;
  }
  if (cfg.apkMinAndroid) {
    var ha = document.getElementById("heroAndroid");
    if (ha) ha.textContent = cfg.apkMinAndroid;
  }

  // Mobile nav toggle.
  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.addEventListener("click", function (e) {
      if (e.target.tagName === "A") links.classList.remove("open");
    });
  }

  // Download wiring: prefer the hosted installUrl (GitHub Releases or
  // Expo artifact); otherwise fall back to the self-hosted apkPath with
  // an availability check.
  var btn = document.getElementById("apkButton");
  var note = document.getElementById("apkNote");
  function setState(ok, readyText) {
    if (!btn || !note) return;
    if (ok) {
      btn.removeAttribute("aria-disabled");
      note.textContent = readyText;
    } else {
      btn.setAttribute("aria-disabled", "true");
      note.textContent =
        "APK not uploaded yet — the download activates once downloads/alumni.apk is in place (see README).";
    }
  }
  if (cfg.installUrl) {
    if (btn) {
      btn.setAttribute("href", cfg.installUrl);
      btn.setAttribute("target", "_blank");
      btn.setAttribute("rel", "noopener");
      btn.removeAttribute("download");
    }
    setState(true, "Direct download — tap to get the APK (~190 MB), then follow the install steps below.");
  } else if (window.location.protocol.indexOf("http") === 0 && cfg.apkPath) {
    fetch(cfg.apkPath, { method: "HEAD" }).then(
      function (res) { setState(res.ok, "APK is ready — tap to download, then follow the install steps below."); },
      function () { setState(false); }
    );
  } else if (note) {
    note.textContent = "Open this page over http(s) or host it to enable one-tap download checks.";
  }

  // QR codes are rendered in the browser from config on every load, so
  // editing a link in config.js updates the QR automatically — no PNG
  // regeneration step. The static PNGs in assets/ remain as fallback if
  // qrcode.js is missing or generation fails.
  function wireQrFallback(imgId, fallbackId) {
    var img = document.getElementById(imgId);
    var fb = document.getElementById(fallbackId);
    if (!img) return;
    img.addEventListener("error", function () {
      img.style.display = "none";
      if (fb) fb.hidden = false;
    });
    // Fire the check for cached-broken images too.
    if (img.complete && img.naturalWidth === 0) {
      img.style.display = "none";
      if (fb) fb.hidden = false;
    }
  }

  function renderQr(imgId, fallbackId, text, fallbackPath) {
    var img = document.getElementById(imgId);
    var fb = document.getElementById(fallbackId);
    if (!img) return;
    // Restore the configured static image first. Successful generation
    // immediately replaces it; otherwise it remains as the fallback.
    if (fallbackPath) img.src = fallbackPath;
    if (!text || typeof qrcode !== "function") {
      // No source URL, or qrcode.js did not load: keep the static PNG
      // and let the fallback placeholder cover a missing one.
      wireQrFallback(imgId, fallbackId);
      return;
    }
    try {
      var qr = qrcode(0, "M"); // 0 = auto-pick version, M = medium ECC
      qr.addData(text);
      qr.make();
      // SVG data URL stays crisp at any print size.
      var svg = qr.createSvgTag({ cellSize: 4, margin: 8, scalable: true });
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
      img.style.display = "";
      if (fb) fb.hidden = true;
    } catch (e) {
      wireQrFallback(imgId, fallbackId);
    }
  }

  var apkQrTarget = cfg.installUrl || "";
  if (!apkQrTarget && cfg.apkPath && window.location.protocol.indexOf("http") === 0) {
    apkQrTarget = new URL(cfg.apkPath, window.location.href).href;
  }
  // Preserve the trailing slash in siteUrl. For a GitHub Pages project
  // site, /project/#tracer and /project#tracer are not equivalent.
  var tracerQrTarget = cfg.siteUrl
    ? cfg.siteUrl.replace(/#.*$/, "") + "#tracer"
    : "";

  renderQr("qrImg", "qrFallback", apkQrTarget, cfg.qrPath);
  renderQr(
    "qrTracerImg",
    "qrTracerFallback",
    tracerQrTarget,
    "assets/qr-tracer.png"
  );

  // Tracer guide: show the printable URL under the poster QR.
  var tracerUrl = document.getElementById("tracerUrl");
  if (tracerUrl && tracerQrTarget) {
    tracerUrl.textContent = " " + tracerQrTarget;
  }
})();
