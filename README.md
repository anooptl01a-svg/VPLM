# Vehicle Parking Location Management

A responsive web app for vehicle assignments, parking bays, reservations, movements, and road tests. The hosted app uses Supabase Authentication and a shared, row-level-secured workspace.

## Set up secure cloud storage

1. Create a Supabase project. In **Project Settings → API**, copy the project URL and the **publishable** key (the legacy anon key is also supported).
2. In the Supabase **SQL Editor**, run [`apps/vehicle-parking-location-management/supabase/schema.sql`](apps/vehicle-parking-location-management/supabase/schema.sql).
3. Configure **Authentication → URL Configuration**:
   - Site URL: `https://anooptl01a-svg.github.io/VPLM/`
   - Add that URL to the redirect allow list.
   Enable email/password sign-in and choose whether email confirmation is required.
4. Create your first account at the app URL. In the SQL Editor, grant that account administrator membership, replacing the email:

   ```sql
   insert into public.workspace_members (user_id, role)
   select id, 'Administrator'
   from auth.users
   where lower(email) = lower('you@example.com')
   on conflict (user_id) do update set role = excluded.role;
   ```

   Grant each teammate access similarly, using the `Operator`, `TechnicalLeader`, or `Supervisor` role. Accounts without a membership cannot read or change workspace data.
5. In GitHub **Settings → Secrets and variables → Actions → Variables**, add:
   - `VITE_SUPABASE_URL` — the project URL.
   - `VITE_SUPABASE_ANON_KEY` — the Supabase publishable/anon key.
6. Rerun **Actions → Publish website → Run workflow**. The app will show a configuration notice until it is rebuilt with both variables.

The browser key is public by design; row-level security and membership policies protect the database. **Never add the Supabase service-role key or database password to GitHub variables, the frontend, or this repository.**

All authorized workspace members share and can edit the same app data. Database access is restricted to authenticated workspace members; the app's role-based controls are a user-interface layer, not granular database authorization. Do not use this for regulated or sensitive records until your organization's security requirements and access rules have been reviewed.

The fresh workspace starts empty. Existing data in browser storage is not automatically migrated. Photos stored as browser attachments are not included in cloud sync.

## Run locally

```sh
cd apps/vehicle-parking-location-management
npm ci
cp .env.example .env.local
# Set the two Supabase values in .env.local, then:
npm run dev
```

## Publish

The `Publish website` workflow builds and deploys to [https://anooptl01a-svg.github.io/VPLM/](https://anooptl01a-svg.github.io/VPLM/). GitHub Pages should use **GitHub Actions** as the deployment source.
