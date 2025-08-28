import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Heart, MessageCircle, Eye, Search, Cog, Brain } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { truncateText } from '@/lib/text-utils';

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
  category: {
    name: string;
    slug: string;
  };
  author: {
    display_name: string;
    avatar_url?: string;
  };
  published_at: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  type: 'post' | 'video';
}

export default function Engineering() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'posts' | 'videos'>('all');
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const fetchEngineeringContent = async () => {
    try {
      // Build posts query for engineering category
      let postsQuery = supabase
        .from('posts')
        .select(`
          *,
          categories(name, slug)
        `)
        .eq('published', true)
        .eq('categories.slug', 'engenharia');

      const { data: posts, error: postsError } = await postsQuery
        .order('published_at', { ascending: false })
        .limit(20);

      if (postsError) throw postsError;

      // Build videos query for engineering category
      let videosQuery = supabase
        .from('videos')
        .select(`
          *,
          categories(name, slug)
        `)
        .eq('published', true)
        .eq('categories.slug', 'engenharia');

      const { data: videos, error: videosError } = await videosQuery
        .order('published_at', { ascending: false })
        .limit(20);

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
          category: post.categories || { name: 'Engenharia', slug: 'engenharia' },
          author: {
            display_name: authorMap[post.author_id]?.display_name || 'Anônimo',
            avatar_url: authorMap[post.author_id]?.avatar_url
          }
        })),
        ...(videos || []).map(video => ({
          ...video,
          type: 'video' as const,
          category: video.categories || { name: 'Engenharia', slug: 'engenharia' },
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
          const likedIds = new Set(
            likes.map(like => like.post_id || like.video_id).filter(Boolean)
          );
          setUserLikes(likedIds);
        }
      }
    } catch (error) {
      console.error('Error fetching engineering content:', error);
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
        setContent(prev => 
          prev.map(contentItem => 
            contentItem.id === item.id 
              ? { ...contentItem, likes_count: contentItem.likes_count - 1 }
              : contentItem
          )
        );
      } else {
        // Add like
        await supabase
          .from('likes')
          .insert({ [foreignKey]: item.id, user_id: user.id });

        // Update UI
        setUserLikes(prev => new Set([...prev, item.id]));
        setContent(prev => 
          prev.map(contentItem => 
            contentItem.id === item.id 
              ? { ...contentItem, likes_count: contentItem.likes_count + 1 }
              : contentItem
          )
        );
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
    fetchEngineeringContent();
  }, [user]);

  const filteredContent = content.filter(item => {
    const matchesFilter = 
      filter === 'all' || 
      (filter === 'posts' && item.type === 'post') || 
      (filter === 'videos' && item.type === 'video');
    
    const matchesSearch = 
      searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.content || item.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-16 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center mb-6">
            <Cog className="w-12 h-12 text-blue-400 mr-4" />
            <h1 className="text-4xl md:text-5xl font-bold">
              Engenharia Civil
            </h1>
          </div>
          <p className="text-xl md:text-2xl mb-8 text-blue-200 max-w-3xl mx-auto">
            Conteúdos especializados em AutoCAD Civil 3D, projetos de infraestrutura, 
            análise de terrenos e tecnologias para engenharia civil.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Badge variant="secondary" className="px-4 py-2 text-base">
              AutoCAD Civil 3D
            </Badge>
            <Badge variant="secondary" className="px-4 py-2 text-base">
              Projetos de Infraestrutura
            </Badge>
            <Badge variant="secondary" className="px-4 py-2 text-base">
              Análise de Terrenos
            </Badge>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Search and Filter Section */}
          <div className="w-full lg:w-1/4">
            <div className="sticky top-8 space-y-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input 
                  placeholder="Buscar conteúdo..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10" 
                />
              </div>
              
              <Tabs value={filter} onValueChange={(value) => setFilter(value as 'all' | 'posts' | 'videos')}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">Todos</TabsTrigger>
                  <TabsTrigger value="posts">Posts</TabsTrigger>
                  <TabsTrigger value="videos">Vídeos</TabsTrigger>
                </TabsList>
              </Tabs>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    IA para Engenharia
                  </CardTitle>
                  <CardDescription>
                    Gere comandos e scripts para softwares de engenharia
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" variant="outline">
                    Acessar IA Assistant
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Content Section */}
          <div className="w-full lg:w-3/4">
            <div className="grid gap-6">
              {filteredContent.length === 0 ? (
                <div className="text-center py-12">
                  <Cog className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Nenhum conteúdo encontrado</h3>
                  <p className="text-muted-foreground">
                    Não encontramos conteúdos de engenharia que correspondam aos seus filtros.
                  </p>
                </div>
              ) : (
                filteredContent.map((item) => (
                  <Card key={item.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary">{item.category.name}</Badge>
                            <Badge variant={item.type === 'post' ? 'default' : 'outline'}>
                              {item.type === 'post' ? 'Post' : 'Vídeo'}
                            </Badge>
                          </div>
                          <CardTitle className="line-clamp-2">
                            <Link 
                              to={item.type === 'post' ? `/post/${item.slug}` : `/video/${item.slug}`}
                              className="hover:text-primary transition-colors"
                            >
                              {item.title}
                            </Link>
                          </CardTitle>
                          <CardDescription className="line-clamp-2 mt-2">
                            {truncateText(item.description || item.content || '', 150)}
                          </CardDescription>
                        </div>
                        {(item.cover_image_url || item.thumbnail_url) && (
                          <div className="w-24 h-24 ml-4 flex-shrink-0">
                            <img 
                              src={item.cover_image_url || item.thumbnail_url} 
                              alt={item.title}
                              className="w-full h-full object-cover rounded-md"
                            />
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback>
                                {item.author.display_name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{item.author.display_name}</span>
                          </div>
                          <span>•</span>
                          <span>{new Date(item.published_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleLike(item)}
                            className={userLikes.has(item.id) ? 'text-red-500' : ''}
                          >
                            <Heart className={`w-4 h-4 mr-1 ${userLikes.has(item.id) ? 'fill-current' : ''}`} />
                            {item.likes_count}
                          </Button>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MessageCircle className="w-4 h-4" />
                            {item.comments_count}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Eye className="w-4 h-4" />
                            {item.views_count}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}