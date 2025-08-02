-- Função para promover usuário a administrador
CREATE OR REPLACE FUNCTION public.promote_to_admin(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id uuid;
BEGIN
    -- Buscar o user_id pelo email na tabela auth.users
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = user_email;
    
    -- Se usuário não encontrado, gerar erro
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário com email % não encontrado', user_email;
    END IF;
    
    -- Atualizar o role do usuário para admin na tabela profiles
    UPDATE public.profiles
    SET role = 'admin'
    WHERE user_id = target_user_id;
    
    -- Se não existe profile, criar um
    IF NOT FOUND THEN
        INSERT INTO public.profiles (user_id, role, display_name)
        VALUES (target_user_id, 'admin', split_part(user_email, '@', 1));
    END IF;
END;
$$;

-- Função para criar conta admin (será usada após o usuário ser criado manualmente)
CREATE OR REPLACE FUNCTION public.setup_admin_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Promover admin@ivofernandesnews.com.br para administrador
    PERFORM public.promote_to_admin('admin@ivofernandesnews.com.br');
    
    RAISE NOTICE 'Conta admin@ivofernandesnews.com.br promovida para administrador (se existir)';
END;
$$;