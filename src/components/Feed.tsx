import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Heart, MessageCircle, Eye, Search, Plus, Settings, User } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { truncateWithTooltip, processTextWithLinks, truncateText } from '@/lib/text-utils';

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  content?: string;
  description?: string;
  cover_image_url?: string;
  thumbnail_url?: string;
  youtube_video_id?: string;
  duration?: string;
  category: { name: string; slug: string };
  author: { display_name: string; avatar_url?: string };
  published_at: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  type: 'post' | 'video';
}

export default function Feed() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'posts' | 'videos'>('all');
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const searchQuery = searchParams.get('search') || '';

  const fetchContent = async () => {
    try {
      // Fetch posts with author info
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          categories(name, slug)
        `)
        .eq('published', true)
        .order('published_at', { ascending: false })
        .limit(10);

      if (postsError) throw postsError;

      // Fetch videos with author info
      const { data: videos, error: videosError } = await supabase
        .from('videos')
        .select(`
          *,
          categories(name, slug)
        `)
        .eq('published', true)
        .order('published_at', { ascending: false })
        .limit(10);

      if (videosError) throw videosError;

      // Get unique author IDs
      const authorIds = [
        ...(posts || []).map(p => p.author_id),
        ...(videos || []).map(v => v.author_id)
      ].filter((id, index, arr) => arr.indexOf(id) === index);

      // Fetch author profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', authorIds);

      if (profilesError) throw profilesError;

      // Create author lookup map
      const authorMap = (profiles || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);

      // Combine and sort content
      const allContent: ContentItem[] = [
        ...(posts || []).map(post => ({ 
          ...post, 
          type: 'post' as const,
          category: post.categories || { name: 'Sem categoria', slug: '' },
          author: { 
            display_name: authorMap[post.author_id]?.display_name || 'Anônimo',
            avatar_url: authorMap[post.author_id]?.avatar_url
          }
        })),
        ...(videos || []).map(video => ({ 
          ...video, 
          type: 'video' as const,
          category: video.categories || { name: 'Sem categoria', slug: '' },
          author: { 
            display_name: authorMap[video.author_id]?.display_name || 'Anônimo',
            avatar_url: authorMap[video.author_id]?.avatar_url
          }
        }))
      ].sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

      setContent(allContent);

      // Fetch user likes if authenticated
      if (user) {
        const contentIds = allContent.map(item => item.id);
        const { data: likes } = await supabase
          .from('likes')
          .select('post_id, video_id')
          .eq('user_id', user.id)
          .or(`post_id.in.(${contentIds.join(',')}),video_id.in.(${contentIds.join(',')})`);

        if (likes) {
          const likedIds = new Set(likes.map(like => like.post_id || like.video_id).filter(Boolean));
          setUserLikes(likedIds);
        }
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      toast({
        title: 'Erro ao carregar conteúdo',
        description: 'Tente novamente em alguns momentos.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (item: ContentItem) => {
    if (!user) {
      toast({
        title: 'Login necessário',
        description: 'Faça login para curtir conteúdos.',
        variant: 'destructive'
      });
      return;
    }

    const isLiked = userLikes.has(item.id);
    const foreignKey = item.type === 'post' ? 'post_id' : 'video_id';

    try {
      if (isLiked) {
        // Remove like
        await supabase
          .from('likes')
          .delete()
          .eq(foreignKey, item.id)
          .eq('user_id', user.id);

        // Update UI
        setUserLikes(prev => {
          const newSet = new Set(prev);
          newSet.delete(item.id);
          return newSet;
        });

        setContent(prev => prev.map(contentItem => 
          contentItem.id === item.id 
            ? { ...contentItem, likes_count: contentItem.likes_count - 1 }
            : contentItem
        ));
      } else {
        // Add like
        await supabase
          .from('likes')
          .insert({
            [foreignKey]: item.id,
            user_id: user.id
          });

        // Update UI
        setUserLikes(prev => new Set([...prev, item.id]));

        setContent(prev => prev.map(contentItem => 
          contentItem.id === item.id 
            ? { ...contentItem, likes_count: contentItem.likes_count + 1 }
            : contentItem
        ));
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

  useEffect(() => {
    fetchContent();

    // Set up real-time subscription to update comment counts
    const commentsChannel = supabase
      .channel('comments-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments'
        },
        () => {
          // Refetch content to update comment counts
          fetchContent();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts'
        },
        () => {
          // Refetch content when posts are updated (for comment counts)
          fetchContent();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'videos'
        },
        () => {
          // Refetch content when videos are updated (for comment counts)
          fetchContent();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
    };
  }, [user]);

  const filteredContent = content.filter(item => {
    const matchesFilter = filter === 'all' || 
      (filter === 'posts' && item.type === 'post') ||
      (filter === 'videos' && item.type === 'video');
    
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.content || item.description || '').toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const handleSignOut = async () => {
    await signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 w-full overflow-x-hidden">
        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 max-w-full">
          <div className="mb-6 flex justify-center">
            <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="posts">Notícias</TabsTrigger>
                <TabsTrigger value="videos">Vídeos</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Search Results Info */}
          {searchQuery && (
            <div className="mb-4 text-center text-muted-foreground">
              <p>{filteredContent.length} resultado(s) para o termo "{searchQuery}"</p>
            </div>
          )}

          {filteredContent.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhum conteúdo encontrado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1200px] mx-auto">
              {filteredContent.map((item) => {
                const isLiked = userLikes.has(item.id);
                
                return (
                  <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow w-full">
                    <Link to={`/${item.type}/${item.slug}`}>
                      <div className="aspect-video bg-muted relative overflow-hidden">
                        {item.type === 'video' && item.youtube_video_id ? (
                          <>
                            <img
                              src={item.thumbnail_url || `https://img.youtube.com/vi/${item.youtube_video_id}/maxresdefault.jpg`}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                            {item.duration && (
                              <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                                {item.duration}
                              </div>
                            )}
                          </>
                        ) : item.cover_image_url ? (
                          <img
                            src={item.cover_image_url}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            {item.type === 'video' ? (
                              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                                <div className="w-0 h-0 border-l-[6px] border-l-primary border-y-[4px] border-y-transparent ml-1"></div>
                              </div>
                            ) : (
                              <div className="text-muted-foreground text-sm">Sem imagem</div>
                            )}
                          </div>
                        )}
                       </div>
                     </Link>
                     
                      <CardHeader>
                        <CardTitle className="break-anywhere leading-tight">
                          <Link to={`/${item.type}/${item.slug}`} className="hover:text-primary">
                            {item.title}
                          </Link>
                        </CardTitle>
                         <div className="flex justify-between items-center mt-2">
                           <Badge variant="secondary" className="text-xs">
                             {item.category?.name}
                           </Badge>
                           <Badge variant="outline" className="text-xs">
                             {item.type === 'post' ? 'Post' : 'Vídeo'}
                           </Badge>
                         </div>
                        <CardDescription 
                          className="line-clamp-2 break-anywhere"
                          dangerouslySetInnerHTML={{
                            __html: processTextWithLinks(
                              item.type === 'post' 
                                ? truncateText(item.content || '', 150)
                                : truncateText(item.description || '', 150)
                            )
                          }}
                        />
                    </CardHeader>
                    
                     <CardContent>
                       <div className="flex items-center justify-between text-sm text-muted-foreground">
                         <div className="flex items-center gap-2">
                           <Avatar className="h-6 w-6">
                             <img 
                               src={item.author?.avatar_url || ''} 
                               alt={item.author?.display_name || 'Avatar'} 
                               className="h-full w-full object-cover"
                               onError={(e) => {
                                 e.currentTarget.style.display = 'none';
                               }}
                             />
                             <AvatarFallback className="h-6 w-6 text-xs bg-muted">
                               {item.author?.display_name?.charAt(0)?.toUpperCase() || 'A'}
                             </AvatarFallback>
                           </Avatar>
                           <span className="truncate">Por {item.author?.display_name}</span>
                         </div>
                         <span className="whitespace-nowrap">{new Date(item.published_at).toLocaleDateString('pt-BR')}</span>
                       </div>
                      
                      <div className="flex items-center justify-between mt-3 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Eye className="h-4 w-4" />
                          <span>{item.views_count}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={(e) => {
                            e.preventDefault();
                            handleLike(item);
                          }}
                          className={`flex items-center space-x-1 ${isLiked ? 'text-red-500' : ''}`}
                        >
                          <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                          <span>{item.likes_count}</span>
                        </Button>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="h-4 w-4" />
                          <span>{item.comments_count}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </TooltipProvider>
  );
}