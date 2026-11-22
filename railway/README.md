# Reunio on Railway (trial/pilot)

This setup deploys the current ASP.NET API and MySQL with minimal application
changes. Use synthetic data during the trial. Before a permanent public launch,
upgrade the API from out-of-support .NET 9/EF Core 9 to a supported stack.

## What works

| Feature | Railway status |
| --- | --- |
| Student/admin login and JWT roles | Works |
| Profiles, careers, tracer study, directory | Works |
| News, events, jobs, applications, suggestions | Works |
| Push notifications | Works over HTTPS |
| Scheduled News/Event publishing | Works while API is awake; use Hobby for always-on |
| Images, resumes, proofs, documents | Works with a volume mounted at `/app/Uploads` |
| Invitations/password-reset email | Use `Email__Provider=Resend`; SMTP is blocked below Pro |
| Google Sign-In | Works after updating OAuth origins and Android configuration |

## 1. Create the project and MySQL

1. In Railway, create **New Project > Empty Project** and name it `Reunio`.
2. On the canvas choose **+ New > Database > MySQL**.
3. Keep MySQL private. Do not enable Public Access for normal API operation.
4. Rename the database service to `MySQL` if Railway used another name; the
   reference-variable examples below assume that service name.

## 2. Add the API service without deploying yet

1. Choose **+ New > Empty Service** and name it `reunio-api`.
2. Open the service **Settings**.
3. Set **Root Directory** to `/MyApp`.
4. Under **Source**, connect `dibidjims17/Alumni-System`.
5. Select branch `design/cdm-portal-revamp` while testing this work.

Railway will automatically detect `MyApp/Dockerfile` after these changes are
committed and pushed.

## 3. Add API variables

Open the API service's **Variables** tab. Add these individually. Railway
reference variables keep the MySQL password out of this repository:

```text
ASPNETCORE_ENVIRONMENT=Production
ConnectionStrings__DefaultConnection=Server=${{MySQL.MYSQLHOST}};Port=${{MySQL.MYSQLPORT}};Database=${{MySQL.MYSQLDATABASE}};User=${{MySQL.MYSQLUSER}};Password=${{MySQL.MYSQLPASSWORD}};SslMode=Preferred;
Jwt__Issuer=MyApp
Jwt__Audience=MyAppUsers
Database__MigrateOnStartup=true
Cloudflare__RequireOriginSecret=false
```

Generate `Jwt__Key` locally and paste only its output into Railway:

```powershell
$bytes = New-Object byte[] 48
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
$rng.Dispose()
```

```text
Jwt__Key=<random output, never commit this>
```

### First SuperAdmin only

For the first deployment of a new empty database, add:

```text
BootstrapAdmin__Enabled=true
BootstrapAdmin__Username=<new non-test username>
BootstrapAdmin__FullName=<real administrator name>
BootstrapAdmin__Email=<administrator email>
BootstrapAdmin__Password=<unique password, at least 12 characters>
```

After the first successful login, immediately delete
`BootstrapAdmin__Password` and set `BootstrapAdmin__Enabled=false`. The account
remains in MySQL.

## 4. Add persistent upload storage

From the API service choose **+ Volume** and mount it at exactly:

```text
/app/Uploads
```

Free/Trial volume capacity is limited (currently 500 MB). That is enough to
verify uploads, not enough for a permanent alumni document archive. Hobby
currently permits up to 5 GB. Move files to object storage for larger use.

## 5. Configure deploy health

In API **Settings > Deploy** set:

```text
Healthcheck Path: /health
Healthcheck Timeout: 300 seconds
Restart Policy: ON_FAILURE
```

Railway injects `PORT`; the Docker entrypoint listens on it automatically.

## 6. Deploy and create a public API domain

Review Railway's staged changes and deploy. The first start can take longer
because EF Core applies every migration to the new MySQL database.

After `/health` is green:

1. Open **Settings > Networking > Public Networking**.
2. Select **Generate Domain**.
3. Test `https://YOUR_DOMAIN/health` and expect `{"status":"ok"}`.
4. Do not expose the MySQL service publicly.

## 7. Keep email features on Trial/Hobby

Railway disables outbound SMTP on Free, Trial, and Hobby. Create a Resend
account/API key and configure:

```text
Email__Provider=Resend
Email__ApiKey=<Resend secret key>
Email__SenderName=Reunio Alumni Portal
Email__SenderEmail=<verified Resend sender>
```

Resend's onboarding sender can initially send only to the account owner's
email. A verified domain is required before sending real alumni invitations.
Never commit the API key.

## 8. Optional services

Set these before testing the corresponding features:

```text
Google__ClientId=<Google web client ID>
Google__ClientIds__0=<Google web client ID>
Site__WebsiteUrl=<campaign website URL>
Site__ApkUrl=https://github.com/dibidjims17/Alumni-System/releases/download/v.1.0.0/Reunio-AlumniSystem.apk
```

## 9. Connect the clients

The final client API value is:

```text
https://YOUR_RAILWAY_DOMAIN/api
```

- Admin/Cloudflare Pages: set `VITE_API_BASE_URL` to that value and rebuild.
- Mobile: update its production API URL and rebuild the APK.
- API CORS: set `Cors__AllowedOrigins__0` to the final admin HTTPS origin.
- Google OAuth: add the admin URL as an authorized JavaScript origin.

The existing APK still points at the local LAN API until it is rebuilt.

## 10. Cloudflare later

Once the Railway API works, follow `cloudflare/README.md`. Cloudflare can use
the Railway public domain as its fixed `ORIGIN_URL`, then the Railway origin can
be locked behind the Worker secret.

## Trial limitations

- Trial credit is finite and may end before 30 days.
- Free services sleep; scheduled hosted services do not execute while asleep.
- The first request after sleep can be slow.
- SMTP is unavailable below Pro; use Resend's HTTPS API.
- Volume-backed deployments have brief downtime and cannot safely run multiple
  replicas against one filesystem.
