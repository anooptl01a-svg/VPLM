import { useEffect, useState, type FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ParkingApp } from '@/components/parking-app';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { applyWorkspaceSnapshot, clearWorkspaceSnapshot } from '@/lib/workspace-storage';
import { loadWorkspace } from '@/lib/workspace-cloud';
import { isSupabaseConfigured, supabase, supabaseConfigurationError } from '@/lib/supabase';
import { queryClient } from '@/lib/query-client';

const workspaceLoadErrorMessage = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
    const code = error.code;
    if (code === 'PGRST205' || code === '42P01') {
      return 'The Supabase workspace tables are missing. Run the project schema.sql in your Supabase SQL Editor, then grant your account workspace membership.';
    }
    if (typeof error.message === 'string') return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Unable to load the shared workspace. Check the Supabase schema and account membership.';
};

function AuthScreen() {
  const client = supabase;
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client) return;
    setBusy(true);
    setMessage('');
    setErrorMessage('');
    try {
      if (isSignUp) {
        const { data, error } = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin + window.location.pathname },
        });
        if (error) throw error;
        if (!data.session) setMessage('Check your email to confirm the account, then sign in. Workspace access must be granted by an administrator.');
      } else {
        const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isSignUp ? 'Create account' : 'Sign in'}</CardTitle>
          <CardDescription>Sign in to the secure shared parking workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void submit(event)}>
            <div className="space-y-2">
              <Label htmlFor="auth-email">Email</Label>
              <Input id="auth-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-password">Password</Label>
              <Input id="auth-password" type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
            {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}
            {errorMessage && <p className="text-sm text-destructive" role="alert">{errorMessage}</p>}
            <Button className="w-full" disabled={busy} type="submit">{busy ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}</Button>
          </form>
          <Button className="mt-3 w-full" variant="ghost" onClick={() => { setIsSignUp((current) => !current); setMessage(''); setErrorMessage(''); }}>
            {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

export default function HomePage() {
  const client = supabase;
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [workspaceRevision, setWorkspaceRevision] = useState<number | null>(null);
  const [workspaceLoaded, setWorkspaceLoaded] = useState(false);
  const [workspaceUserId, setWorkspaceUserId] = useState<string>();
  const [workspaceError, setWorkspaceError] = useState('');

  useEffect(() => {
    if (!client) return;
    let active = true;
    const initializeSession = async () => {
      const { data, error } = await client.auth.getSession();
      if (!active) return;
      if (error) setWorkspaceError(error.message);
      setSession(data.session);
      setSessionLoaded(true);
    };
    void initializeSession();
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      queryClient.removeQueries({ queryKey: ['authenticated-user'] });
      setSession(nextSession);
      if (!nextSession) clearWorkspaceSnapshot();
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) {
      setWorkspaceLoaded(false);
      setWorkspaceRevision(null);
      setWorkspaceUserId(undefined);
      setWorkspaceError('');
      clearWorkspaceSnapshot();
      return;
    }
    let active = true;
    setWorkspaceLoaded(false);
    setWorkspaceError('');
    clearWorkspaceSnapshot();
    void loadWorkspace(session.user.id).then(({ snapshot, revision }) => {
      if (!active) return;
      if (snapshot) applyWorkspaceSnapshot(snapshot);
      setWorkspaceRevision(revision);
      setWorkspaceUserId(session.user.id);
      setWorkspaceLoaded(true);
    }).catch((error: unknown) => {
      if (!active) return;
      setWorkspaceError(workspaceLoadErrorMessage(error));
      setWorkspaceUserId(session.user.id);
      setWorkspaceLoaded(true);
    });
    return () => { active = false; };
  }, [session?.user.id]);

  if (!isSupabaseConfigured || !client) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Cloud storage is not configured</CardTitle>
            <CardDescription>This app will not fall back to local-only accounts or data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p role="alert">{supabaseConfigurationError}</p>
            <p>In GitHub Settings → Secrets and variables → Actions → Variables, set <code>VITE_SUPABASE_URL</code> to the exact Project URL and <code>VITE_SUPABASE_ANON_KEY</code> to the exact publishable key shown in Supabase Project Settings → API. Replace the whole value; do not enter the variable name or an example placeholder. Then rerun the “Publish website” workflow.</p>
            <p>The publishable key is intended for browser use; never use the Supabase service-role key or database password here.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (!sessionLoaded) return <main className="flex min-h-screen items-center justify-center">Connecting to authentication…</main>;
  if (!session) return <AuthScreen />;
  if (!workspaceLoaded || workspaceUserId !== session.user.id) return <main className="flex min-h-screen items-center justify-center">Loading secure workspace…</main>;
  if (workspaceError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Workspace access unavailable</CardTitle>
            <CardDescription role="alert">{workspaceError}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Setup instructions and the SQL schema are in the <a className="underline" href="https://github.com/anooptl01a-svg/VPLM#setup-secure-cloud-storage">repository README</a>.
            </p>
            <Button variant="outline" onClick={() => { void client.auth.signOut(); }}>Sign out</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <ParkingApp
      signedInUserId={session.user.email ?? 'Signed-in user'}
      initialCloudRevision={workspaceRevision}
      onExit={() => { void client.auth.signOut(); }}
    />
  );
}
