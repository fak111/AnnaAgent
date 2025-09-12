AnnaAgent Next.js (Pages Router)

- Dev: npm run dev
- Build: npm run build
- Start: npm run start

Environment variables (copy .env.example to .env.local):
- DEEPSEEK_API_KEY
- DEEPSEEK_BASE_URL (default: https://api.deepseek.com/v1)
- DEEPSEEK_MODEL (default: deepseek-chat)
- DEEPSEEK_TIMEOUT_MS (default: 30000)
- MERGED_DATA_PATH (default: ref/merged_data.json)

Notes
- Data is read server-side from `MERGED_DATA_PATH`. For safety, the file is not exposed from public/.
- Sessions are in-memory for development; for Vercel multi-instance, use external store (Redis/DB).

