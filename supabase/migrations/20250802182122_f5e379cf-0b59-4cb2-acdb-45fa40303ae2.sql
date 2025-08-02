-- Corrigir a função para ter search_path seguro
CREATE OR REPLACE FUNCTION update_content_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;