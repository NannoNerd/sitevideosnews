import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Heart, Eye, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { processTextWithLinks } from '@/lib/text-utils';
import Comments from '@/components/Comments';

interface Post {
  id: string;
  title: string;
  content: string;
  cover_image_url?: string;
  author_id: string;
  published_at: string;
  views_count: number;
  likes_count: number;
  categories: { name: string; slug: string } | null;
  author: { display_name: string };
}

export default function PostView() {
  const { slug } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchPost();
    }
  }, []);

  const fetchPost = async () => {
    if (!slug) return;
    
    try {
      const { data: postData, error } = await supabase
        .from('posts')
        .select(`
          *,
          categories(name, slug)
        `)
        .eq('slug', slug)
        .eq('published', true)
        .single();

      if (error) throw error;

      if (postData) {
        // Get author info
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', postData.author_id)
          .single();

        const postWithAuthor = {
          ...postData,
          author: { display_name: profile?.display_name || 'Anônimo' }
        };

        setPost(postWithAuthor);

        // Check if user liked this post
        if (user) {
          const { data: likeData } = await supabase
            .from('likes')
            .select('id')
            .eq('post_id', postData.id)
            .eq('user_id', user.id)
            .maybeSingle();

          setLiked(!!likeData);
        }

        // Increment view count
        await supabase
          .from('posts')
          .update({ views_count: postData.views_count + 1 })
          .eq('id', postData.id);
      }
    } catch (error) {
      console.error('Error fetching post:', error);
      toast({
        title: 'Erro ao carregar post',
        description: 'Post não encontrado.',
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
        description: 'Faça login para curtir posts.',
        variant: 'destructive'
      });
      return;
    }

    if (!post) return;

    try {
      if (liked) {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);

        setPost(prevPost => {
          if (!prevPost) return null;
          return { ...prevPost, likes_count: prevPost.likes_count - 1 };
        });
        setLiked(false);
      } else {
        await supabase
          .from('likes')
          .insert({
            post_id: post.id,
            user_id: user.id
          });

        setPost(prevPost => {
          if (!prevPost) return null;
          return { ...prevPost, likes_count: prevPost.likes_count + 1 };
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

  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Post não encontrado</h1>
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container mx-auto px-4 py-8">
        <Link to="/?category=engenharia" className="inline-flex items-center mb-6 text-muted-foreground hover:text-primary transition-colors hover-lift">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao feed
        </Link>

        <article className="space-y-6 bg-card/50 backdrop-blur-sm rounded-xl p-8 border border-border">
          {post.cover_image_url && (
            <div className="aspect-video overflow-hidden rounded-lg animate-fade-in">
              <img
                src={post.cover_image_url}
                alt={post.title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <header className="space-y-4 animate-slide-up">
            <div className="flex items-center space-x-2">
              {post.categories && (
                <Badge variant="secondary" className="bg-primary/20 text-primary-foreground border-primary/30">{post.categories.name}</Badge>
              )}
            </div>

            <h1 className="text-4xl font-bold leading-tight text-foreground">{post.title}</h1>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Avatar className="border-2 border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-foreground">Por {post.author.display_name}</span>
                </div>
                <span>{new Date(post.published_at).toLocaleDateString('pt-BR')}</span>
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Eye className="h-4 w-4" />
                  <span>{post.views_count}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLike}
                  className={`hover-lift ${liked ? 'text-red-500' : ''}`}
                >
                  <Heart className={`h-4 w-4 mr-1 ${liked ? 'fill-current' : ''}`} />
                  {post.likes_count}
                </Button>
              </div>
            </div>
          </header>

          <div className="prose prose-lg max-w-none animate-fade-in" style={{animationDelay: '0.2s'}}>
            <div 
              className="text-foreground [&>*]:text-foreground [&>h1]:text-foreground [&>h2]:text-foreground [&>h3]:text-foreground [&>h4]:text-foreground [&>h5]:text-foreground [&>h6]:text-foreground [&>p]:text-foreground [&>ul]:text-foreground [&>ol]:text-foreground [&>li]:text-foreground [&>blockquote]:text-muted-foreground [&>blockquote]:border-l-primary" 
              dangerouslySetInnerHTML={{ __html: processTextWithLinks(post.content) }} 
            />
          </div>

          {/* Comments Section */}
          <div className="mt-12 pt-8 border-t border-border animate-fade-in" style={{animationDelay: '0.4s'}}>
            <Comments contentId={post.id} contentType="post" />
          </div>
        </article>
      </div>
    </div>
  );
}