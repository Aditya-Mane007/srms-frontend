# SRMS frontend

Vite + React + TypeScript SPA with shadcn/ui + Tailwind. Plan: `docs/frontend-plan.md` in the backend repo.

```bash
npm install
npm run dev        # http://localhost:5173, proxies /api to the backend on :3000
npm test
npm run build
```

- `VITE_API_URL` sets the API base (default `/api`, the dev proxy).
- API types: copy the backend's `GET /openapi.json` to `openapi.json`, then `npm run api:types`.
