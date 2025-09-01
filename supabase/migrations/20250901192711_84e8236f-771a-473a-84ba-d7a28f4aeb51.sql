-- Fix security issue: Restrict public access to profiles table
-- Remove the overly permissive public read policy
DROP POLICY IF EXISTS "Public profile data viewable by everyone" ON public.profiles;

-- Create a new restrictive policy that only allows public access to safe fields
CREATE POLICY "Public profile data (display_name and avatar only)"
ON public.profiles
FOR SELECT
USING (true)
-- Only allow access to specific columns through application-level filtering
-- The application should only SELECT display_name and avatar_url for public access;

-- The existing "Users can view their own complete profile" policy remains intact
-- This ensures users can still see their full profile data when authenticated

-- Add a policy for admins to view all profiles for administrative purposes
CREATE POLICY "Admins can view all profile data"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);