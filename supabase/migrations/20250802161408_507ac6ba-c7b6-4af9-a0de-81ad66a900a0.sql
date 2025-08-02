-- Primeiro, vamos corrigir os likes órfãos
-- Remove likes que referenciam posts ou videos que não existem mais
DELETE FROM likes 
WHERE (post_id IS NOT NULL AND post_id NOT IN (SELECT id FROM posts))
   OR (video_id IS NOT NULL AND video_id NOT IN (SELECT id FROM videos));

-- Remove likes duplicados (mesmo usuário, mesmo conteúdo)
DELETE FROM likes a USING (
  SELECT MIN(created_at) as min_created, post_id, video_id, user_id
  FROM likes 
  GROUP BY post_id, video_id, user_id
  HAVING COUNT(*) > 1
) b
WHERE a.post_id = b.post_id 
  AND a.video_id = b.video_id 
  AND a.user_id = b.user_id 
  AND a.created_at > b.min_created;

-- Atualiza contadores de likes para posts
UPDATE posts 
SET likes_count = (
  SELECT COUNT(*) 
  FROM likes 
  WHERE likes.post_id = posts.id
);

-- Atualiza contadores de likes para videos
UPDATE videos 
SET likes_count = (
  SELECT COUNT(*) 
  FROM likes 
  WHERE likes.video_id = videos.id
);

-- Atualiza contadores de comentários para posts
UPDATE posts 
SET comments_count = (
  SELECT COUNT(*) 
  FROM comments 
  WHERE comments.post_id = posts.id 
    AND comments.approved = true
);

-- Atualiza contadores de comentários para videos
UPDATE videos 
SET comments_count = (
  SELECT COUNT(*) 
  FROM comments 
  WHERE comments.video_id = videos.id 
    AND comments.approved = true
);

-- Cria função para limpar HTML em conteúdo existente
CREATE OR REPLACE FUNCTION clean_html_content(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  IF input_text IS NULL OR input_text = '' THEN
    RETURN input_text;
  END IF;
  
  -- Remove style attributes and CSS
  input_text := regexp_replace(input_text, 'style="[^"]*"', '', 'gi');
  input_text := regexp_replace(input_text, '<style[^>]*>.*?</style>', '', 'gi');
  
  -- Remove script tags
  input_text := regexp_replace(input_text, '<script[^>]*>.*?</script>', '', 'gi');
  
  -- Remove unwanted attributes but keep basic formatting
  input_text := regexp_replace(input_text, 'class="[^"]*"', '', 'gi');
  input_text := regexp_replace(input_text, 'id="[^"]*"', '', 'gi');
  
  -- Convert common HTML entities
  input_text := replace(input_text, '&nbsp;', ' ');
  input_text := replace(input_text, '&amp;', '&');
  input_text := replace(input_text, '&lt;', '<');
  input_text := replace(input_text, '&gt;', '>');
  input_text := replace(input_text, '&quot;', '"');
  
  RETURN trim(input_text);
END;
$$ LANGUAGE plpgsql;

-- Limpa conteúdo HTML existente em posts
UPDATE posts 
SET content = clean_html_content(content)
WHERE content IS NOT NULL AND content != '';

-- Limpa descrições HTML existentes em videos
UPDATE videos 
SET description = clean_html_content(description)
WHERE description IS NOT NULL AND description != '';

-- Remove a função temporária
DROP FUNCTION clean_html_content(TEXT);