'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { LogOut } from 'lucide-react';

type LogoutButtonProps = {
  variant?: 'ghost' | 'outline';
  redirectTo?: string;
};

export function LogoutButton({
  variant = 'ghost',
  redirectTo = '/login',
}: LogoutButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleClick = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    startTransition(() => {
      router.replace(redirectTo);
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={`tmcpa-btn ${variant === 'outline' ? 'tmcpa-btn-outline' : 'tmcpa-btn-ghost'}`}
      title="Sign out"
    >
      <LogOut size={14} />
      {variant === 'outline' && <span>Sign out</span>}
    </button>
  );
}
