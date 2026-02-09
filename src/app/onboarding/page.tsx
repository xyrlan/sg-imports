import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/**
 * Onboarding Page - Placeholder
 * 
 * TODO: Implement organization creation flow
 * For users who don't have any organizations yet
 */
export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-2xl w-full p-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-center mb-4">Bem-vindo ao SG-Imports!</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Parece que você ainda não faz parte de nenhuma organização.
        </p>
        
        <div className="space-y-6">
          <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Criar Nova Organização</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Cadastre sua empresa e comece a gerenciar importações
            </p>
            <p className="text-xs text-gray-500">
              TODO: Formulário de criação de organização
            </p>
          </div>
          
          <div className="p-6 bg-gray-50 dark:bg-gray-700/20 rounded-lg">
            <h2 className="text-xl font-semibold mb-2">Aguardar Convite</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Se você foi convidado para uma organização, aguarde a aprovação do administrador
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
