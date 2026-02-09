-- =====================================================
-- ROLLBACK: Remover triggers de criação automática
-- =====================================================
-- Este arquivo reverte as mudanças feitas em 20240209_create_auth_triggers.sql
-- Use apenas se precisar desfazer a migration
-- =====================================================

-- Remover políticas RLS
DROP POLICY IF EXISTS "Owners and admins can update their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Users can read organizations they belong to" ON public.organizations;
DROP POLICY IF EXISTS "Users can read own memberships" ON public.memberships;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

-- Desabilitar RLS (opcional - comente se quiser manter RLS habilitado)
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Remover trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Remover função
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Mensagem de confirmação
DO $$
BEGIN
  RAISE NOTICE 'Rollback completo: triggers e políticas RLS removidos.';
  RAISE NOTICE 'ATENÇÃO: Novos usuários NÃO terão profiles criados automaticamente!';
END $$;
