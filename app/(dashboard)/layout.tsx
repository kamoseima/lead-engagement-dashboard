import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Sidebar } from '@/components/dashboard/sidebar';
import type { DashboardUser } from '@/types/database';
import { Suspense } from 'react';

async function DashboardShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/auth/login');
  }

  // Use admin client to bypass RLS for the dashboard_users lookup.
  // The user is already authenticated above via getUser().
  const admin = createAdminClient();
  const { data: user, error: dbError } = await admin
    .from('dashboard_users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  if (!user) {
    redirect('/auth/login');
  }

  const dashboardUser = user as DashboardUser;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        userRole={dashboardUser.role}
        userEmail={dashboardUser.email}
        displayName={dashboardUser.display_name}
      />
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="mx-auto max-w-7xl px-6 py-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-background">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}
