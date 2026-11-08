# Deployment (T-401, D-029, D-030)

Free hosting for the demo: **Neon** (database), **Render** (backend, Docker), **Vercel** (frontend). Everything below is on free plans and needs no payment method. Only `main` is deployed: both hosts build automatically when `main` changes, so only reviewed code goes live.

```
Browser ── https://<project>.vercel.app ──────── Vercel (static React build)
   │
   └── API calls ── https://<service>.onrender.com ── Render (backend Docker image)
                                                         │
                                                         └── Neon PostgreSQL (TLS)
```

Rules for every step:

- Secrets (database password, `JWT_SECRET`) go **only** into the hosting dashboards. Never into the repository, a chat, or a screenshot.
- When a host asks for GitHub access, allow **only** the `finding-house` repository.
- Pick regions close to each other and to Seattle: Neon **AWS US West 2 (Oregon)**, Render **Oregon (US West)**.

## 1. Database on Neon

1. Sign in at [neon.com](https://neon.com) with GitHub.
2. Create a project: name `finding-house`, Postgres **16** (the version the tests use), region AWS US West 2 (Oregon).
3. On the project dashboard click **Connect**, and switch **Connection pooling off**. The direct connection is needed because the schema migrations (Flyway) keep a session; the app opens at most 5 connections, so it does not need the pooler.
4. From the connection string `postgresql://ROLE:PASSWORD@HOST/DATABASE?sslmode=require...`, note the four parts. You will enter them in Render as:
   - `DB_URL` = `jdbc:postgresql://HOST/DATABASE?sslmode=require`
   - `DB_USERNAME` = `ROLE`
   - `DB_PASSWORD` = `PASSWORD`

   `DB_URL` holds **no username or password** and no `@`. A URL like `jdbc:postgresql://neondb_owner:...@ep-...` stops the backend with "Driver claims to not accept jdbcUrl", and it prints the password into the log. Drop `&channel_binding=require` too.

   The tables are created by the backend on its first start; do not create them by hand.

## 2. Backend on Render

1. Sign in at [render.com](https://render.com) with GitHub.
2. **New → Web Service**, choose the `lamkhai0604/finding-house` repository.
3. Settings:

   | Field | Value |
   | --- | --- |
   | Name | `finding-house-api` (the URL becomes `https://finding-house-api.onrender.com`, or similar if taken) |
   | Region | Oregon (US West) |
   | Branch | `main` |
   | Root Directory | `backend` |
   | Language | Docker (uses `backend/Dockerfile`) |
   | Instance Type | **Free** |
   | Health Check Path (Advanced) | `/actuator/health` |

4. Environment variables:

   | Key | Value |
   | --- | --- |
   | `DB_URL` | from step 1 |
   | `DB_USERNAME` | from step 1 |
   | `DB_PASSWORD` | from step 1 |
   | `JWT_SECRET` | a **new** random value, not the one in your local `.env`: `openssl rand -base64 48` (Windows PowerShell: see the README) |
   | `CLIENT_IP_HEADER` | `CF-Connecting-IP` |
   | `CORS_ALLOWED_ORIGINS` | leave out for now; added in step 4 |
   | `ADMIN_EMAILS` | optional (D-036): e-mail of an **existing tenant account** to make administrator, comma-separated for several. Sign up first, then set this; it applies when the service restarts. Removing an address does not demote the account |

5. **Create Web Service**. The first build takes a few minutes. When the service shows **Live**, open `https://<service>.onrender.com/actuator/health`: it must show `{"status":"UP"}`.

## 3. Frontend on Vercel

1. Sign in at [vercel.com](https://vercel.com) with GitHub (Hobby plan).
2. **Add New → Project**, import `lamkhai0604/finding-house`.
3. Settings:

   | Field | Value |
   | --- | --- |
   | Root Directory | `frontend` |
   | Framework Preset | Vite (detected) |
   | Environment variable | `VITE_API_BASE_URL` = the Render URL from step 2, exactly, with no trailing slash, e.g. `https://finding-house-api.onrender.com` |

4. **Deploy**. Note the production URL, e.g. `https://finding-house.vercel.app`.

## 4. Allow the frontend to call the backend

In Render → `finding-house-api` → **Environment**, add `CORS_ALLOWED_ORIGINS` = the Vercel production URL (exactly, no trailing slash) and save. Render redeploys by itself.

Then check the deployment (T-405): GitHub → **Actions** → **live-smoke** → **Run workflow**, enter the two URLs, and run. It is read-only: it creates nothing. It waits for the backend to wake up, then checks the API, CORS, the host's security headers, the CSP, SPA routing, and opens the home and browse pages in Chrome on desktop and phone sizes. Or send Claude the two URLs (they are public, not secrets) and Claude runs it.

## What to expect

- **First visit after a quiet period takes up to about a minute**: the free Render service sleeps after 15 minutes without traffic. Open the site a few minutes before showing it in an interview.
- **Vercel preview deployments** (for branches other than `main`) cannot call the API, because CORS allows only the production URL. That is intended.
- **No data at first.** Register through the site. Do **not** run `scripts/sample-data/load_sample_data.py` against the live site: its passwords are published in this repository, so anyone could log in as those landlords.
- **Sign-ups are limited** to 10 attempts per network address per hour (D-031). If you test sign-up many times from home, you may see "Too many sign-up attempts"; it clears within the hour.
- **Changing a setting**: edit it in the dashboard; Render and Vercel redeploy. A change to `VITE_API_BASE_URL` needs a Vercel redeploy, because it is built into the page.

## Live

| Part | URL |
| --- | --- |
| Site | https://finding-house.vercel.app |
| API | https://finding-house.onrender.com (health: `/actuator/health`) |
| Database | Neon, AWS US West 2 (Oregon) |

First deployed 2026-11-05; checked by live-smoke run 42165540632.

Incident during the first deploy: the Neon password appeared in a screenshot of the Render log (it had been pasted inside `DB_URL`). Khai reset the password in Neon and updated Render the same evening (confirmed 2026-11-05, 21:22 PT). The merge note for `docs/T-401-live` said the reset had already happened before Khai confirmed it; this entry is the confirmed record.

## Demo content

To fill the live site with the demo rooms (with photos), follow [DEMO-CONTENT.md](DEMO-CONTENT.md).
Do not load `scripts/sample-data` on the live site: its passwords are public.

## If something goes wrong

**Never share a screenshot that shows a password.** Before sending a log, hide anything after `npg_` or between `:` and `@` in a connection string. If a password was shown anywhere, reset it in Neon (Roles → Reset password) and update `DB_PASSWORD` in Render.


| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Render build fails | Root Directory not `backend` | Set it, redeploy |
| Render log: `JWT_SECRET` too short / missing | Variable missing | Add a 48-byte random value |
| Render log: connection refused / SSL error to Neon | `DB_URL` not in JDBC form | Use `jdbc:postgresql://HOST/DATABASE?sslmode=require` |
| Render log: `UnknownHostException: HOST` | The template word `HOST` was pasted as is | Put the real Neon host (`ep-...neon.tech`) in `DB_URL` |
| Render log: `Driver ... claims to not accept jdbcUrl` | Username and password inside `DB_URL` | Remove `user:password@`; they go in `DB_USERNAME` / `DB_PASSWORD`. Reset the password, it is now in the log |
| Render log: `Could not bind properties to 'HttpProperties'` | `CORS_ALLOWED_ORIGINS` not exact origins | `https://name.vercel.app`, no trailing `/`, no path, comma between several; search the log for `cors-allowed-origins` to see the refused value |
| Site loads, footer says "API is unreachable" | Backend asleep, or `VITE_API_BASE_URL` wrong | Wait a minute and reload; check the variable and redeploy Vercel |
| Browser console: blocked by CORS | `CORS_ALLOWED_ORIGINS` missing or not exactly the Vercel URL | Fix the value in Render |
| Browser console: violates Content Security Policy (connect-src) | Vercel built without the right `VITE_API_BASE_URL` | Fix the variable, redeploy Vercel |
