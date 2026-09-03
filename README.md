# Doom_it (Vakya-Bhed 2026 - LLM CTF Competition Platform)

A full-stack LLM Capture-The-Flag (CTF) platform built for competitive prompt injection, jailbreaking, and defense challenges.

## Tech Stack
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, React Router DOM
- **Backend**: FastAPI, Uvicorn, SQLAlchemy, Pydantic v2, Python-Jose, Bcrypt
- **Database**: PostgreSQL (Supabase with connection pooling) or SQLite for local dev
- **LLM Engine**: Multi-key Google Gemini (`gemini-3.1-flash-lite`) pool with zero-delay failover, NVIDIA Nemotron / OpenRouter fallback, and local Ollama Llama 3 cluster support

---

## Deployment Architecture

### 1. Backend (FastAPI on Render.com)
1. In [Render Dashboard](https://dashboard.render.com), create a **New Web Service**.
2. Connect your GitHub repository `Doom_it`.
3. Set configuration:
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
4. Add the required Environment Variables from `backend/.env.example`:
   - `DATABASE_URL` (Supabase connection string with pooling)
   - `SUPABASE_URL` and `SUPABASE_KEY`
   - `SECRET_KEY` (Strong random key)
   - `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, `GEMINI_API_KEY_3`
   - `DEV_MODE=False`
   - `CORS_ORIGINS=*` (or your Vercel URL)

### 2. Frontend (React + Vite on Vercel)
1. In [Vercel Dashboard](https://vercel.com/new), import your `Doom_it` repository.
2. Set **Root Directory** to `frontend`.
3. Framework Preset: **Vite**.
4. Add Environment Variable:
   - `VITE_API_BASE_URL`: `https://your-render-backend-url.onrender.com`
5. Click **Deploy**.

---

## Local Development

### 1. Backend Setup
```bash
# Activate virtual environment
.\.venv\Scripts\activate

# Run FastAPI server
uvicorn backend.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. All-in-One Local Host with Cloudflare Tunnel
Double click or run `start_laptop_host.bat` (or `start_laptop_host.ps1`) to run FastAPI, Vite, and an instant public HTTPS tunnel.

