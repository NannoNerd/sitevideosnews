import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Heart, Eye, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Video {
  id: string;
  title: string;
  description?: string;
  youtube_video_id: string;
  author_id: string;
  published_at: string;
  views_count: number;
  likes_count: number;
  categories: { name: string; slug: string } | null;
  author: { display_name: string };
}

export default function VideoView() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchVideo();
    }
  }, []);

  const fetchVideo = async () => {
    if (!slug) return;
    try {
      const { data: videoData, error } = await supabase
        .from('videos')
        .select(`
          *,
          categories(name, slug)
        `)
        .eq('slug', slug)
        .eq('published', true)
        .single();

      if (error) throw error;

      if (videoData) {
        // Get author info
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', videoData.author_id)
          .single();

        const videoWithAuthor = {
          ...videoData,
          author: { display_name: profile?.display_name || 'Anônimo' }
        };

        setVideo(videoWithAuthor);

        // Check if user liked this video
        if (user) {
          const { data: likeData } = await supabase
            .from('likes')
            .select('id')
            .eq('content_id', videoData.id)
            .eq('user_id', user.id)
            .eq('content_type', 'video')
            .maybeSingle();

          setLiked(!!likeData);
        }

        // Increment view count
        await supabase
          .from('videos')
          .update({ views_count: videoData.views_count + 1 })
          .eq('id', videoData.id);
      }
    } catch (error) {
      console.error('Error fetching video:', error);
      toast({
        title: 'Erro ao carregar vídeo',
        description: 'Vídeo não encontrado.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast({
        title: 'Login necessário',
        description: 'Faça login para curtir vídeos.',
        variant: 'destructive'
      });
      return;
    }

    if (!video) return;

    try {
      if (liked) {
        await supabase
          .from('likes')
          .delete()
          .eq('content_id', video.id)
          .eq('user_id', user.id)
          .eq('content_type', 'video');

        setVideo(prevVideo => {
          if (!prevVideo) return null;
          return { ...prevVideo, likes_count: prevVideo.likes_count - 1 };
        });
        setLiked(false);
      } else {
        await supabase
          .from('likes')
          .insert({
            content_id: video.id,
            user_id: user.id,
            content_type: 'video'
          });

        setVideo(prevVideo => {
          if (!prevVideo) return null;
          return { ...prevVideo, likes_count: prevVideo.likes_count + 1 };
        });
        setLiked(true);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível processar a curtida.',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Vídeo não encontrado</h1>
          <Link to="/">
            <Button>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao início
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link to="/" className="inline-flex items-center mb-6 text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao feed
        </Link>

        <article className="space-y-6">
          <div className="aspect-video overflow-hidden rounded-lg bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${video.youtube_video_id}?controls=0&modestbranding=1&rel=0&showinfo=0`}
              frameBorder="0"
              allowFullScreen
              className="w-full h-full"
              title={video.title}
            />
          </div>

          <header className="space-y-4">
            <div className="flex items-center space-x-2">
              {video.categories && (
                <Badge variant="secondary">{video.categories.name}</Badge>
              )}
              <Badge variant="default">Vídeo</Badge>
            </div>

            <h1 className="text-4xl font-bold leading-tight">{video.title}</h1>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Avatar>
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span>Por {video.author.display_name}</span>
                </div>
                <span>{new Date(video.published_at).toLocaleDateString('pt-BR')}</span>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Eye className="h-4 w-4" />
                  <span>{video.views_count}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  className={liked ? 'text-red-500' : ''}
                >
                  <Heart className={`h-4 w-4 mr-1 ${liked ? 'fill-current' : ''}`} />
                  {video.likes_count}
                </Button>
              </div>
            </div>
          </header>

          {video.description && (
            <div className="prose prose-lg max-w-none">
              <div dangerouslySetInnerHTML={{ __html: video.description }} />
            </div>
          )}
        </article>
      </div>
    </div>
  );
}