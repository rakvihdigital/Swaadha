'use client';
import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Member } from '@/lib/admin';
import type { AdminData } from './use-admin-data';

/** Sub-admins and which pages they can open. Owner only. */
export function useTeam({ run }: AdminData) {
  const [memberEdit, setMemberEdit] = useState<Member | null>(null);

  function saveMember(e: FormEvent) {
    e.preventDefault();
    if (!memberEdit) return;
    run(async () => {
      const r = await supabase!.rpc('save_staff', {
        p_email: memberEdit.email,
        p_name: memberEdit.name,
        p_permissions: memberEdit.permissions,
      });
      if (r.error) throw r.error;
      setMemberEdit(null);
    }, 'Sub-admin access saved.');
  }

  function revokeMember(m: Member) {
    run(async () => {
      const r = await supabase!.rpc('revoke_staff', { p_id: m.user_id });
      if (r.error) throw r.error;
    }, 'Sub-admin access removed.');
  }

  return { memberEdit, setMemberEdit, saveMember, revokeMember };
}
