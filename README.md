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

## Administrator account management

The Management center's **Users** tab uses Supabase Auth and `workspace_members`; it is not stored in browser-only user lists. From `apps/vehicle-parking-location-management`, link the Supabase project and deploy the protected Edge Function:

```sh
supabase link --project-ref <project-ref>
supabase functions deploy admin-users
```

Use the Supabase CLI with a scoped personal access token. The function verifies the caller's live session and Administrator membership before inviting users, changing roles, sending password-reset emails, or deleting accounts. Supabase supplies its server keys to the Edge Function; never add a service-role/secret key to the website, GitHub Pages variables, or this repository. Configure Supabase Auth email/SMTP delivery and allow the deployed app URL in **Authentication → URL Configuration** so invitation and password-reset links can return to the app.

The browser key is public by design; row-level security and membership policies protect the database. **Never add the Supabase service-role key or database password to GitHub variables, the frontend, or this repository.**

All authorized workspace members share and can edit the same app data. Database access is restricted to authenticated workspace members; the app's role-based controls are a user-interface layer, not granular database authorization. Do not use this for regulated or sensitive records until your organization's security requirements and access rules have been reviewed.

The fresh workspace starts empty. Existing data in browser storage is not automatically migrated. Photos stored as browser attachments are not included in cloud sync.

## Isolated demo workspace

Demo mode uses a **separate Supabase project**, so demo data and accounts are not connected to the live workspace. Create a second Supabase project for demos, then:

1. Run the same `apps/vehicle-parking-location-management/supabase/schema.sql` in that project's SQL Editor.
2. In demo-project **Authentication → URL Configuration**, allow `https://anooptl01a-svg.github.io/VPLM/**` as a redirect URL. Configure email/password authentication and email delivery for account setup.
3. In GitHub **Settings → Secrets and variables → Actions → Variables**, add `VITE_DEMO_SUPABASE_URL` and `VITE_DEMO_SUPABASE_ANON_KEY` using that demo project's Project URL and publishable key. These are public client settings; do not use a secret/service-role key.
4. Deploy the `admin-users` Edge Function to the **demo project** using the CLI instructions above. Link the CLI to the demo project's reference, not production.
5. Rerun **Publish website**. Open `https://anooptl01a-svg.github.io/VPLM/?demo=1`, create the demo sign-in account, then grant it Administrator membership in the demo project's SQL Editor:

   ```sql
   insert into public.workspace_members (user_id, role)
   select id, 'Administrator'
   from auth.users
   where lower(email) = lower('demo@example.com')
   on conflict (user_id) do update set role = excluded.role;
   ```

The demo route displays a **DEMO · ISOLATED** label and never falls back to production credentials. The account can use all Administrator features, but its shared demo workspace starts empty; add sample vehicles and records after signing in. Keep demo records fictional and avoid using real vehicle or customer data.

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
