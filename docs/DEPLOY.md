# 🚀 Deploy వంశవృక్షం on Railway — Step-by-Step Guide

---

## PREREQUISITES (install once)

```bash
# 1. Git
git --version          # should print git version
# If not installed: https://git-scm.com/downloads

# 2. Node.js 18+
node --version         # should print v18.x or higher
# If not installed: https://nodejs.org

# 3. Railway CLI
npm install -g @railway/cli
railway --version      # confirm install
```

---

## STEP 1 — Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `vamsavriksham`
3. Set to **Private** (recommended)
4. Do NOT initialize with README (we have one)
5. Click **Create repository**
6. Copy the repo URL — looks like:
   `https://github.com/YOUR_USERNAME/vamsavriksham.git`

---

## STEP 2 — Initialize & Push to GitHub

Open terminal in the `vamsavriksham/` folder you downloaded:

```bash
# Enter the project folder
cd vamsavriksham

# Initialize git
git init

# Add all files
git add .

# First commit
git commit -m "feat: initial vamsavriksham family tree saas"

# Connect to GitHub (replace with YOUR repo URL)
git remote add origin https://github.com/YOUR_USERNAME/vamsavriksham.git

# Push to GitHub
git branch -M main
git push -u origin main
```

✅ Verify: refresh your GitHub repo — you should see all files.

---

## STEP 3 — Create Railway Account & Project

1. Go to https://railway.app
2. Click **Login** → **Login with GitHub**
3. Authorize Railway to access your GitHub
4. Click **New Project**
5. Select **Deploy from GitHub repo**
6. Find and select `vamsavriksham`

---

## STEP 4 — Add PostgreSQL Database (Tier 3)

Inside your Railway project:

1. Click **+ New Service**
2. Select **Database** → **PostgreSQL**
3. Railway creates the database instantly
4. Click on the PostgreSQL service → **Variables** tab
5. Copy `DATABASE_URL` — you'll need it soon

---

## STEP 5 — Deploy Backend (Tier 2)

1. In Railway project, click **+ New Service**
2. Select **GitHub Repo** → `vamsavriksham`
3. Railway detects the monorepo — set **Root Directory** to `/backend`
4. Click **Deploy**

**Set Environment Variables** (Settings → Variables):

```
DATABASE_URL          = (paste from PostgreSQL service — Railway auto-links it)
JWT_SECRET            = your-random-secret-string-min-32-chars
ANTHROPIC_API_KEY     = sk-ant-api03-...
CLOUDINARY_CLOUD_NAME = your-cloudinary-name
CLOUDINARY_API_KEY    = your-cloudinary-key
CLOUDINARY_API_SECRET = your-cloudinary-secret
FRONTEND_URL          = (leave blank for now — fill after Step 6)
```

> 💡 **Tip**: For DATABASE_URL, instead of pasting manually, click
> **+ Reference Variable** → select your PostgreSQL service → select `DATABASE_URL`.
> This auto-updates if the DB URL changes.

5. Go to **Settings** → **Networking** → click **Generate Domain**
6. Copy the backend URL: `https://vamsavriksham-backend.up.railway.app`

---

## STEP 6 — Deploy Frontend (Tier 1)

1. Click **+ New Service** → **GitHub Repo** → `vamsavriksham`
2. Set **Root Directory** to `/frontend`
3. **Set Environment Variable**:
   ```
   VITE_API_URL = https://vamsavriksham-backend.up.railway.app
   ```
4. Click **Deploy**
5. Go to **Settings** → **Networking** → **Generate Domain**
6. Copy frontend URL: `https://vamsavriksham.up.railway.app`

**Now go back to backend service** → Variables:
```
FRONTEND_URL = https://vamsavriksham.up.railway.app
```
Click **Save** (backend auto-redeploys with CORS fix).

---

## STEP 7 — Run Database Migrations

The `railway.toml` in `/backend` runs migrations automatically on deploy:
```
startCommand = "npm run db:migrate && npm start"
```

To run manually if needed:

```bash
# Login to Railway CLI
railway login

# Link to your project
railway link

# Run migration inside Railway
railway run --service backend npm run db:migrate
```

---

## STEP 8 — Verify Deployment

```bash
# Test backend health
curl https://vamsavriksham-backend.up.railway.app/health
# Should return: {"status":"ok","service":"vamsavriksham-api"}

# Test frontend
open https://vamsavriksham.up.railway.app
```

---

## STEP 9 — Set Up Cloudinary (Photo Uploads)

1. Go to https://cloudinary.com → free account
2. Dashboard → copy **Cloud Name**, **API Key**, **API Secret**
3. Add to Railway backend Variables (Step 5 above)

---

## FUTURE DEPLOYMENTS (after code changes)

```bash
# Make your changes, then:
git add .
git commit -m "feat: your change description"
git push origin main

# Railway auto-deploys both frontend and backend on every push! ✅
```

---

## ARCHITECTURE SUMMARY

```
GitHub (main branch)
        │
        ▼ auto-deploy on push
┌───────────────────────────────────────────────────┐
│                  Railway Project                   │
│                                                    │
│  ┌──────────────┐   ┌──────────────────────────┐  │
│  │  TIER 1      │   │  TIER 2                  │  │
│  │  Frontend    │──▶│  Backend API             │  │
│  │  React/Vite  │   │  Node.js + Express       │  │
│  │  /frontend   │   │  /backend                │  │
│  └──────────────┘   └──────────┬───────────────┘  │
│                                │                   │
│                     ┌──────────▼───────────────┐  │
│                     │  TIER 3                  │  │
│                     │  PostgreSQL Database     │  │
│                     │  Railway Plugin          │  │
│                     └──────────────────────────┘  │
└───────────────────────────────────────────────────┘
        │
        ▼ API calls (server-side, key is secure)
  Anthropic Claude API
  Cloudinary (photos)
```

---

## COSTS

| Service       | Free Tier                    |
|---------------|------------------------------|
| Railway       | $5/month credit (free tier)  |
| Cloudinary    | 25 GB storage free           |
| Anthropic     | Pay per API call             |
| GitHub        | Private repos free           |

---

## TROUBLESHOOTING

| Problem | Fix |
|---------|-----|
| Build fails | Check Node version ≥ 18 in `package.json` engines |
| CORS error | Confirm `FRONTEND_URL` matches your Railway domain exactly |
| DB connection error | Re-link `DATABASE_URL` via Reference Variable |
| Migration fails | Run `railway run npm run db:migrate` manually |
| Photos not uploading | Check all 3 Cloudinary env vars are set |
