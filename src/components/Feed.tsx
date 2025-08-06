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
  const [searchParams, setSearchParams] = useSearchParams();
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'posts' | 'videos'>('all');
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const categoryFilter = searchParams.get('category') || '';

  // Initialize search query from URL
  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
  }, [searchParams]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Special layout for engineering category
  if (categoryFilter === 'engenharia') {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 w-full overflow-x-hidden">
          <main className="container mx-auto px-4 py-16 max-w-6xl">
            {/* Hero Section */}
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Explore o Futuro com Tecnologia e Conhecimento
              </h1>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Aprenda, evolua e acompanhe o crescimento do nosso ativo digital.
              </p>
              <Button className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-8 py-3 rounded-full text-lg font-semibold">
                Gerar Mensagem Positiva
              </Button>
            </div>

            {/* Three Cards Section */}
            <div className="grid md:grid-cols-3 gap-8">
              {/* Engenharia e Designer */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <div className="text-white text-2xl">⚙️</div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    Engenharia e Designer
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Gere scripts e comandos para softwares de engenharia usando IA.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Button className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white py-3 rounded-lg font-semibold">
                    Geração de Comandos por IA
                  </Button>
                  <Button variant="secondary" className="w-full bg-slate-700 hover:bg-slate-600 text-gray-300 py-3 rounded-lg">
                    Manuais e Tutoriais
                  </Button>
                  <Button variant="secondary" className="w-full bg-slate-700 hover:bg-slate-600 text-gray-300 py-3 rounded-lg">
                    Projetos de Engenharia Civil
                  </Button>
                </div>
              </div>

              {/* CryptoMoeda + IA */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <div className="text-white text-2xl">🧠</div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    CryptoMoeda + IA
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Tire suas dúvidas sobre criptomoedas e blockchain com nosso assistente.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Button className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-3 rounded-lg font-semibold">
                    Crypto IA / Pergunte
                  </Button>
                  <Button variant="secondary" className="w-full bg-slate-700 hover:bg-slate-600 text-gray-300 py-3 rounded-lg">
                    Análise de Gráficos
                  </Button>
                  <Button variant="secondary" className="w-full bg-slate-700 hover:bg-slate-600 text-gray-300 py-3 rounded-lg">
                    Notícias e Atualidades
                  </Button>
                </div>
              </div>

              {/* Conteúdo + Motivação */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <div className="text-white text-2xl">💭</div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3">
                    Conteúdo + Motivação
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Receba conselhos e insights para seu desenvolvimento pessoal e carreira.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Button className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white py-3 rounded-lg font-semibold">
                    Crescimento Pessoal IA
                  </Button>
                  <Button variant="secondary" className="w-full bg-slate-700 hover:bg-slate-600 text-gray-300 py-3 rounded-lg">
                    Atualidades IA
                  </Button>
                  <Button variant="secondary" className="w-full bg-slate-700 hover:bg-slate-600 text-gray-300 py-3 rounded-lg">
                    Conteúdo Vlog
                  </Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </TooltipProvider>
    );
  }

  // Special layout for crypto category
  if (categoryFilter === 'crypto') {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 w-full overflow-x-hidden">
          <main className="container mx-auto px-4 py-16 max-w-6xl">
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                🚀 Mundo das Criptomoedas
              </h1>
              <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
                Descubra o universo das moedas digitais, blockchain e o futuro das finanças descentralizadas.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 mb-16">
              <div className="bg-gradient-to-br from-purple-800/30 to-blue-800/30 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30">
                <h2 className="text-2xl font-bold text-white mb-4">📈 Análise de Mercado</h2>
                <p className="text-gray-300 mb-6">
                  Acompanhe as tendências do mercado cripto com análises técnicas e fundamentais atualizadas diariamente.
                </p>
                <ul className="space-y-2 text-gray-400">
                  <li>• Bitcoin e principais altcoins</li>
                  <li>• Indicadores técnicos avançados</li>
                  <li>• Previsões e projeções</li>
                  <li>• Análise de sentimento do mercado</li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-blue-800/30 to-cyan-800/30 backdrop-blur-sm rounded-2xl p-8 border border-blue-500/30">
                <h2 className="text-2xl font-bold text-white mb-4">🔗 Tecnologia Blockchain</h2>
                <p className="text-gray-300 mb-6">
                  Entenda a tecnologia por trás das criptomoedas e como ela está revolucionando diversos setores.
                </p>
                <ul className="space-y-2 text-gray-400">
                  <li>• Conceitos fundamentais</li>
                  <li>• Smart Contracts e DApps</li>
                  <li>• NFTs e Metaverso</li>
                  <li>• DeFi e protocolos emergentes</li>
                </ul>
              </div>
            </div>

            <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 backdrop-blur-sm rounded-2xl p-8 border border-yellow-500/30 mb-12">
              <h2 className="text-3xl font-bold text-white text-center mb-6">💡 Dicas de Investimento</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-4xl mb-4">🛡️</div>
                  <h3 className="text-lg font-semibold text-white mb-2">Segurança</h3>
                  <p className="text-gray-400 text-sm">Proteja seus ativos com carteiras seguras e boas práticas.</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-4">📊</div>
                  <h3 className="text-lg font-semibold text-white mb-2">Diversificação</h3>
                  <p className="text-gray-400 text-sm">Distribua riscos com um portfólio balanceado.</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl mb-4">🎯</div>
                  <h3 className="text-lg font-semibold text-white mb-2">Estratégia</h3>
                  <p className="text-gray-400 text-sm">Defina objetivos claros e mantenha disciplina.</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </TooltipProvider>
    );
  }

  // Special layout for music category
  if (categoryFilter === 'musica') {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-slate-900 w-full overflow-x-hidden">
          <main className="container mx-auto px-4 py-16 max-w-6xl">
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                🎵 Universo Musical
              </h1>
              <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
                Explore a música em todas as suas formas: produção, teoria, tecnologia e cultura musical.
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 mb-16">
              <div className="bg-gradient-to-br from-pink-800/40 to-purple-800/40 backdrop-blur-sm rounded-2xl p-6 border border-pink-500/30">
                <h2 className="text-xl font-bold text-white mb-4">🎛️ Produção Musical</h2>
                <ul className="space-y-3 text-gray-300">
                  <li>• Home Studio Setup</li>
                  <li>• DAWs e Plugins</li>
                  <li>• Mixagem e Masterização</li>
                  <li>• Gravação e Edição</li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-purple-800/40 to-blue-800/40 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/30">
                <h2 className="text-xl font-bold text-white mb-4">🎼 Teoria Musical</h2>
                <ul className="space-y-3 text-gray-300">
                  <li>• Harmonia e Melodia</li>
                  <li>• Escalas e Acordes</li>
                  <li>• Composição</li>
                  <li>• Análise Musical</li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-blue-800/40 to-cyan-800/40 backdrop-blur-sm rounded-2xl p-6 border border-blue-500/30">
                <h2 className="text-xl font-bold text-white mb-4">🎸 Instrumentos</h2>
                <ul className="space-y-3 text-gray-300">
                  <li>• Guitarra e Baixo</li>
                  <li>• Piano e Teclados</li>
                  <li>• Bateria e Percussão</li>
                  <li>• Instrumentos Virtuais</li>
                </ul>
              </div>
            </div>

            <div className="bg-gradient-to-r from-orange-600/20 to-red-600/20 backdrop-blur-sm rounded-2xl p-8 border border-orange-500/30">
              <h2 className="text-3xl font-bold text-white text-center mb-8">🌟 Tendências Musicais</h2>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">🎧 Streaming e Distribuição</h3>
                  <p className="text-gray-300 mb-4">
                    Como artistas independentes podem alcançar milhões de ouvintes através das plataformas digitais.
                  </p>
                  <ul className="text-gray-400 space-y-1">
                    <li>• Spotify, Apple Music, YouTube Music</li>
                    <li>• Marketing musical digital</li>
                    <li>• Monetização e royalties</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">🤖 IA na Música</h3>
                  <p className="text-gray-300 mb-4">
                    Inteligência artificial está revolucionando a criação, produção e distribuição musical.
                  </p>
                  <ul className="text-gray-400 space-y-1">
                    <li>• Composição assistida por IA</li>
                    <li>• Masterização automática</li>
                    <li>• Recomendações personalizadas</li>
                  </ul>
                </div>
              </div>
            </div>
          </main>
        </div>
      </TooltipProvider>
    );
  }

  // Special layout for motivational category
  if (categoryFilter === 'motivacional') {
    return (
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-orange-900 via-red-900 to-slate-900 w-full overflow-x-hidden">
          <main className="container mx-auto px-4 py-16 max-w-6xl">
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                🔥 Crescimento Pessoal
              </h1>
              <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
                Desenvolva seu potencial máximo com estratégias comprovadas de produtividade, liderança e sucesso.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-16">
              <div className="bg-gradient-to-br from-orange-800/40 to-red-800/40 backdrop-blur-sm rounded-2xl p-8 border border-orange-500/30">
                <h2 className="text-2xl font-bold text-white mb-6">🎯 Produtividade</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="text-orange-400 text-xl">⏰</span>
                    <div>
                      <h3 className="font-semibold text-white">Gestão de Tempo</h3>
                      <p className="text-gray-400 text-sm">Técnicas como Pomodoro, Time Blocking e GTD</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-orange-400 text-xl">🧠</span>
                    <div>
                      <h3 className="font-semibold text-white">Foco e Concentração</h3>
                      <p className="text-gray-400 text-sm">Elimine distrações e maximize sua performance</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-orange-400 text-xl">📈</span>
                    <div>
                      <h3 className="font-semibold text-white">Hábitos de Sucesso</h3>
                      <p className="text-gray-400 text-sm">Construa rotinas que levam a resultados extraordinários</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-800/40 to-pink-800/40 backdrop-blur-sm rounded-2xl p-8 border border-red-500/30">
                <h2 className="text-2xl font-bold text-white mb-6">🚀 Liderança</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="text-red-400 text-xl">💪</span>
                    <div>
                      <h3 className="font-semibold text-white">Autoconfiança</h3>
                      <p className="text-gray-400 text-sm">Desenvolva uma mentalidade de crescimento</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-red-400 text-xl">🤝</span>
                    <div>
                      <h3 className="font-semibold text-white">Comunicação</h3>
                      <p className="text-gray-400 text-sm">Habilidades para inspirar e influenciar pessoas</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-red-400 text-xl">🎖️</span>
                    <div>
                      <h3 className="font-semibold text-white">Tomada de Decisão</h3>
                      <p className="text-gray-400 text-sm">Estratégias para decisões assertivas e rápidas</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 mb-12">
              <div className="bg-gradient-to-b from-yellow-600/30 to-orange-600/30 backdrop-blur-sm rounded-xl p-6 border border-yellow-500/30 text-center">
                <div className="text-4xl mb-4">🏆</div>
                <h3 className="text-lg font-bold text-white mb-2">Metas e Objetivos</h3>
                <p className="text-gray-400 text-sm">Defina, planeje e alcance seus sonhos com metodologias comprovadas.</p>
              </div>
              <div className="bg-gradient-to-b from-green-600/30 to-emerald-600/30 backdrop-blur-sm rounded-xl p-6 border border-green-500/30 text-center">
                <div className="text-4xl mb-4">💰</div>
                <h3 className="text-lg font-bold text-white mb-2">Inteligência Financeira</h3>
                <p className="text-gray-400 text-sm">Estratégias para construir riqueza e liberdade financeira.</p>
              </div>
              <div className="bg-gradient-to-b from-blue-600/30 to-indigo-600/30 backdrop-blur-sm rounded-xl p-6 border border-blue-500/30 text-center">
                <div className="text-4xl mb-4">🧘</div>
                <h3 className="text-lg font-bold text-white mb-2">Bem-estar Mental</h3>
                <p className="text-gray-400 text-sm">Cuide da sua saúde mental e emocional para uma vida plena.</p>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 backdrop-blur-sm rounded-2xl p-8 border border-purple-500/30">
              <h2 className="text-2xl font-bold text-white text-center mb-6">📚 Biblioteca de Crescimento</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">📖 Livros Recomendados</h3>
                  <ul className="text-gray-300 space-y-1">
                    <li>• Hábitos Atômicos - James Clear</li>
                    <li>• Mindset - Carol Dweck</li>
                    <li>• O Poder do Agora - Eckhart Tolle</li>
                    <li>• Pai Rico, Pai Pobre - Robert Kiyosaki</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">🎧 Podcasts Inspiradores</h3>
                  <ul className="text-gray-300 space-y-1">
                    <li>• Flow Podcast</li>
                    <li>• PodPeople</li>
                    <li>• Mais1 Podcast</li>
                    <li>• Café da Manhã</li>
                  </ul>
                </div>
              </div>
            </div>
          </main>
        </div>
      </TooltipProvider>
    );
  }

  // Default layout for "Notícias" (main page) - shows cards
  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 w-full overflow-x-hidden">
        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 max-w-full">
          {/* Search Bar */}
          <div className="mb-6 flex justify-center">
            <form onSubmit={(e) => {
              e.preventDefault();
              const newParams = new URLSearchParams(searchParams);
              if (searchQuery.trim()) {
                newParams.set('search', searchQuery.trim());
              } else {
                newParams.delete('search');
              }
              setSearchParams(newParams);
            }} className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar conteúdo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </form>
          </div>

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
                           <span className="truncate">{item.author?.display_name}</span>
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