'use client';

import { useOrganization } from '@/contexts/organization-context';
import { AppCard } from '@/components/ui/card';
import { AppChip } from '@/components/ui/chip';

/**
 * Dashboard Home Page
 * Demonstrates usage of OrganizationContext
 */
export default function DashboardPage() {
  const { currentOrganization, membership, availableOrganizations, isLoading } = useOrganization();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!currentOrganization) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Nenhuma organização selecionada</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Bem-vindo ao sistema de gerenciamento de importações
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Organization Card */}
        <AppCard title="Organização Atual">
          <div className="space-y-4">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Nome:</span>
              <p className="text-lg font-medium">{currentOrganization.name}</p>
            </div>
            
            {currentOrganization.tradeName && (
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Nome Fantasia:</span>
                <p className="text-lg">{currentOrganization.tradeName}</p>
              </div>
            )}
            
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">CNPJ:</span>
              <p className="text-lg font-mono">{currentOrganization.document}</p>
            </div>
            
            {currentOrganization.email && (
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Email:</span>
                <p className="text-lg">{currentOrganization.email}</p>
              </div>
            )}
            
            {membership && (
              <div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Seu Cargo:</span>
                <div className="mt-2">
                  <AppChip>
                    {membership.role}
                  </AppChip>
                </div>
              </div>
            )}
          </div>
        </AppCard>

        {/* Available Organizations Card */}
        <AppCard title="Suas Organizações">
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Você tem acesso a {availableOrganizations.length} organização(ões)
            </p>
            
            {availableOrganizations.map(({ organization, role }) => (
              <div
                key={organization.id}
                className={`p-3 rounded-lg border ${
                  organization.id === currentOrganization.id
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{organization.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {organization.document}
                    </p>
                  </div>
                  <AppChip size="sm">
                    {role}
                  </AppChip>
                </div>
              </div>
            ))}
          </div>
        </AppCard>
      </div>

      {/* Quick Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <AppCard>
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">0</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Embarques Ativos</p>
          </div>
        </AppCard>
        
        <AppCard>
          <div className="text-center">
            <p className="text-3xl font-bold text-success">0</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Cotações Pendentes</p>
          </div>
        </AppCard>
        
        <AppCard>
          <div className="text-center">
            <p className="text-3xl font-bold text-warning">0</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Produtos Cadastrados</p>
          </div>
        </AppCard>
        
        <AppCard>
          <div className="text-center">
            <p className="text-3xl font-bold text-secondary">0</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Fornecedores</p>
          </div>
        </AppCard>
      </div>
    </div>
  );
}
