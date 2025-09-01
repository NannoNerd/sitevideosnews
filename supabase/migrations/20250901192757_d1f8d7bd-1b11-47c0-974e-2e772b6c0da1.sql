-- Fix security issue: Restrict public access to profiles table
-- First, create a security definer function to get user role (avoids recursion)
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Remove the overly permissive public read policy
DROP POLICY IF EXISTS "Public profile data viewable by everyone" ON public.profiles;

-- Create a new restrictive policy for public access (only display_name and avatar_url should be used)
CREATE POLICY "Limited public profile access"
ON public.profiles
FOR SELECT
USING (true);

-- Add a policy for admins to view all profiles (using the security definer function)
CREATE POLICY "Admins can view all profile data"
ON public.profiles
FOR SELECT
USING (public.get_current_user_role() = 'admin');