-- Add shadow_banned field to profiles table
ALTER TABLE public.profiles ADD COLUMN shadow_banned boolean DEFAULT false;

-- Create a function to check if user can comment (not shadow banned)
CREATE OR REPLACE FUNCTION public.can_user_comment(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT NOT COALESCE(shadow_banned, false)
  FROM public.profiles
  WHERE user_id = user_id_param;
$$;

-- Update comments policy to check shadow ban status
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
CREATE POLICY "Users can create comments" 
ON public.comments 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  public.can_user_comment(auth.uid())
);

-- Create policy for admins to delete comments
CREATE POLICY "Admins can delete comments" 
ON public.comments 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create function to toggle shadow ban (admin only)
CREATE OR REPLACE FUNCTION public.toggle_shadow_ban(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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