import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2.118.0';

const roles = ['Administrator', 'Supervisor', 'TechnicalLeader', 'Operator', 'Drivers', 'Guest Users', 'Others'] as const;
type Role = (typeof roles)[number];
type Database = {
  public: {
    Tables: {
      workspace_members: {
        Row: { user_id: string; role: Role; created_at: string };
        Insert: { user_id: string; role: Role; created_at?: string };
        Update: { user_id?: string; role?: Role; created_at?: string };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
type AdminClient = SupabaseClient<Database, 'public'>;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const respond = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isRole = (value: unknown): value is Role =>
  typeof value === 'string' && roles.some((role) => role === value);

const readKey = (jsonName: string, legacyName: string): string => {
  const raw = Deno.env.get(jsonName);
  if (raw) {
    const parsed: unknown = JSON.parse(raw);
    if (isRecord(parsed) && typeof parsed.default === 'string') return parsed.default;
    throw new Error(`The default key is missing from ${jsonName}.`);
  }
  const legacyKey = Deno.env.get(legacyName);
  if (legacyKey) return legacyKey;
  throw new Error(`Supabase key ${jsonName} is not configured.`);
};

const readRedirectUrl = (value: unknown): string => {
  if (typeof value !== 'string') throw new Error('A redirect URL is required.');
  const url = new URL(value);
  const isAppUrl = url.origin === 'https://anooptl01a-svg.github.io' && url.pathname.startsWith('/VPLM/');
  const isLocalUrl = ['http://localhost:5173', 'http://127.0.0.1:5173'].includes(url.origin);
  if (!isAppUrl && !isLocalUrl) throw new Error('The redirect URL is not an approved application address.');
  return url.toString();
};

const getAllUsers = async (admin: AdminClient): Promise<User[]> => {
  const users: User[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
};

const findUserByEmail = async (admin: AdminClient, email: string) => {
  const users = await getAllUsers(admin);
  return users.find((user) => user.email?.toLowerCase() === email) ?? null;
};

const getMembership = async (admin: AdminClient, userId: string) => {
  const { data, error } = await admin.from('workspace_members').select('user_id, role').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
};

const administratorCount = async (admin: AdminClient) => {
  const { count, error } = await admin.from('workspace_members').select('user_id', { count: 'exact', head: true }).eq('role', 'Administrator');
  if (error) throw error;
  return count ?? 0;
};

const userName = (user: User) => {
  const fullName = user.user_metadata?.full_name;
  const name = user.user_metadata?.name;
  if (typeof fullName === 'string' && fullName.trim()) return fullName.trim();
  if (typeof name === 'string' && name.trim()) return name.trim();
  return user.email?.split('@')[0] ?? 'Workspace user';
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return respond({ error: 'Method not allowed.' }, 405);

  try {
    const authorization = request.headers.get('Authorization') ?? '';
    const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!accessToken) return respond({ error: 'Authentication is required.' }, 401);

    const projectUrl = Deno.env.get('SUPABASE_URL');
    if (!projectUrl) throw new Error('SUPABASE_URL is not configured.');
    const publishableKey = readKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');
    const secretKey = readKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');
    const clientOptions = { auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false } };
    const publicClient = createClient<Database>(projectUrl, publishableKey, clientOptions);
    const adminClient = createClient<Database>(projectUrl, secretKey, clientOptions);
    const { data: authData, error: authError } = await publicClient.auth.getUser(accessToken);
    if (authError || !authData.user) return respond({ error: 'Your session is invalid or expired.' }, 401);

    const callerMembership = await getMembership(adminClient, authData.user.id);
    if (callerMembership?.role !== 'Administrator') return respond({ error: 'Administrator access is required.' }, 403);

    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return respond({ error: 'The request body must be valid JSON.' }, 400);
    }
    if (!isRecord(input) || typeof input.action !== 'string') return respond({ error: 'A valid action is required.' }, 400);

    if (input.action === 'list') {
      const [{ data: memberships, error: membershipError }, allUsers] = await Promise.all([
        adminClient.from('workspace_members').select('user_id, role'),
        getAllUsers(adminClient),
      ]);
      if (membershipError) throw membershipError;
      const rolesByUserId = new Map((memberships ?? []).map((membership) => [membership.user_id, membership.role]));
      const users = allUsers.flatMap((user) => {
        const role = rolesByUserId.get(user.id);
        if (!isRole(role)) return [];
        return [{ id: user.id, name: userName(user), email: user.email ?? '', role }];
      });
      return respond({ users });
    }

    if (input.action === 'invite') {
      const name = typeof input.name === 'string' ? input.name.trim() : '';
      const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
      const role = input.role;
      if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !isRole(role)) {
        return respond({ error: 'Enter a valid name, email address, and role.' }, 400);
      }
      let redirectTo: string;
      try {
        redirectTo = readRedirectUrl(input.redirectTo);
      } catch (error) {
        return respond({ error: error instanceof Error ? error.message : 'Invalid redirect URL.' }, 400);
      }

      const existingUser = await findUserByEmail(adminClient, email);
      let userId: string;
      let invited = false;
      if (existingUser) {
        if (await getMembership(adminClient, existingUser.id)) return respond({ error: 'This user is already a workspace member.' }, 409);
        const { error } = await adminClient.auth.admin.updateUserById(existingUser.id, {
          user_metadata: { ...existingUser.user_metadata, full_name: name },
        });
        if (error) throw error;
        userId = existingUser.id;
      } else {
        const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
          data: { full_name: name },
          redirectTo,
        });
        if (error) throw error;
        if (!data.user) throw new Error('Supabase did not return the invited user account.');
        userId = data.user.id;
        invited = true;
      }

      const { error: membershipError } = await adminClient.from('workspace_members').upsert(
        { user_id: userId, role },
        { onConflict: 'user_id' },
      );
      if (membershipError) {
        if (invited) {
          const { error: cleanupError } = await adminClient.auth.admin.deleteUser(userId);
          if (cleanupError) throw new Error(`Workspace access could not be created and the invited account could not be removed: ${cleanupError.message}`);
        }
        throw membershipError;
      }
      return respond({ invited });
    }

    if (input.action === 'update-role') {
      const userId = typeof input.userId === 'string' ? input.userId : '';
      const role = input.role;
      if (!userId || !isRole(role)) return respond({ error: 'A valid user and role are required.' }, 400);
      const membership = await getMembership(adminClient, userId);
      if (!membership) return respond({ error: 'Workspace user not found.' }, 404);
      if (membership.role === 'Administrator' && role !== 'Administrator' && await administratorCount(adminClient) <= 1) {
        return respond({ error: 'The last administrator cannot be demoted.' }, 409);
      }
      const { error } = await adminClient.from('workspace_members').update({ role }).eq('user_id', userId);
      if (error) throw error;
      return respond({ ok: true });
    }

    if (input.action === 'remove') {
      const userId = typeof input.userId === 'string' ? input.userId : '';
      if (!userId) return respond({ error: 'A valid user is required.' }, 400);
      if (userId === authData.user.id) return respond({ error: 'You cannot remove your own administrator account.' }, 400);
      const membership = await getMembership(adminClient, userId);
      if (!membership) return respond({ error: 'Workspace user not found.' }, 404);
      if (membership.role === 'Administrator' && await administratorCount(adminClient) <= 1) {
        return respond({ error: 'The last administrator cannot be removed.' }, 409);
      }
      const { error: sessionError } = await adminClient.auth.admin.signOut(userId, 'global');
      if (sessionError) throw sessionError;
      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) throw error;
      return respond({ ok: true });
    }

    if (input.action === 'reset-password') {
      const userId = typeof input.userId === 'string' ? input.userId : '';
      if (!userId) return respond({ error: 'A valid user is required.' }, 400);
      const membership = await getMembership(adminClient, userId);
      if (!membership) return respond({ error: 'Workspace user not found.' }, 404);
      let redirectTo: string;
      try {
        redirectTo = readRedirectUrl(input.redirectTo);
      } catch (error) {
        return respond({ error: error instanceof Error ? error.message : 'Invalid redirect URL.' }, 400);
      }
      const { data, error: userError } = await adminClient.auth.admin.getUserById(userId);
      if (userError) throw userError;
      if (!data.user?.email) return respond({ error: 'This account does not have a resettable email address.' }, 400);
      const { error } = await publicClient.auth.resetPasswordForEmail(data.user.email, { redirectTo });
      if (error) throw error;
      return respond({ ok: true });
    }

    return respond({ error: 'Unsupported user-management action.' }, 400);
  } catch (error) {
    console.error('admin-users request failed:', error);
    return respond({ error: error instanceof Error ? error.message : 'User-management request failed.' }, 500);
  }
});
