'use client';

import { useAuth } from '@/lib/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const PUBLIC_ROUTES = ['/', '/login', '/signup'];

const BLOCKED_ROUTES = ['/admin/grades', '/admin/attendance'];

const ROLE_ROUTES: Record<string, string[]> = {
  admin: ['/admin'],
  teacher: ['/teacher'],
  student: ['/my-courses', '/my-grades'],
};

function getRequiredRole(pathname: string): string | null {
  for (const [role, prefixes] of Object.entries(ROLE_ROUTES)) {
    if (prefixes.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'))) {
      return role;
    }
  }
  return null;
}

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublic = PUBLIC_ROUTES.includes(pathname);
  const isBlocked = BLOCKED_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/'));
  const requiredRole = getRequiredRole(pathname);

  useEffect(() => {
    if (loading) return;

    if (!user && !isPublic) {
      router.replace('/login');
      return;
    }

    if (user && isBlocked) {
      router.replace('/dashboard');
      return;
    }

    if (user && requiredRole && user.role !== requiredRole) {
      router.replace('/dashboard');
      return;
    }
  }, [loading, user, isPublic, isBlocked, requiredRole, pathname, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-white" />
      </div>
    );
  }

  if (!user && !isPublic) {
    return null;
  }

  if (user && isBlocked) {
    return null;
  }

  if (user && requiredRole && user.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
}
