import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Login Page - Placeholder
 * 
 * TODO: Implement Supabase Auth UI
 * For now, redirects authenticated users to dashboard
 */
export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-6">SG-Imports</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Sistema de Gerenciamento de Importações
        </p>
        
        <div className="space-y-4">
          <p className="text-sm text-center text-gray-500">
            Página de login em desenvolvimento
          </p>
          <p className="text-xs text-center text-gray-400">
            TODO: Integrar com Supabase Auth
          </p>
        </div>
      </div>
    </div>
  );
}
