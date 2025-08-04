-- Fix the dependency issue by recreating the policy first
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;

-- Recreate the function with proper search path
DROP FUNCTION IF EXISTS public.can_user_comment(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.can_user_comment(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT NOT COALESCE(shadow_banned, false)
  FROM public.profiles
  WHERE user_id = user_id_param;
$$;

-- Recreate the policy with the updated function
CREATE POLICY "Users can create comments" 
ON public.comments 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  public.can_user_comment(auth.uid())
);

-- Fix the shadow ban function as well
DROP FUNCTION IF EXISTS public.toggle_shadow_ban(uuid);

CREATE OR REPLACE FUNCTION public.toggle_shadow_ban(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;