import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars are required');
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

const TEMP_PASSWORD = 'MudarSenha123!';

export async function createAuthUser(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  email: string,
  fullName?: string | null,
): Promise<string | null> {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: TEMP_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName || '' },
  });

  if (error) {
    if (error.message?.includes('already been registered') || error.status === 422) {
      let page = 1;
      while (page <= 20) {
        const { data: listData } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
        const existing = listData?.users?.find(u => u.email === email);
        if (existing) return existing.id;
        if (!listData?.users?.length || listData.users.length < 1000) break;
        page++;
      }
      return null;
    }
    console.error(`  [WARN] Failed to create auth user for ${email}: ${error.message}`);
    return null;
  }

  return data.user.id;
}
