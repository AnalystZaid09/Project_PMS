# 100% Free Online Deployment Guide — Apex Health PMS

This guide explains how to deploy the **Apex Health Diagnostics Patient Management System (PMS)** online **100% free of charge**, so your client can test the software from any phone, laptop, or computer simply by clicking a URL.

---

## ⚡ Deployment Summary (5 Minutes, $0 Cost)

| Service | Hosting Platform | Cost | Why We Use It |
|---|---|---|---|
| **Frontend Web App** | **Vercel** | **Free Forever** | Instant global CDN, zero cold-starts, automatic SSL HTTPS, connects to your GitHub repository in 1 click. |
| **Backend REST API** | **Render.com** | **Free Forever** | Free Python web service, automatic SSL HTTPS, supports FastAPI and SQLite / PostgreSQL. |
| **Database** | **SQLite (included) or Neon.tech** | **Free Forever** | SQLite requires zero setup; Neon provides free serverless PostgreSQL. |

---

## 🚀 Step 1: Deploy Backend API on Render.com (Free)

1. Go to [https://render.com](https://render.com) and click **Sign Up** (or Sign In with your GitHub account `AnalystZaid09`).
2. In your Render Dashboard, click the blue **New +** button in the top right and select **Web Service**.
3. Choose **Build and deploy from a Git repository** -> Click **Next**.
4. Connect your repository: `AnalystZaid09/Project_PMS`.
5. Configure the web service with these exact settings:
   - **Name:** `apex-pms-backend` (or any name you choose)
   - **Region:** Choose closest to your client (e.g., *Singapore*, *Frankfurt*, or *Ohio*)
   - **Branch:** `main` (or `master`)
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:**
     ```bash
     pip install --upgrade pip && pip install -e .
     ```
   - **Start Command:**
     ```bash
     uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
   - **Instance Type:** Select **Free** ($0 / month).
6. Under **Environment Variables**, add:
   - `ENVIRONMENT` = `production`
   - `DATABASE_URL` = `sqlite:///./pms.db`
   - `SECRET_KEY` = `apex_pms_production_super_secret_key_change_me_32chars`
7. Click **Create Web Service**.
8. Render will build and deploy your backend in ~2 minutes.
9. Once deployed, Render will display your live backend URL at the top:
   - Example: `https://apex-pms-backend.onrender.com`
   - Test it by opening: `https://apex-pms-backend.onrender.com/docs` (You will see the Swagger API documentation).
   - **Copy this backend URL!** You will need it in Step 2.

> **Note on Free Render Tier:** When inactive for 15 minutes, Render puts free web services to sleep. The first request takes ~30-40 seconds to spin up, after which it runs smoothly.

---

## 🌐 Step 2: Deploy Frontend on Vercel (Free)

1. Go to [https://vercel.com](https://vercel.com) and click **Sign Up** (or Log In with GitHub `AnalystZaid09`).
2. On your Vercel Dashboard, click **Add New...** -> **Project**.
3. Under **Import Git Repository**, find `Project_PMS` and click **Import**.
4. Configure the project:
   - **Project Name:** `apex-pms` (or any name you choose)
   - **Framework Preset:** `Vite` (Vercel detects this automatically)
   - **Root Directory:** Click **Edit** -> Select `frontend` -> Click **Continue**.
5. Expand **Environment Variables** and add:
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** Your Render backend URL from Step 1 with `/api/v1` appended:
     ```
     https://apex-pms-backend.onrender.com/api/v1
     ```
     *(Replace `apex-pms-backend.onrender.com` with your actual Render URL).*
6. Click **Deploy**.
7. In ~40 seconds, Vercel will finish building and provide your live frontend URL:
   - Example: `https://apex-pms.vercel.app`
8. Click on the URL to open your live application!

---

## 🔑 Step 3: Share with Your Client for Testing

Send this simple message to your client:

```text
Dear Client,

Your Patient Management System (PMS) is live online for testing:
🔗 Web Application: https://apex-pms.vercel.app

Default Login Credentials:
- Username: superadmin
- Password: Admin@123

You can test:
1. Setting up clinic branches, doctors, and medical tests.
2. Creating staff accounts (e.g. Receptionist).
3. Booking patients, collecting payments, and printing signed diagnostic reports.

Please refer to the attached 'PMS_Admin_Employee_End_to_End_Testing_Guide.docx' for a complete click-by-click walkthrough.
```

---

## 💡 Alternative: All-in-One Render Blueprint Deployment

If you prefer to deploy both Frontend and Backend on Render using one single click:

1. Log in to [https://render.com](https://render.com).
2. Click **New +** -> Select **Blueprint**.
3. Select your repository `AnalystZaid09/Project_PMS`.
4. Render will automatically detect the `render.yaml` file in the repository.
5. Click **Apply**.
6. Render will automatically create and connect both the Backend and Frontend services for free!
