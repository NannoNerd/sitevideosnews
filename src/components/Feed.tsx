import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Heart, MessageCircle, Eye, Search, Plus, Settings, User, Cog, CreditCard, Brain, Sparkles, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { truncateWithTooltip, processTextWithLinks, truncateText } from '@/lib/text-utils';

// Import das imagens
import civil3dImage from '@/assets/civil3d.png';
import criptosImage from '@/assets/criptos.png';
import iaIconImage from '@/assets/ia-icon.png';
import supereLimitesImage from '@/assets/supere-limites.jpg';
import mentalidadeVencedoraImage from '@/assets/mentalidade-vencedora.jpg';
import focoDisciplinaImage from '@/assets/foco-disciplina.jpg';

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

export default function Feed() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'posts' | 'videos'>('all');
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const categoryFilter = searchParams.get('category') || '';

  // IA Commands dialog state
  const [iaOpen, setIaOpen] = useState(false);
  const [iaMode, setIaMode] = useState<'engenharia' | 'crypto' | 'growth'>('engenharia');
  const [iaPrompt, setIaPrompt] = useState('');
  const [iaLoading, setIaLoading] = useState(false);
  const [iaResult, setIaResult] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Positive Message state
  const [positiveMessage, setPositiveMessage] = useState<string | null>(null);
  const [generatingPositiveMessage, setGeneratingPositiveMessage] = useState(false);

  // Testimonials carousel state
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Initialize search query from URL and set mounted state
  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
    setMounted(true);
  }, [searchParams]);

  // Testimonials data
  const testimonials = [
    {
      id: 1,
      name: "Ana Souza",
      role: "Engenheira Civil",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face",
      message: "Os conteúdos do site mudaram minha perspectiva profissional e pessoal. Recomendo a todos!"
    },
    {
      id: 2,
      name: "Carlos Silva",
      role: "Arquiteto",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
      message: "Excelente plataforma para aprender sobre tecnologia e inovação. Muito útil!"
    },
    {
      id: 3,
      name: "Maria Santos",
      role: "Investidora",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
      message: "As análises de crypto me ajudaram muito nas minhas decisões de investimento."
    }
  ];

  const fetchContent = async () => {
    try {
      // Build posts query
      let postsQuery = supabase
        .from('posts')
        .select(`
          *,
          categories(name, slug)
        `)
        .eq('published', true);

      // Add category filter if specified
      if (categoryFilter) {
        postsQuery = postsQuery.eq('categories.slug', categoryFilter);
      }

      const { data: posts, error: postsError } = await postsQuery
        .order('published_at', { ascending: false })
        .limit(10);

      if (postsError) throw postsError;

      // Build videos query
      let videosQuery = supabase
        .from('videos')
        .select(`
          *,
          categories(name, slug)
        `)
        .eq('published', true);

      // Add category filter if specified
      if (categoryFilter) {
        videosQuery = videosQuery.eq('categories.slug', categoryFilter);
      }

      const { data: videos, error: videosError } = await videosQuery
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
          const likedIds = new Set(
            likes.map(like => like.post_id || like.video_id).filter(Boolean)
          );
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

        setContent(prev =>
          prev.map(contentItem =>
            contentItem.id === item.id
              ? { ...contentItem, likes_count: contentItem.likes_count - 1 }
              : contentItem
          )
        );
      } else {
        // Add like
        await supabase.from('likes').insert({
          [foreignKey]: item.id,
          user_id: user.id
        });

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
    fetchContent();

    // Set up real-time subscription to update comment counts
    const commentsChannel = supabase
      .channel('comments-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments'
      }, () => {
        // Refetch content to update comment counts
        fetchContent();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'posts'
      }, () => {
        // Refetch content when posts are updated (for comment counts)
        fetchContent();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'videos'      
      }, () => {
        // Refetch content when videos are updated (for comment counts)
        fetchContent();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(commentsChannel);
    };
  }, [user, categoryFilter]);

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

  // Generate IA content via Edge Function (multi-mode)
  const handleGenerateIaCommand = async () => {
    if (!iaPrompt.trim()) {
      toast({
        title: 'Digite um comando',
        description: 'Descreva o que você precisa que a IA gere.',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIaLoading(true);
      setIaResult(null);

      const baseInstructionByMode: Record<typeof iaMode, string> = {
        engenharia: 'Você é um assistente técnico que gera comandos/scripts para ferramentas de engenharia (AutoCAD, Revit, SAP2000, MATLAB, Python para engenharia, etc.). Forneça passos claros e, quando aplicável, blocos de código ou comandos prontos para copiar.',
        crypto: 'Você é um especialista em criptomoedas e tecnologia blockchain. Explique conceitos, riscos e boas práticas de forma clara e educativa (isto não é aconselhamento financeiro).',
        growth: 'Você é um mentor de crescimento pessoal e produtividade. Forneça conselhos práticos, listas numeradas e frameworks simples para aplicação imediata.'
      };

      const formatInstruction = 'Formate a resposta em HTML simples (sem markdown). Use <h2>, <h3>, <p>, <ul>, <li>, <code>, <pre> quando apropriado. Não use asteriscos para negrito; use <strong>. Responda em português do Brasil.';
      const fullPrompt = `${baseInstructionByMode[iaMode]}\n\n${formatInstruction}\n\nSolicitação do usuário: ${iaPrompt}`;

      const { data, error } = await supabase.functions.invoke('generate-with-ai', {
        body: { prompt: fullPrompt }
      });

      if (error) throw error;

      const generated = (data as any)?.generatedText || (data as any)?.text || '';

      // Fallback: se não vier em HTML, converte marcações básicas e quebra de linhas
      let html = generated;
      if (!/<[a-z][\s\S]*>/i.test(html)) {
        html = html
          .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
          .replace(/`([^`]+)`/g, '<code>$1</code>')
          .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
          .replace(/__([^_]+)__/g, '<strong>$1</strong>')
          .replace(/\*([^*]+)\*/g, '<em>$1</em>')
          .replace(/_([^_]+)_/g, '<em>$1</em>')
          .replace(/\n\n/g, '</p><p>')
          .replace(/\n/g, '<br />');
        html = `<p>${html}</p>`;
      }

      setIaResult(html);
    } catch (err) {
      console.error('Erro ao gerar comando:', err);
      const ctx = (err as any)?.context;
      const providerMessage = ctx?.response?.text || 
        (typeof ctx?.body === 'string' ? ctx.body : undefined) || 
        (ctx?.response?.error ? JSON.stringify(ctx.response.error) : undefined);
      const description = providerMessage || 
        (err as any)?.message || 
        (typeof err === 'string' ? err : 'Verifique sua conexão ou tente novamente em instantes.');

      toast({
        title: 'Erro ao gerar comando',
        description,
        variant: 'destructive'
      });
    } finally {
      setIaLoading(false);
    }
  };

  // Generate positive message
  const handleGeneratePositiveMessage = async () => {
    try {
      setGeneratingPositiveMessage(true);
      setPositiveMessage(null);

      const prompt = `Gere uma mensagem motivacional e inspiradora em português do Brasil. 
        A mensagem deve ser:
        - Curta (máximo 2 frases)
        - Poética e bonita
        - Sobre fé, destino, sucesso, perseverança ou crescimento pessoal
        - No estilo da frase: "A fé que vibra no coração é a semente que germina o destino."
        
        Retorne apenas a mensagem, sem aspas ou formatação adicional.`;

      const { data, error } = await supabase.functions.invoke('generate-with-ai', {
        body: { prompt }
      });

      if (error) throw error;

      const generatedMessage = (data as any)?.generatedText || (data as any)?.text || '';

      // Clean the message - remove quotes and extra formatting
      const cleanMessage = generatedMessage
        .replace(/^["']|["']$/g, '') // Remove quotes from start/end
        .replace(/^\s*["""'']\s*|\s*["""'']\s*$/g, '') // Remove fancy quotes
        .trim();

      const finalMessage = cleanMessage || 'Mensagem não disponível no momento.';
      setPositiveMessage(finalMessage);
    } catch (err) {
      console.error('Erro ao gerar mensagem:', err);
      toast({
        title: 'Erro ao gerar mensagem',
        description: 'Tente novamente em alguns momentos.',
        variant: 'destructive'
      });
    } finally {
      setGeneratingPositiveMessage(false);
    }
  };

  // Testimonial navigation
  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se há filtro de categoria, mostrar conteúdo filtrado
  if (categoryFilter && categoryFilter !== 'engenharia') {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <main className="container mx-auto px-4 py-8">
            <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto">
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
                </div>
              </div>

              {/* Content Section */}
              <div className="w-full lg:w-3/4">
                <div className="grid gap-6">
                  {filteredContent.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">Nenhum conteúdo encontrado.</p>
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
                                <Link to={item.type === 'post' ? `/post/${item.slug}` : `/video/${item.slug}`}>
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
      </TooltipProvider>
    );
  }

  // Layout principal da homepage
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="relative min-h-[60vh] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=1920&h=1080&fit=crop')] bg-cover bg-center opacity-20"></div>
          <div className="relative z-10 container mx-auto px-4 text-center">
            <div className={`transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                Conhecimento, Inspiração e Inovação
              </h1>
              <p className="text-xl md:text-2xl mb-8 text-gray-300 max-w-3xl mx-auto">
                Aprenda Autocad Civil 3D, inspire-se com vídeos motivacionais e fique por dentro do universo das criptomoedas.
              </p>
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Explorar Agora
              </Button>
            </div>
          </div>
        </section>

        {/* Seção de Engenharia */}
        <section className="py-16 bg-gray-50 dark:bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-3 gap-8 items-center max-w-7xl mx-auto">
              {/* Coluna 1 - Textos */}
              <div className={`transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-blue-600">
                  Aulas de Autocad Civil 3D
                </h2>
                <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                  Desenvolva suas habilidades em modelagem, projetos de infraestrutura e análise de terrenos com nossas aulas especializadas de Autocad Civil 3D.
                </p>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-all duration-300 bg-white"
                >
                  Saiba Mais
                </Button>
              </div>

              {/* Coluna 2 - Imagem AutoCAD */}
              <div className={`transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'} flex justify-center`}>
                <img 
                  src={civil3dImage} 
                  alt="Autocad Civil 3D" 
                  className="w-full max-w-sm rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
                />
              </div>

              {/* Coluna 3 - Card Engenharia e Designer */}
              <div className={`transition-all duration-1000 delay-400 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
                <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Cog className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-800">
                      Engenharia e Designer
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Gere scripts e comandos para softwares de engenharia usando IA.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Button 
                      onClick={() => {
                        setIaMode('engenharia');
                        setIaOpen(true);
                      }}
                      className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg"
                    >
                      Geração de Comandos por IA
                    </Button>
                    <div className="mt-4 space-y-2">
                      <p className="text-sm text-gray-500">Manuais e Tutoriais (Em Breve...)</p>
                      <p className="text-sm text-gray-500">Projetos de Engenharia Civil (Em Breve...)</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Seção de Vídeos Motivacionais */}
        <section className="py-16 bg-slate-900 text-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-cyan-400">
                Vídeos Motivacionais
              </h2>
              <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
                Encontre inspiração para superar desafios e conquistar seus objetivos com conteúdos motivacionais cuidadosamente selecionados.
              </p>
              
              {/* Botão Gerar Mensagem Positiva */}
              <div className="mb-12">
                <Button 
                  onClick={handleGeneratePositiveMessage}
                  disabled={generatingPositiveMessage}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-8 py-3 rounded-full text-lg font-semibold shadow-lg hover:shadow-purple-500/25 transition-all duration-300"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  {generatingPositiveMessage ? 'Gerando...' : 'Gerar Mensagem Positiva'}
                </Button>
                
                {/* Mensagem Positiva */}
                {positiveMessage && (
                  <div className="mt-8 max-w-2xl mx-auto">
                    <div className="relative">
                      <div className="absolute -inset-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg blur"></div>
                      <blockquote className="relative text-lg md:text-xl font-medium text-cyan-300 leading-relaxed italic px-6 py-4 text-center bg-gray-900/50 rounded-lg border border-purple-500/20">
                        "{positiveMessage}"
                      </blockquote>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cards Motivacionais */}
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <Card className="bg-gradient-to-br from-slate-800 to-slate-700 border-slate-600 hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="h-48 rounded-t-lg overflow-hidden">
                  <img 
                    src={supereLimitesImage} 
                    alt="Supere seus limites" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-6 text-center">
                  <h3 className="text-xl font-bold mb-2 text-white">Supere seus limites</h3>
                  <p className="text-gray-300">Histórias inspiradoras de resiliência e determinação.</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-slate-800 to-slate-700 border-slate-600 hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="h-48 rounded-t-lg overflow-hidden">
                  <img 
                    src={mentalidadeVencedoraImage} 
                    alt="Mentalidade vencedora" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-6 text-center">
                  <h3 className="text-xl font-bold mb-2 text-white">Mentalidade vencedora</h3>
                  <p className="text-gray-300">Aprenda a cultivar pensamentos positivos diariamente.</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-slate-800 to-slate-700 border-slate-600 hover:shadow-xl transition-all duration-300 hover:scale-105">
                <div className="h-48 rounded-t-lg overflow-hidden">
                  <img 
                    src={focoDisciplinaImage} 
                    alt="Foco e disciplina" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardContent className="p-6 text-center">
                  <h3 className="text-xl font-bold mb-2 text-white">Foco e disciplina</h3>
                  <p className="text-gray-300">Descubra como manter a consistência para alcançar seus sonhos.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Seção de Criptomoedas */}
        <section className="py-16 bg-gray-50 dark:bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-3 gap-8 items-center max-w-7xl mx-auto">
              {/* Coluna 1 - Imagem Crypto */}
              <div className={`transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
                <img 
                  src={criptosImage} 
                  alt="Criptomoedas" 
                  className="w-full max-w-md mx-auto rounded-lg shadow-lg"
                />
              </div>

              {/* Coluna 2 - Textos */}
              <div className={`transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-pink-600">
                  Mundo das Criptomoedas
                </h2>
                <p className="text-lg text-gray-700 mb-8 leading-relaxed">
                  Explore análises, tendências e oportunidades no mercado de criptomoedas. Informação confiável e atualizada para quem deseja investir com segurança.
                </p>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-pink-600 text-pink-600 hover:bg-pink-600 hover:text-white transition-all duration-300 bg-white"
                >
                  Ver Conteúdos
                </Button>
              </div>

              {/* Coluna 3 - Card CryptoMoeda */}
              <div className={`transition-all duration-1000 delay-400 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
                <Card className="bg-white border-gray-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CreditCard className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-gray-800">
                      CryptoMoeda + IA
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Tire suas dúvidas sobre criptomoedas e blockchain com nosso assistente.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <Button 
                      onClick={() => {
                        setIaMode('crypto');
                        setIaOpen(true);
                      }}
                      className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 rounded-lg transition-all duration-300 mb-4"
                    >
                      Crypto IA / Pergunte
                    </Button>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">Análise de Gráficos (Em Breve...)</p>
                      <p className="text-sm text-gray-500">Notícias e Atualidades (Em Breve...)</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Seção de Testemunhos */}
        <section className="py-16 bg-slate-900 text-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-cyan-400">
                Testemunhos
              </h2>
            </div>

            <div className="max-w-4xl mx-auto">
              <Card className="bg-slate-800 border-slate-700 p-8">
                <CardContent className="text-center">
                  <div className="mb-6">
                    <img 
                      src={testimonials[currentTestimonial].avatar}
                      alt={testimonials[currentTestimonial].name}
                      className="w-20 h-20 rounded-full mx-auto mb-4 object-cover"
                    />
                  </div>
                  
                  <blockquote className="text-xl md:text-2xl font-medium text-white mb-6 leading-relaxed">
                    "{testimonials[currentTestimonial].message}"
                  </blockquote>
                  
                  <div className="text-cyan-400 font-semibold text-lg">
                    {testimonials[currentTestimonial].name}
                  </div>
                  <div className="text-gray-400">
                    {testimonials[currentTestimonial].role}
                  </div>

                  {/* Navigation */}
                  <div className="flex justify-center items-center mt-8 space-x-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={prevTestimonial}
                      className="text-cyan-400 hover:text-cyan-300 hover:bg-slate-700"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    
                    <div className="flex space-x-2">
                      {testimonials.map((_, index) => (
                        <div 
                          key={index}
                          className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            index === currentTestimonial ? 'bg-cyan-400' : 'bg-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={nextTestimonial}
                      className="text-cyan-400 hover:text-cyan-300 hover:bg-slate-700"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-950 text-white py-12">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <div>
                <h3 className="text-xl font-bold mb-4 text-cyan-400">Ivo Fernandes News</h3>
                <p className="text-gray-300">
                  Unindo tecnologia, inspiração e informação em um só lugar.
                </p>
              </div>
              
              <div>
                <h3 className="text-xl font-bold mb-4 text-cyan-400">Navegação</h3>
                <ul className="space-y-2 text-gray-300">
                  <li>Autocad Civil 3D</li>
                  <li>Motivacionais</li>
                  <li>Criptomoedas</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-xl font-bold mb-4 text-cyan-400">Contato</h3>
                <p className="text-gray-300">
                  Email: contato@ivoferrandesnews.com
                </p>
              </div>
            </div>
            
            <div className="border-t border-slate-800 mt-8 pt-8 text-center text-gray-400">
              © 2025 Ivo Fernandes News - Todos os direitos reservados
            </div>
          </div>
        </footer>

        {/* IA Commands Dialog */}
        <Dialog open={iaOpen} onOpenChange={setIaOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Assistente IA - {iaMode === 'engenharia' ? 'Engenharia' : iaMode === 'crypto' ? 'Criptomoedas' : 'Crescimento Pessoal'}
              </DialogTitle>
              <DialogDescription>
                {iaMode === 'engenharia' && 'Gere comandos e scripts para ferramentas de engenharia'}
                {iaMode === 'crypto' && 'Tire dúvidas sobre criptomoedas e blockchain'}
                {iaMode === 'growth' && 'Receba conselhos de crescimento pessoal e produtividade'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Textarea
                placeholder={
                  iaMode === 'engenharia' 
                    ? 'Ex: Como criar um script para automatizar a criação de perfis longitudinais no AutoCAD Civil 3D?'
                    : iaMode === 'crypto'
                    ? 'Ex: Qual a diferença entre Bitcoin e Ethereum?'
                    : 'Ex: Como posso melhorar minha produtividade no trabalho?'
                }
                value={iaPrompt}
                onChange={(e) => setIaPrompt(e.target.value)}
                rows={4}
              />

              <Button
                onClick={handleGenerateIaCommand}
                disabled={iaLoading}
                className="w-full"
              >
                {iaLoading ? 'Gerando...' : 'Gerar Resposta'}
              </Button>

              {iaResult && (
                <div className="mt-6 p-4 border rounded-lg bg-muted/50">
                  <h4 className="font-semibold mb-2">Resposta da IA:</h4>
                  <div 
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: iaResult }}
                  />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}