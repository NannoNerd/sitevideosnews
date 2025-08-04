-- Verificar se o bucket existe e criar políticas de storage para avatares
-- Inserir bucket se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('content-images', 'content-images', true)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir que qualquer usuário visualize avatares (já que são públicos)
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'content-images' AND (storage.foldername(name))[1] = 'avatars');

-- Política para permitir upload de avatares pelo próprio usuário
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'content-images' 
  AND (storage.foldername(name))[1] = 'avatars' 
  AND auth.uid() IS NOT NULL
);

-- Política para permitir atualizar avatares pelo próprio usuário
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'content-images' 
  AND (storage.foldername(name))[1] = 'avatars' 
  AND auth.uid() IS NOT NULL
);

-- Política para permitir deletar avatares pelo próprio usuário
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'content-images' 
  AND (storage.foldername(name))[1] = 'avatars' 
  AND auth.uid() IS NOT NULL
);