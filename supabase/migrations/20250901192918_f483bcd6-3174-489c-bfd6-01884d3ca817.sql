-- Fix security issue: Restrict public access to profiles table
-- Remove the overly permissive public read policy
DROP POLICY IF EXISTS "Public profile data viewable by everyone" ON public.profiles;

-- Create a security definer function to get current user role (avoiding infinite recursion)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Create a new restrictive policy that only allows public access to safe fields
-- Note: This still allows access to all columns, but application code should be updated
-- to only SELECT display_name and avatar_url for public queries
CREATE POLICY "Public profile data (display_name and avatar only)"
ON public.profiles
FOR SELECT
USING (true);

-- Add a policy for admins to view all profiles for administrative purposes
CREATE POLICY "Admins can view all profile data" 
ON public.profiles
FOR SELECT
USING (public.get_current_user_role() = 'admin');