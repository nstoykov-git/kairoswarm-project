# 🌍 Deployment Preferences for Kairoswarm

## ✅ Primary Region
**Iowa (US Central, GCP)**
- Closest to Chicago (deployment base)
- Optimal latency and bandwidth from Midwest U.S.
- Preferred for all public-facing Modal endpoints and Redis deployments

## 💾 Redis Provider
**Upstash Redis**
- Region: `us-central1` (Iowa)
- Used for: participants, conversation tape, credit balances (future)
- Linked as Modal secret: `upstash-redis-url`

## 🧠 Notes
- Modal’s FastAPI endpoints run serverlessly but require `fastapi[standard]`
- Use `Image.debian_slim().pip_install(...)` to manage all Modal dependencies
- Deployment path: `kairoswarm-project/modal_api/app.py`

## 🌐 Modal Web Endpoints (Deployed)
- `/join`: https://nstoykov-git--kairoswarm-serverless-api-join.modal.run
- `/speak`: https://nstoykov-git--kairoswarm-serverless-api-speak.modal.run
- `/tape`: https://nstoykov-git--kairoswarm-serverless-api-tape.modal.run

---

Let this serve as your infrastructure north star for continued scaling.
You’re now region-aware, latency-optimized, and serverlessly grounded.

