-- Primeiro, vamos corrigir o role do Admin
UPDATE profiles 
SET role = 'admin' 
WHERE display_name = 'Admin';

-- Agora vamos criar uma função para atualizar automaticamente o comments_count
CREATE OR REPLACE FUNCTION update_content_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Para INSERT
    IF TG_OP = 'INSERT' THEN
        IF NEW.post_id IS NOT NULL THEN
            UPDATE posts 
            SET comments_count = (
                SELECT COUNT(*) 
                FROM comments 
                WHERE post_id = NEW.post_id AND approved = true
            )
            WHERE id = NEW.post_id;
        END IF;
        
        IF NEW.video_id IS NOT NULL THEN
            UPDATE videos 
            SET comments_count = (
                SELECT COUNT(*) 
                FROM comments 
                WHERE video_id = NEW.video_id AND approved = true
            )
            WHERE id = NEW.video_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Para DELETE
    IF TG_OP = 'DELETE' THEN
        IF OLD.post_id IS NOT NULL THEN
            UPDATE posts 
            SET comments_count = (
                SELECT COUNT(*) 
                FROM comments 
                WHERE post_id = OLD.post_id AND approved = true
            )
            WHERE id = OLD.post_id;
        END IF;
        
        IF OLD.video_id IS NOT NULL THEN
            UPDATE videos 
            SET comments_count = (
                SELECT COUNT(*) 
                FROM comments 
                WHERE video_id = OLD.video_id AND approved = true
            )
            WHERE id = OLD.video_id;
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Criar o trigger para atualizar automaticamente a contagem
DROP TRIGGER IF EXISTS trigger_update_comments_count ON comments;
CREATE TRIGGER trigger_update_comments_count
    AFTER INSERT OR DELETE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_content_comments_count();

-- Recalcular a contagem de comentários para todos os vídeos
UPDATE videos 
SET comments_count = (
    SELECT COUNT(*) 
    FROM comments 
    WHERE comments.video_id = videos.id AND approved = true
);

-- Recalcular a contagem de comentários para todos os posts
UPDATE posts 
SET comments_count = (
    SELECT COUNT(*) 
    FROM comments 
    WHERE comments.post_id = posts.id AND approved = true
);