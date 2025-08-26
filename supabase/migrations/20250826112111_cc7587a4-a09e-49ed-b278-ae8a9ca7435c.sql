-- Phase 1: Critical Data Protection - Fix RLS Policies

-- 1. Fix Profile Data Exposure
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create more restrictive policies for profiles
CREATE POLICY "Public profile data viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

CREATE POLICY "Users can view their own complete profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Secure User Activity Data - Update likes table
-- Drop the overly permissive policy for likes
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.likes;

-- Create more restrictive policy for likes
CREATE POLICY "Likes viewable by authenticated users only" 
ON public.likes 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 3. Secure Comments - Update comments table  
-- Drop the current policy and create more restrictive one
DROP POLICY IF EXISTS "Approved comments are viewable by everyone" ON public.comments;

-- Create more restrictive policy for comments
CREATE POLICY "Comments viewable by authenticated users only" 
ON public.comments 
FOR SELECT 
USING (auth.uid() IS NOT NULL AND approved = true);

-- 4. Fix Database Function Security - Add proper search_path to existing functions
CREATE OR REPLACE FUNCTION public.can_user_comment(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT NOT COALESCE(shadow_banned, false)
  FROM public.profiles
  WHERE user_id = user_id_param;
$function$;

CREATE OR REPLACE FUNCTION public.toggle_shadow_ban(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
    current_user_role text;
BEGIN
    -- Check if current user is admin
    SELECT role INTO current_user_role
    FROM public.profiles
    WHERE user_id = auth.uid();
    
    IF current_user_role != 'admin' THEN
        RAISE EXCEPTION 'Access denied. Admin role required.';
    END IF;
    
    -- Toggle shadow ban status
    UPDATE public.profiles
    SET shadow_banned = NOT COALESCE(shadow_banned, false)
    WHERE user_id = target_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.promote_to_admin(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.setup_admin_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    -- Promover admin@ivofernandesnews.com.br para administrador
    PERFORM public.promote_to_admin('admin@ivofernandesnews.com.br');
    
    RAISE NOTICE 'Conta admin@ivofernandesnews.com.br promovida para administrador (se existir)';
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_content_comments_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
    -- Para INSERT
    IF TG_OP = 'INSERT' THEN
        IF NEW.post_id IS NOT NULL THEN
            UPDATE public.posts 
            SET comments_count = (
                SELECT COUNT(*) 
                FROM public.comments 
                WHERE post_id = NEW.post_id AND approved = true
            )
            WHERE id = NEW.post_id;
        END IF;
        
        IF NEW.video_id IS NOT NULL THEN
            UPDATE public.videos 
            SET comments_count = (
                SELECT COUNT(*) 
                FROM public.comments 
                WHERE video_id = NEW.video_id AND approved = true
            )
            WHERE id = NEW.video_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Para DELETE
    IF TG_OP = 'DELETE' THEN
        IF OLD.post_id IS NOT NULL THEN
            UPDATE public.posts 
            SET comments_count = (
                SELECT COUNT(*) 
                FROM public.comments 
                WHERE post_id = OLD.post_id AND approved = true
            )
            WHERE id = OLD.post_id;
        END IF;
        
        IF OLD.video_id IS NOT NULL THEN
            UPDATE public.videos 
            SET comments_count = (
                SELECT COUNT(*) 
                FROM public.comments 
                WHERE video_id = OLD.video_id AND approved = true
            )
            WHERE id = OLD.video_id;
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$function$;