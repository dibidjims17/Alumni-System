# Cloudflare security deployment for Reunio

This directory prepares Reunio for Cloudflare without tying the API to a
specific host. Nothing is activated merely by committing these files. Local
development continues normally because `Cloudflare:RequireOriginSecret`
defaults to `false`.

## Prepared protection

- Worker API gateway with a fixed origin (not an open proxy)
- Secret-bearing origin requests to prevent bypassing Cloudflare
- Trusted real-client IP forwarding for ASP.NET rate limits and audit logs
- HTTPS/security headers for API, admin, and campaign website
- Cloudflare Pages-compatible headers for both frontends
- Environment-based admin API URL and production CORS allowlist
- A direct `/health` exception for hosting-provider liveness probes

Cloudflare account features such as DNS, WAF, rate limiting, and Zero Trust
Access still require dashboard setup after a domain and API host are chosen.

## Intended request path

```text
Mobile / Admin
      |
      v
api.your-domain.tld (Cloudflare WAF + Worker)
      |  X-Reunio-Origin-Secret
      v
Railway / Render / Azure ASP.NET origin
      |
      v
MySQL
```

## 1. Deploy the API origin first

Deploy the ASP.NET API to the chosen provider and verify its `/health`
endpoint. Do not enable the origin secret gate yet.

Set all normal production secrets at the provider (database, JWT, email,
Google OAuth), but keep the gate disabled:

```text
Cloudflare__RequireOriginSecret=false
```

## 2. Configure and deploy the Worker

Edit `api-gateway/wrangler.jsonc` and set `ORIGIN_URL` to the provider URL,
without `/api`, for example:

```json
"ORIGIN_URL": "https://reunio-api.example-host.app"
```

Generate one random secret of at least 32 bytes. PowerShell 5.1-compatible:

```powershell
$bytes = New-Object byte[] 48
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$secret = [Convert]::ToBase64String($bytes)
$rng.Dispose()
$secret
```

Copy the secret to the API host while the enforcement switch is still off,
then redeploy. This lets the API recognize trusted forwarding headers without
yet blocking direct recovery access:

```text
Cloudflare__OriginSecret=<random secret>
Cloudflare__RequireOriginSecret=false
```

From `cloudflare/api-gateway/`, authenticate and store that same value as an
encrypted Worker secret (never put it in `wrangler.jsonc`):

```bash
npx wrangler login
npx wrangler secret put ORIGIN_SECRET
npx wrangler deploy
```

Initially test the generated `*.workers.dev` URL:

```text
https://reunio-api-gateway.YOUR_SUBDOMAIN.workers.dev/health
```

Then attach `api.your-domain.tld` as the Worker's custom domain.

## 3. Lock the provider origin

Copy the exact same secret to the API host's encrypted environment variables:

```text
Cloudflare__OriginSecret=<same random secret>
Cloudflare__RequireOriginSecret=true
```

Redeploy the API. Confirm all three behaviors before updating clients:

1. Worker URL `/health` returns 200.
2. Worker URL `/api/...` reaches the API.
3. Provider URL `/api/...` returns 403, while provider `/health` remains 200.

If the Worker is misconfigured, set `Cloudflare__RequireOriginSecret=false`
at the provider to recover access. Do not remove the JWT or role checks; the
Worker is an additional layer, not a replacement for application security.

## 4. Configure CORS and clients

At the API host, allow only the deployed admin origin:

```text
Cors__AllowedOrigins__0=https://admin.your-domain.tld
```

At the Cloudflare Pages admin project, set this build variable:

```text
VITE_API_BASE_URL=https://api.your-domain.tld/api
```

The mobile app must use the same HTTPS API URL and then be rebuilt. Do not
enable an interactive Cloudflare challenge on the API hostname: native mobile
requests cannot complete browser challenge pages.

## 5. Deploy the two Cloudflare Pages projects

### Admin console

```text
Root directory:   alumni-admin
Build command:    npm ci && npm run build
Output directory: dist
```

Cloudflare Pages automatically provides SPA fallback when no top-level
`404.html` exists. `alumni-admin/public/_headers` is copied into the build.

### Campaign website

```text
Root directory:   alumni-website
Build command:    (leave empty)
Output directory: .
```

Update `alumni-website/config.js` `siteUrl` to its final custom URL. Its
Tracer QR then updates automatically.

## 6. Protect the admin with Cloudflare Access

After the domain is active:

1. Open **Zero Trust > Access controls > Applications**.
2. Create a **Self-hosted and private** application.
3. Set the hostname to `admin.your-domain.tld`.
4. Add an Allow policy for only approved school/admin email addresses or the
   school's email domain.
5. Enable MFA and choose a short session duration (for example, 8 hours).
6. Keep the application's own JWT login and roles enabled behind Access.

Also add the final admin URL to the Google OAuth client's authorized origins.

## 7. Cloudflare zone security checklist

- SSL/TLS mode: **Full (strict)**
- Always Use HTTPS: **On**
- Minimum TLS version: **1.2**
- DNSSEC: **On**
- WAF: enable the **Cloudflare Free Managed Ruleset**
- Cache: bypass `/api/*` and `/Uploads/*`
- Rate-limit `/api/Auth/login`, `/api/Admin/login`, forgot-password, and
  reset-password paths; use **Block**, not an interactive challenge
- Do not enable blanket Bot Fight/Managed Challenge behavior on the API
  hostname because it can break the native mobile app
- Review Security Events for false positives before tightening rules

The API already enforces its own five-per-minute authentication limit. Edge
rate limiting is defense in depth and should not replace it.

## Secrets that must never be committed

- Worker `ORIGIN_SECRET`
- API `Cloudflare__OriginSecret`
- JWT signing key
- Database password
- Email app password/API key
- Google OAuth secrets

Worker local secret files (`.dev.vars*`, `.env*`) and Wrangler state are
ignored by the repository root `.gitignore`.
