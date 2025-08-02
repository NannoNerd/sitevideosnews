-- Função melhorada para limpar completamente HTML e CSS de conteúdos
CREATE OR REPLACE FUNCTION strip_all_html(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  IF input_text IS NULL OR input_text = '' THEN
    RETURN input_text;
  END IF;
  
  -- Remove todos os comentários HTML
  input_text := regexp_replace(input_text, '<!--.*?-->', '', 'gi');
  
  -- Remove todas as tags de script e style com seu conteúdo
  input_text := regexp_replace(input_text, '<(script|style)[^>]*>.*?</\1>', '', 'gsi');
  
  -- Remove todas as tags HTML
  input_text := regexp_replace(input_text, '<[^>]*>', '', 'g');
  
  -- Converte entidades HTML comuns
  input_text := replace(input_text, '&nbsp;', ' ');
  input_text := replace(input_text, '&amp;', '&');
  input_text := replace(input_text, '&lt;', '<');
  input_text := replace(input_text, '&gt;', '>');
  input_text := replace(input_text, '&quot;', '"');
  input_text := replace(input_text, '&#39;', '''');
  input_text := replace(input_text, '&apos;', '''');
  
  -- Remove múltiplos espaços e quebras de linha
  input_text := regexp_replace(input_text, '\s+', ' ', 'g');
  
  -- Remove caracteres de controle e espaços no início/fim
  input_text := trim(input_text);
  
  RETURN input_text;
END;
$$ LANGUAGE plpgsql;

-- Aplica limpeza completa em posts existentes
UPDATE posts 
SET content = strip_all_html(content)
WHERE content IS NOT NULL 
  AND content != ''
  AND (content LIKE '%<%' OR content LIKE '%&%');

-- Aplica limpeza completa em descrições de vídeos existentes  
UPDATE videos 
SET description = strip_all_html(description)
WHERE description IS NOT NULL 
  AND description != ''
  AND (description LIKE '%<%' OR description LIKE '%&%');

-- Remove a função após uso
DROP FUNCTION strip_all_html(TEXT);