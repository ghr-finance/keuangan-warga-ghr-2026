Preparation for commit, push, and Netlify deployment

1) Clean working tree (already removed temporary debug files).

2) Commit changes locally:

   git add -A
   git commit -m "chore: remove debug scripts; bump version to 0.1.0"
   git push origin main

3) Netlify (frontend) deployment notes:

   - The repository already has `netlify.toml` configured to run `npm run build` and publish `dist`.
   - Netlify will proxy `/api/*` to the backend at `https://ghr-flow.onrender.com/api/:splat`. Update that URL in `netlify.toml` if your backend URL differs.
   - Ensure Netlify Site has the following build settings:
       Build command: `npm run build`
       Publish directory: `dist`
   - Environment variables: none required for the frontend. The backend must expose the API; Netlify proxies to it.

4) Backend deployment reminder:

   - The server uses PostgreSQL (Neon) and runs under `server.ts`.
   - If backend is deployed (e.g., Render/Heroku), set `DATABASE_URL` in the backend service environment variables. Do NOT store DB credentials in Netlify frontend.

5) Quick verification after push:

   - On Netlify, trigger a deploy or wait for auto-deploy from `main` branch.
   - Verify the `/api/health` endpoint returns `{status: "ok", database: "connected"}` on your backend.

If you want, I can run the local git commands, create the commit, and push (I will need permission to run git here). Alternatively I can produce the exact commands you should run.