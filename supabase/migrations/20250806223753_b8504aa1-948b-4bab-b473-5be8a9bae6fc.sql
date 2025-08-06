-- Add DELETE policies for posts and videos tables

-- Allow authors and admins to delete posts
CREATE POLICY "Authors and admins can delete posts" 
ON public.posts 
FOR DELETE 
USING ((author_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = 'admin'::text)))));

-- Allow authors and admins to delete videos
CREATE POLICY "Authors and admins can delete videos" 
ON public.videos 
FOR DELETE 
USING ((author_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = 'admin'::text)))));