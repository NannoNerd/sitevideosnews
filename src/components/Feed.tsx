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

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  content?: string;
  description?: string;
  cover_image_url?: string;
  thumbnail_url?: string;
  youtube_video_id?: string;
  category: { name: string; slug: string };
  author: { display_name: string };
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
        .select('user_id, display_name')
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
          author: { display_name: authorMap[post.author_id]?.display_name || 'Anônimo' }
        })),
        ...(videos || []).map(video => ({ 
          ...video, 
          type: 'video' as const,
          category: video.categories || { name: 'Sem categoria', slug: '' },
          author: { display_name: authorMap[video.author_id]?.display_name || 'Anônimo' }
        }))
      ].sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());

      setContent(allContent);
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

  useEffect(() => {
    fetchContent();
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="posts">Notícias</TabsTrigger>
              <TabsTrigger value="videos">Vídeos</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {filteredContent.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum conteúdo encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContent.map((item) => (
              <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <Link to={`/${item.type}/${item.slug}`}>
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    {item.type === 'video' && item.youtube_video_id ? (
                      <img
                        src={item.thumbnail_url || `https://img.youtube.com/vi/${item.youtube_video_id}/maxresdefault.jpg`}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
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
                    <Badge className="absolute top-2 left-2" variant="secondary">
                      {item.category?.name}
                    </Badge>
                    {item.type === 'video' && (
                      <Badge className="absolute top-2 right-2" variant="default">
                        Vídeo
                      </Badge>
                    )}
                  </div>
                </Link>
                
                <CardHeader>
                  <CardTitle className="line-clamp-2">
                    <Link to={`/${item.type}/${item.slug}`} className="hover:text-primary">
                      {item.title}
                    </Link>
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    {item.type === 'post' ? item.content?.substring(0, 150) + '...' : item.description}
                  </CardDescription>
                </CardHeader>
                
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>Por {item.author?.display_name}</span>
                    <span>{new Date(item.published_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-3 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Eye className="h-4 w-4" />
                      <span>{item.views_count}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Heart className="h-4 w-4" />
                      <span>{item.likes_count}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <MessageCircle className="h-4 w-4" />
                      <span>{item.comments_count}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}