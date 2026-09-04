// Promo site behavior: mobile nav, config-driven labels, APK availability
// check, and QR fallback. No dependencies.
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

  // APK availability: served over http(s) we can HEAD the file; on file://
  // the check fails, so leave the button active (it works once hosted).
  var btn = document.getElementById("apkButton");
  var note = document.getElementById("apkNote");
  function setState(ok) {
    if (!btn || !note) return;
    if (ok) {
      btn.removeAttribute("aria-disabled");
      note.textContent = "APK is ready — tap to download, then follow the install steps below.";
    } else {
      btn.setAttribute("aria-disabled", "true");
      note.textContent =
        "APK not uploaded yet — the download activates once downloads/alumni.apk is in place (see README).";
    }
  }
  if (window.location.protocol.indexOf("http") === 0 && cfg.apkPath) {
    fetch(cfg.apkPath, { method: "HEAD" }).then(
      function (res) { setState(res.ok); },
      function () { setState(false); }
    );
  } else if (note) {
    note.textContent = "Open this page over http(s) or host it to enable one-tap download checks.";
  }

  // QR fallback: if the generated QR png is missing, show the placeholder.
  var qr = document.getElementById("qrImg");
  var qrFb = document.getElementById("qrFallback");
  if (qr) {
    qr.addEventListener("error", function () {
      qr.style.display = "none";
      if (qrFb) qrFb.hidden = false;
    });
    // Fire the check for cached-broken images too.
    if (qr.complete && qr.naturalWidth === 0) {
      qr.style.display = "none";
      if (qrFb) qrFb.hidden = false;
    }
  }
})();
