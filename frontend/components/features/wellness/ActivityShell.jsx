'use client';

import { usePathname } from 'next/navigation';
import { Navbar, Footer } from '@/components/shared';
import { useAuthContext } from '@/context/AuthContext';
import { useModals } from '@/components/shared/GlobalModals';
import { ProtectedRoute } from '@/lib/routeProtection';

function ActivityFrame({ Activity }) {
  const pathname = usePathname();
  const { currentUser } = useAuthContext();
  const { setSettingsOpen, setUserMenuOpen } = useModals();
  return (
    <>
      <Navbar
        currentPage={pathname}
        variant="wellness"
        onSettingsClick={() => setSettingsOpen(true)}
        onUserMenuClick={() => setUserMenuOpen(true)}
      />
      <Activity key={currentUser.id} />
      <Footer />
    </>
  );
}

export function ActivityShell({ Activity }) {
  return (
    <ProtectedRoute>
      <ActivityFrame Activity={Activity} />
    </ProtectedRoute>
  );
}
