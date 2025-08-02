import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import RichTextEditor from '@/components/RichTextEditor';

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function CreateContent() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [videoTitle, setVideoTitle] = useState('');

  const MAX_TITLE_LENGTH = 120;

  // Redirect if not authenticated
  if (!loading && !user) {
    return <Navigate to="/auth" replace />;
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  };

  const extractYouTubeVideoId = (url: string) => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const handleCreatePost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const title = postTitle;
      const content = postContent;
      const categoryId = formData.get('categoryId') as string;
      const coverImage = formData.get('coverImage') as File;

      if (!title.trim()) {
        throw new Error('Título é obrigatório');
      }

      if (title.length > MAX_TITLE_LENGTH) {
        throw new Error(`Título deve ter no máximo ${MAX_TITLE_LENGTH} caracteres`);
      }

      let coverImageUrl = '';

      // Upload cover image if provided
      if (coverImage && coverImage.size > 0) {
        const fileExt = coverImage.name.split('.').pop();
        const fileName = `${user!.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('content-images')
          .upload(fileName, coverImage);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('content-images')
          .getPublicUrl(fileName);

        coverImageUrl = publicUrl;
      }

      const slug = generateSlug(title);
      
      const { error } = await supabase
        .from('posts')
        .insert({
          title,
          slug,
          content,
          excerpt: content.substring(0, 200),
          cover_image_url: coverImageUrl,
          category_id: categoryId || null,
          author_id: user!.id,
          published: true,
          published_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: 'Post criado com sucesso!',
        description: 'Seu post foi publicado.'
      });

      navigate('/');
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast({
        title: 'Erro ao criar post',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateVideo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const title = videoTitle;
      const description = videoDescription;
      const youtubeUrl = formData.get('youtubeUrl') as string;
      const categoryId = formData.get('categoryId') as string;
      const thumbnail = formData.get('thumbnail') as File;

      if (!title.trim()) {
        throw new Error('Título é obrigatório');
      }

      if (title.length > MAX_TITLE_LENGTH) {
        throw new Error(`Título deve ter no máximo ${MAX_TITLE_LENGTH} caracteres`);
      }

      const videoId = extractYouTubeVideoId(youtubeUrl);
      if (!videoId) {
        throw new Error('URL do YouTube inválida');
      }

      let thumbnailUrl = '';

      // Upload custom thumbnail if provided
      if (thumbnail && thumbnail.size > 0) {
        const fileExt = thumbnail.name.split('.').pop();
        const fileName = `${user!.id}/thumbnails/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('content-images')
          .upload(fileName, thumbnail);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('content-images')
          .getPublicUrl(fileName);

        thumbnailUrl = publicUrl;
      }

      const slug = generateSlug(title);
      
      const { error } = await supabase
        .from('videos')
        .insert({
          title,
          slug,
          description,
          youtube_url: youtubeUrl,
          youtube_video_id: videoId,
          thumbnail_url: thumbnailUrl,
          category_id: categoryId || null,
          author_id: user!.id,
          published: true,
          published_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: 'Vídeo criado com sucesso!',
        description: 'Seu vídeo foi publicado.'
      });

      navigate('/');
    } catch (error: any) {
      console.error('Error creating video:', error);
      toast({
        title: 'Erro ao criar vídeo',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button variant="outline" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Criar Conteúdo</CardTitle>
            <CardDescription>
              Publique novos posts ou vídeos na plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="post">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="post">Notícia/Post</TabsTrigger>
                <TabsTrigger value="video">Vídeo</TabsTrigger>
              </TabsList>
              
              <TabsContent value="post">
                <form onSubmit={handleCreatePost} className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="post-title">Título</Label>
                      <span className={`text-xs ${postTitle.length > MAX_TITLE_LENGTH ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {postTitle.length}/{MAX_TITLE_LENGTH}
                      </span>
                    </div>
                    <Input
                      id="post-title"
                      value={postTitle}
                      onChange={(e) => setPostTitle(e.target.value)}
                      placeholder="Digite o título da notícia"
                      required
                      maxLength={MAX_TITLE_LENGTH + 20} // Allow typing a bit over to show error
                      className={postTitle.length > MAX_TITLE_LENGTH ? 'border-destructive' : ''}
                    />
                    {postTitle.length > MAX_TITLE_LENGTH && (
                      <p className="text-xs text-destructive">
                        Título muito longo. Máximo de {MAX_TITLE_LENGTH} caracteres.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="post-category">Categoria</Label>
                    <Select name="categoryId">
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="post-cover">Imagem de Capa</Label>
                    <Input
                      id="post-cover"
                      name="coverImage"
                      type="file"
                      accept="image/*"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="post-content">Conteúdo</Label>
                    <RichTextEditor
                      value={postContent}
                      onChange={setPostContent}
                      placeholder="Escreva o conteúdo da notícia"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isLoading || postTitle.length > MAX_TITLE_LENGTH} 
                    className="w-full"
                  >
                    {isLoading ? 'Publicando...' : 'Publicar Post'}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="video">
                <form onSubmit={handleCreateVideo} className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="video-title">Título</Label>
                      <span className={`text-xs ${videoTitle.length > MAX_TITLE_LENGTH ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {videoTitle.length}/{MAX_TITLE_LENGTH}
                      </span>
                    </div>
                    <Input
                      id="video-title"
                      value={videoTitle}
                      onChange={(e) => setVideoTitle(e.target.value)}
                      placeholder="Digite o título do vídeo"
                      required
                      maxLength={MAX_TITLE_LENGTH + 20} // Allow typing a bit over to show error
                      className={videoTitle.length > MAX_TITLE_LENGTH ? 'border-destructive' : ''}
                    />
                    {videoTitle.length > MAX_TITLE_LENGTH && (
                      <p className="text-xs text-destructive">
                        Título muito longo. Máximo de {MAX_TITLE_LENGTH} caracteres.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="video-category">Categoria</Label>
                    <Select name="categoryId">
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="video-url">URL do YouTube</Label>
                    <Input
                      id="video-url"
                      name="youtubeUrl"
                      placeholder="https://www.youtube.com/watch?v=..."
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="video-thumbnail">Thumbnail Personalizada (opcional)</Label>
                    <Input
                      id="video-thumbnail"
                      name="thumbnail"
                      type="file"
                      accept="image/*"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="video-description">Descrição</Label>
                    <RichTextEditor
                      value={videoDescription}
                      onChange={setVideoDescription}
                      placeholder="Descreva o conteúdo do vídeo"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isLoading || videoTitle.length > MAX_TITLE_LENGTH} 
                    className="w-full"
                  >
                    {isLoading ? 'Publicando...' : 'Publicar Vídeo'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}