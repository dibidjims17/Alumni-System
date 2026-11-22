// Reunio API gateway for Cloudflare Workers.
//
// Clients call this Worker (preferably api.your-domain.tld). The Worker
// forwards to the private-ish Railway/Render origin and injects a secret
// header. The ASP.NET middleware rejects direct origin requests that do not
// have the same secret, preventing a simple Cloudflare/WAF bypass.

const ALLOWED_METHODS = new Set([
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "OPTIONS",
]);

function jsonError(status, title) {
  return new Response(JSON.stringify({ title, status }), {
    status,
    headers: {
      "Content-Type": "application/problem+json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function hardenResponse(response, publicUrl, originUrl) {
  const headers = new Headers(response.headers);
  headers.delete("Server");
  headers.delete("X-Powered-By");
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()"
  );
  headers.set("Strict-Transport-Security", "max-age=31536000");

  // Do not leak the provider hostname in the unlikely event the API returns
  // an absolute redirect to its own origin.
  const location = headers.get("Location");
  if (location && location.startsWith(originUrl.origin)) {
    headers.set("Location", publicUrl.origin + location.slice(originUrl.origin.length));
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    if (!ALLOWED_METHODS.has(request.method))
      return jsonError(405, "Method Not Allowed");

    if (!env.ORIGIN_URL || !env.ORIGIN_SECRET)
      return jsonError(503, "Gateway is not configured");

    let originUrl;
    try {
      originUrl = new URL(env.ORIGIN_URL);
      if (originUrl.protocol !== "https:")
        return jsonError(503, "Gateway origin must use HTTPS");
    } catch {
      return jsonError(503, "Gateway origin is invalid");
    }

    const publicUrl = new URL(request.url);
    if (originUrl.host === publicUrl.host)
      return jsonError(508, "Gateway origin points back to itself");

    const targetUrl = new URL(publicUrl.pathname + publicUrl.search, originUrl);
    // Constructing from the incoming Request preserves its streamed body and
    // manual redirect mode without buffering uploads in Worker memory.
    const originRequest = new Request(targetUrl.toString(), request);
    const headers = originRequest.headers;

    // Always overwrite client-supplied copies. Only this Worker knows the
    // origin secret, so the API can safely trust the accompanying client IP.
    headers.delete("Forwarded");
    headers.delete("X-Forwarded-For");
    headers.delete("X-Forwarded-Proto");
    headers.delete("X-Real-IP");
    headers.set("X-Reunio-Origin-Secret", env.ORIGIN_SECRET);
    headers.set(
      "X-Reunio-Client-IP",
      request.headers.get("CF-Connecting-IP") || ""
    );
    headers.set("X-Reunio-Forwarded-Proto", "https");
    headers.set("X-Forwarded-Host", publicUrl.host);
    headers.set("Cache-Control", "no-cache");

    try {
      const originResponse = await fetch(originRequest);
      return hardenResponse(originResponse, publicUrl, originUrl);
    } catch (error) {
      console.error("Origin request failed", error);
      return jsonError(502, "API origin is unavailable");
    }
  },
};
