-- Convert all existing content authorship to admin@ivofernandesnews.com.br

-- First, get the admin user ID
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Get the admin user ID
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'admin@ivofernandesnews.com.br';
    
    -- If admin user exists, update all posts and videos
    IF admin_user_id IS NOT NULL THEN
        -- Update all posts to be owned by admin
        UPDATE public.posts
        SET author_id = admin_user_id;
        
        -- Update all videos to be owned by admin
        UPDATE public.videos
        SET author_id = admin_user_id;
        
        RAISE NOTICE 'Successfully transferred % posts and % videos to admin user', 
            (SELECT COUNT(*) FROM public.posts),
            (SELECT COUNT(*) FROM public.videos);
    ELSE
        RAISE NOTICE 'Admin user admin@ivofernandesnews.com.br not found';
    END IF;
END $$;