-- =====================================================
-- TRIGGERS PARA CRIAÇÃO AUTOMÁTICA DE PROFILE E ORGANIZATION
-- =====================================================
-- 
-- Este arquivo cria triggers que automaticamente criam:
-- 1. Profile na tabela public.profiles quando um usuário é criado em auth.users
-- 2. Organization baseada nos metadados do usuário (role, document, organizationName)
-- 3. Membership vinculando o profile à organization com a role apropriada
--
-- Referência: https://supabase.com/docs/guides/auth/managing-user-data
-- =====================================================

-- =====================================================
-- FUNÇÃO: handle_new_user
-- Chamada quando um novo usuário é criado via auth.signUp
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_organization_id uuid;
  v_organization_name text;
  v_document text;
  v_role text;
BEGIN
  -- Extrair metadados do raw_user_meta_data
  v_role := NEW.raw_user_meta_data->>'role';
  v_document := NEW.raw_user_meta_data->>'document';
  v_organization_name := COALESCE(
    NEW.raw_user_meta_data->>'organizationName',
    NEW.raw_user_meta_data->>'fullName'
  );

  -- 1. Criar Profile vinculado ao auth.users.id
  INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'fullName',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Criar Organization se houver document e role
  IF v_document IS NOT NULL AND v_role IS NOT NULL THEN
    INSERT INTO public.organizations (
      name,
      document,
      created_at,
      updated_at
    )
    VALUES (
      v_organization_name,
      v_document,
      NOW(),
      NOW()
    )
    ON CONFLICT (document) DO NOTHING
    RETURNING id INTO v_organization_id;

    -- Se a organização já existia (conflict), buscar o ID
    IF v_organization_id IS NULL THEN
      SELECT id INTO v_organization_id
      FROM public.organizations
      WHERE document = v_document
      LIMIT 1;
    END IF;

    -- 3. Criar Membership vinculando profile à organization
    IF v_organization_id IS NOT NULL THEN
      INSERT INTO public.memberships (
        organization_id,
        profile_id,
        role,
        created_at
      )
      VALUES (
        v_organization_id,
        NEW.id,
        v_role::public.organization_role,
        NOW()
      )
      ON CONFLICT (organization_id, profile_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER: on_auth_user_created
-- Dispara a função handle_new_user quando auth.users insere novo registro
-- =====================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- PERMISSÕES RLS (Row Level Security)
-- Garantir que users possam ler apenas seus próprios dados
-- =====================================================

-- Enable RLS em profiles (se ainda não estiver habilitado)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users podem ler apenas seu próprio profile
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users podem atualizar apenas seu próprio profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Enable RLS em memberships
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- Policy: Users podem ler suas próprias memberships
CREATE POLICY "Users can read own memberships"
  ON public.memberships
  FOR SELECT
  USING (auth.uid() = profile_id);

-- Enable RLS em organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Policy: Users podem ler organizations onde são membros
CREATE POLICY "Users can read organizations they belong to"
  ON public.organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE memberships.organization_id = organizations.id
        AND memberships.profile_id = auth.uid()
    )
  );

-- Policy: OWNER e ADMIN podem atualizar suas organizations
CREATE POLICY "Owners and admins can update their organizations"
  ON public.organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE memberships.organization_id = organizations.id
        AND memberships.profile_id = auth.uid()
        AND memberships.role IN ('OWNER', 'ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.memberships
      WHERE memberships.organization_id = organizations.id
        AND memberships.profile_id = auth.uid()
        AND memberships.role IN ('OWNER', 'ADMIN')
    )
  );

-- =====================================================
-- COMENTÁRIOS
-- =====================================================
COMMENT ON FUNCTION public.handle_new_user() IS 
'Trigger function que cria automaticamente profile, organization e membership quando um novo usuário é registrado via Supabase Auth. Usa os dados de raw_user_meta_data para popular as tabelas.';

COMMENT ON TRIGGER on_auth_user_created ON auth.users IS
'Trigger que dispara handle_new_user() após INSERT em auth.users, garantindo que profile, organization e membership sejam criados automaticamente durante o registro.';
