-- =====================================================
-- SCRIPT DE TESTE: Verificar Triggers de Auth
-- =====================================================
-- Use este script para verificar se os triggers estão funcionando corretamente
-- =====================================================

-- 1. Verificar se trigger existe
SELECT 
  tgname as trigger_name,
  tgenabled as is_enabled,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

-- Resultado esperado: 1 linha com trigger_name = 'on_auth_user_created' e is_enabled = 'O' (enabled)

-- 2. Verificar se função existe
SELECT 
  proname as function_name,
  pg_get_functiondef(oid) as definition_preview
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Resultado esperado: 1 linha com function_name = 'handle_new_user'

-- 3. Verificar políticas RLS em profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;

-- Resultado esperado: 2 políticas (read own profile, update own profile)

-- 4. Verificar políticas RLS em organizations
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'organizations'
ORDER BY policyname;

-- Resultado esperado: 2 políticas (read, update)

-- 5. Verificar políticas RLS em memberships
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'memberships'
ORDER BY policyname;

-- Resultado esperado: 1 política (read own memberships)

-- 6. Verificar RLS está habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('profiles', 'organizations', 'memberships')
ORDER BY tablename;

-- Resultado esperado: Todas as 3 tabelas com rls_enabled = true

-- 7. Contar registros existentes (antes de criar novo usuário)
SELECT 
  'profiles' as table_name,
  COUNT(*) as total_records
FROM public.profiles
UNION ALL
SELECT 
  'organizations',
  COUNT(*)
FROM public.organizations
UNION ALL
SELECT 
  'memberships',
  COUNT(*)
FROM public.memberships;

-- Anote os valores para comparar após criar um novo usuário

-- =====================================================
-- PRÓXIMO PASSO: Criar um usuário de teste via aplicação
-- =====================================================
-- Após criar um novo usuário via aplicação (registro), execute:

-- 8. Verificar se profile foi criado para o último usuário
SELECT 
  p.id,
  p.email,
  p.full_name,
  p.created_at,
  u.email as auth_email,
  u.raw_user_meta_data->>'role' as user_role
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC
LIMIT 5;

-- 9. Verificar se organization foi criada
SELECT 
  o.id,
  o.name,
  o.document,
  o.created_at,
  COUNT(m.profile_id) as members_count
FROM public.organizations o
LEFT JOIN public.memberships m ON o.id = m.organization_id
GROUP BY o.id
ORDER BY o.created_at DESC
LIMIT 5;

-- 10. Verificar se membership foi criada
SELECT 
  m.organization_id,
  m.profile_id,
  m.role,
  m.created_at,
  o.name as organization_name,
  p.email as profile_email
FROM public.memberships m
JOIN public.organizations o ON m.organization_id = o.id
JOIN public.profiles p ON m.profile_id = p.id
ORDER BY m.created_at DESC
LIMIT 5;

-- 11. Verificar se todos os componentes estão vinculados corretamente
SELECT 
  u.email as user_email,
  u.raw_user_meta_data->>'role' as metadata_role,
  p.full_name as profile_name,
  o.name as organization_name,
  o.document as organization_document,
  m.role as membership_role,
  p.created_at as profile_created,
  o.created_at as org_created,
  m.created_at as membership_created
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.memberships m ON p.id = m.profile_id
LEFT JOIN public.organizations o ON m.organization_id = o.id
ORDER BY u.created_at DESC
LIMIT 5;

-- =====================================================
-- RESULTADO ESPERADO:
-- =====================================================
-- Para cada novo usuário registrado, você deve ver:
-- - 1 registro em auth.users (criado pelo Supabase Auth)
-- - 1 registro em public.profiles (criado pelo trigger)
-- - 1 registro em public.organizations (criado pelo trigger, se houver metadata de document)
-- - 1 registro em public.memberships (criado pelo trigger, vinculando profile à org)
--
-- Todos com timestamps similares (diferença de milissegundos)
-- =====================================================
