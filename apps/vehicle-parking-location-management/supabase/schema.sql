create table if not exists public.workspace_members (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('Administrator', 'Supervisor', 'TechnicalLeader', 'Operator', 'Drivers', 'Guest Users', 'Others')),
  created_at timestamptz not null default now()
);

alter table public.workspace_members
  drop constraint if exists workspace_members_role_check;
alter table public.workspace_members
  add constraint workspace_members_role_check
  check (role in ('Administrator', 'Supervisor', 'TechnicalLeader', 'Operator', 'Drivers', 'Guest Users', 'Others'));

create table if not exists public.workspace_state (
  id smallint primary key check (id = 1),
  state jsonb not null,
  revision bigint not null default 1 check (revision > 0),
  updated_at timestamptz not null default now()
);

alter table public.workspace_members enable row level security;
alter table public.workspace_state enable row level security;

drop policy if exists "Members can read their own membership" on public.workspace_members;
create policy "Members can read their own membership"
  on public.workspace_members for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "Workspace members can read shared state" on public.workspace_state;
create policy "Workspace members can read shared state"
  on public.workspace_state for select to authenticated
  using (exists (
    select 1 from public.workspace_members
    where user_id = (select auth.uid())
  ));

drop policy if exists "Workspace members can create shared state" on public.workspace_state;
create policy "Workspace members can create shared state"
  on public.workspace_state for insert to authenticated
  with check (exists (
    select 1 from public.workspace_members
    where user_id = (select auth.uid())
  ));

drop policy if exists "Workspace members can update shared state" on public.workspace_state;
create policy "Workspace members can update shared state"
  on public.workspace_state for update to authenticated
  using (exists (
    select 1 from public.workspace_members
    where user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.workspace_members
    where user_id = (select auth.uid())
  ));

revoke all on public.workspace_members from anon, authenticated;
grant select on public.workspace_members to authenticated;
revoke all on public.workspace_state from anon, authenticated;
grant select, insert, update on public.workspace_state to authenticated;
