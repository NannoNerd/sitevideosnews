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
import { Heart, MessageCircle, Eye, Search, Plus, Settings, User, Cog, CreditCard, Brain, Sparkles } from 'lucide-react';
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
  const {
    user,
    signOut
  } = useAuth();
  const {
    toast
  } = useToast();
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

  // Positive Message Modal state
  const [positiveMessageOpen, setPositiveMessageOpen] = useState(false);
  const [positiveMessage, setPositiveMessage] = useState<string | null>(null);
  const [generatingPositiveMessage, setGeneratingPositiveMessage] = useState(false);

  // Initialize search query from URL and set mounted state
  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
    setMounted(true);
  }, [searchParams]);
  const fetchContent = async () => {
    try {
      // Build posts query
      let postsQuery = supabase.from('posts').select(`
          *,
          categories(name, slug)
        `).eq('published', true);

      // Add category filter if specified
      if (categoryFilter) {
        postsQuery = postsQuery.eq('categories.slug', categoryFilter);
      }
      const {
        data: posts,
        error: postsError
      } = await postsQuery.order('published_at', {
        ascending: false
      }).limit(10);
      if (postsError) throw postsError;

      // Build videos query
      let videosQuery = supabase.from('videos').select(`
          *,
          categories(name, slug)
        `).eq('published', true);

      // Add category filter if specified
      if (categoryFilter) {
        videosQuery = videosQuery.eq('categories.slug', categoryFilter);
      }
      const {
        data: videos,
        error: videosError
      } = await videosQuery.order('published_at', {
        ascending: false
      }).limit(10);
      if (videosError) throw videosError;

      // Get unique author IDs
      const authorIds = [...(posts || []).map(p => p.author_id), ...(videos || []).map(v => v.author_id)].filter((id, index, arr) => arr.indexOf(id) === index);

      // Fetch author profiles
      const {
        data: profiles,
        error: profilesError
      } = await supabase.from('profiles').select('user_id, display_name, avatar_url').in('user_id', authorIds);
      if (profilesError) throw profilesError;

      // Create author lookup map
      const authorMap = (profiles || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);

      // Combine and sort content
      const allContent: ContentItem[] = [...(posts || []).map(post => ({
        ...post,
        type: 'post' as const,
        category: post.categories || {
          name: 'Sem categoria',
          slug: ''
        },
        author: {
          display_name: authorMap[post.author_id]?.display_name || 'Anônimo',
          avatar_url: authorMap[post.author_id]?.avatar_url
        }
      })), ...(videos || []).map(video => ({
        ...video,
        type: 'video' as const,
        category: video.categories || {
          name: 'Sem categoria',
          slug: ''
        },
        author: {
          display_name: authorMap[video.author_id]?.display_name || 'Anônimo',
          avatar_url: authorMap[video.author_id]?.avatar_url
        }
      }))].sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
      setContent(allContent);

      // Fetch user likes if authenticated
      if (user) {
        const contentIds = allContent.map(item => item.id);
        const {
          data: likes
        } = await supabase.from('likes').select('post_id, video_id').eq('user_id', user.id).or(`post_id.in.(${contentIds.join(',')}),video_id.in.(${contentIds.join(',')})`);
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
        await supabase.from('likes').delete().eq(foreignKey, item.id).eq('user_id', user.id);

        // Update UI
        setUserLikes(prev => {
          const newSet = new Set(prev);
          newSet.delete(item.id);
          return newSet;
        });
        setContent(prev => prev.map(contentItem => contentItem.id === item.id ? {
          ...contentItem,
          likes_count: contentItem.likes_count - 1
        } : contentItem));
      } else {
        // Add like
        await supabase.from('likes').insert({
          [foreignKey]: item.id,
          user_id: user.id
        });

        // Update UI
        setUserLikes(prev => new Set([...prev, item.id]));
        setContent(prev => prev.map(contentItem => contentItem.id === item.id ? {
          ...contentItem,
          likes_count: contentItem.likes_count + 1
        } : contentItem));
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
    const commentsChannel = supabase.channel('comments-updates').on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'comments'
    }, () => {
      // Refetch content to update comment counts
      fetchContent();
    }).on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'posts'
    }, () => {
      // Refetch content when posts are updated (for comment counts)
      fetchContent();
    }).on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'videos'
    }, () => {
      // Refetch content when videos are updated (for comment counts)
      fetchContent();
    }).subscribe();
    return () => {
      supabase.removeChannel(commentsChannel);
    };
  }, [user, categoryFilter]);
  const filteredContent = content.filter(item => {
    const matchesFilter = filter === 'all' || filter === 'posts' && item.type === 'post' || filter === 'videos' && item.type === 'video';
    const matchesSearch = searchQuery === '' || item.title.toLowerCase().includes(searchQuery.toLowerCase()) || (item.content || item.description || '').toLowerCase().includes(searchQuery.toLowerCase());
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
      const {
        data,
        error
      } = await supabase.functions.invoke('generate-with-ai', {
        body: {
          prompt: fullPrompt
        }
      });
      if (error) throw error;
      const generated = (data as any)?.generatedText || (data as any)?.text || '';

      // Fallback: se não vier em HTML, converte marcações básicas e quebra de linhas
      let html = generated;
      if (!/<[a-z][\s\S]*>/i.test(html)) {
        html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/__([^_]+)__/g, '<strong>$1</strong>').replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/_([^_]+)_/g, '<em>$1</em>').replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br />');
        html = `<p>${html}</p>`;
      }
      setIaResult(html);
    } catch (err) {
      console.error('Erro ao gerar comando:', err);
      const ctx = (err as any)?.context;
      const providerMessage = ctx?.response?.text || (typeof ctx?.body === 'string' ? ctx.body : undefined) || (ctx?.response?.error ? JSON.stringify(ctx.response.error) : undefined);
      const description = providerMessage || (err as any)?.message || (typeof err === 'string' ? err : 'Verifique sua conexão ou tente novamente em instantes.');
      toast({
        title: 'Erro ao gerar comando',
        description,
        variant: 'destructive'
      });
    } finally {
      setIaLoading(false);
    }
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }

  // Special layout for engineering category - Modern Redesign
  if (categoryFilter === 'engenharia') {
    return <TooltipProvider>
        <div className="min-h-screen w-full bg-background overflow-x-hidden">
          <main className="mx-auto w-full px-4 py-8 max-w-[95vw] md:max-w-[85vw] lg:max-w-[1400px]">
            
            {/* Hero Section */}
            <section className={`relative mb-24 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="text-center space-y-8">
                {/* Floating Icons */}
                <div className="flex justify-center items-center space-x-12 mb-12">
                  <div className="animate-float" style={{ animationDelay: '0s' }}>
                    <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg hover-lift">
                      <Cog className="w-10 h-10 text-primary-foreground" />
                    </div>
                  </div>
                  <div className="animate-float" style={{ animationDelay: '0.7s' }}>
                    <div className="w-20 h-20 bg-gradient-to-br from-secondary to-secondary/80 rounded-full flex items-center justify-center shadow-lg hover-lift">
                      <CreditCard className="w-10 h-10 text-secondary-foreground" />
                    </div>
                  </div>
                  <div className="animate-float" style={{ animationDelay: '1.4s' }}>
                    <div className="w-20 h-20 bg-gradient-to-br from-accent to-accent/80 rounded-full flex items-center justify-center shadow-lg hover-lift">
                      <Brain className="w-10 h-10 text-accent-foreground" />
                    </div>
                  </div>
                </div>

                {/* Main Title */}
                <div className="space-y-6">
                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold gradient-text leading-tight">
                    Engenharia & Arquitetura
                  </h1>
                  <p className="text-xl md:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
                    Transforme ideias em realidade com tecnologia de ponta, IA generativa e metodologias modernas de projeto
                  </p>
                </div>

                {/* CTA Section */}
                <div className="flex flex-col items-center space-y-6">
                  <Button 
                    onClick={async () => {
                      try {
                        setGeneratingPositiveMessage(true);
                        setPositiveMessage(null);
                        const prompt = `Gere uma mensagem motivacional e inspiradora em português do Brasil sobre engenharia e arquitetura. 
                            A mensagem deve ser:
                            - Curta (máximo 2 frases)
                            - Poética e bonita
                            - Sobre inovação, criação, construir o futuro ou transformar ideias em realidade
                            - No estilo: "Cada projeto é uma ponte entre sonhos e realidade, construída com precisão e paixão."
                            
                            Retorne apenas a mensagem, sem aspas ou formatação adicional.`;
                        const { data, error } = await supabase.functions.invoke('generate-with-ai', {
                          body: { prompt }
                        });
                        if (error) throw error;
                        const generatedMessage = (data as any)?.generatedText || (data as any)?.text || '';
                        const cleanMessage = generatedMessage
                          .replace(/^["']|["']$/g, '')
                          .replace(/^\s*["""'']\s*|\s*["""'']\s*$/g, '')
                          .trim();
                        setPositiveMessage(cleanMessage || 'Inspire-se para criar o extraordinário.');
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
                    }}
                    disabled={generatingPositiveMessage}
                    size="lg"
                    className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-primary-foreground px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-primary/25 hover-lift transition-all duration-300"
                  >
                    <Sparkles className="w-5 h-5 mr-2" />
                    {generatingPositiveMessage ? 'Gerando Inspiração...' : 'Gerar Mensagem Inspiradora'}
                  </Button>

                  {/* Inspirational Message Display */}
                  {positiveMessage && (
                    <div className="animate-fade-in mt-8 max-w-3xl mx-auto">
                      <Card className="bg-gradient-to-r from-card/50 to-card/30 border-primary/20 backdrop-blur-sm">
                        <CardContent className="p-8">
                          <blockquote className="text-xl md:text-2xl font-medium text-center text-primary italic leading-relaxed">
                            "{positiveMessage}"
                          </blockquote>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Main Features Grid */}
            <section className={`mb-24 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="grid lg:grid-cols-3 gap-8">
                
                {/* Engineering Tools */}
                <Card className="group hover:shadow-xl hover:shadow-primary/10 transition-all duration-500 hover-lift overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <CardHeader className="relative z-10 text-center pb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <Cog className="w-8 h-8 text-primary-foreground animate-spin-slow" />
                    </div>
                    <CardTitle className="text-2xl mb-3 group-hover:text-primary transition-colors duration-300">
                      Ferramentas de Engenharia
                    </CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      Scripts automatizados e comandos inteligentes para softwares profissionais de engenharia
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button 
                      onClick={() => { setIaMode('engenharia'); setIaOpen(true); }}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground hover-lift shadow-md"
                    >
                      Geração de Comandos por IA
                    </Button>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Suporte para:</div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="text-xs">AutoCAD</Badge>
                        <Badge variant="secondary" className="text-xs">Revit</Badge>
                        <Badge variant="secondary" className="text-xs">SAP2000</Badge>
                        <Badge variant="secondary" className="text-xs">MATLAB</Badge>
                        <Badge variant="secondary" className="text-xs">Python</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Architecture & Design */}
                <Card className="group hover:shadow-xl hover:shadow-secondary/10 transition-all duration-500 hover-lift overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <CardHeader className="relative z-10 text-center pb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-secondary to-secondary/80 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <User className="w-8 h-8 text-secondary-foreground" />
                    </div>
                    <CardTitle className="text-2xl mb-3 group-hover:text-secondary transition-colors duration-300">
                      Arquitetura & Design
                    </CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      Projetos arquitetônicos modernos, sustentabilidade e design centrado no usuário
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className="w-2 h-2 bg-secondary rounded-full" />
                        <span className="text-sm font-medium">Arquitetura Sustentável</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className="w-2 h-2 bg-secondary rounded-full" />
                        <span className="text-sm font-medium">Design Paramétrico</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className="w-2 h-2 bg-secondary rounded-full" />
                        <span className="text-sm font-medium">BIM e Modelagem 3D</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className="w-2 h-2 bg-secondary rounded-full" />
                        <span className="text-sm font-medium">Eficiência Energética</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* AI & Innovation */}
                <Card className="group hover:shadow-xl hover:shadow-accent/10 transition-all duration-500 hover-lift overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <CardHeader className="relative z-10 text-center pb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-accent to-accent/80 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                      <Brain className="w-8 h-8 text-accent-foreground" />
                    </div>
                    <CardTitle className="text-2xl mb-3 group-hover:text-accent transition-colors duration-300">
                      IA & Inovação
                    </CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      Inteligência artificial aplicada ao desenvolvimento pessoal e soluções criativas
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Button 
                      onClick={() => { setIaMode('crypto'); setIaOpen(true); }}
                      className="w-full bg-accent hover:bg-accent/90 text-accent-foreground hover-lift shadow-md"
                    >
                      Crypto IA / Pergunte
                    </Button>
                    <Button 
                      onClick={() => { setIaMode('growth'); setIaOpen(true); }}
                      className="w-full bg-accent/80 hover:bg-accent text-accent-foreground hover-lift shadow-md"
                    >
                      Crescimento Pessoal IA
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Technical Specializations */}
            <section className={`mb-24 transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="text-center mb-16">
                <h2 className="text-4xl md:text-5xl font-bold gradient-text mb-6">Especialidades Técnicas</h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Explore as principais áreas de atuação em engenharia e arquitetura moderna
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { title: "Engenharia Civil", icon: "🏗️", topics: ["Estruturas", "Fundações", "Concreto Armado", "Análise Estrutural"] },
                  { title: "Arquitetura", icon: "🏛️", topics: ["Projeto Arquitetônico", "Urbanismo", "Paisagismo", "Patrimônio"] },
                  { title: "Engenharia Elétrica", icon: "⚡", topics: ["Sistemas de Potência", "Automação", "Eletrônica", "Energia Renovável"] },
                  { title: "Engenharia Mecânica", icon: "⚙️", topics: ["Termodinâmica", "Mecânica dos Fluidos", "Projetos Mecânicos", "CAD/CAM"] }
                ].map((spec, index) => (
                  <Card key={index} className="group hover:shadow-lg hover-lift transition-all duration-300">
                    <CardHeader className="text-center pb-4">
                      <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                        {spec.icon}
                      </div>
                      <CardTitle className="text-lg font-semibold mb-2">{spec.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {spec.topics.map((topic, topicIndex) => (
                          <div key={topicIndex} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                            {topic}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Testimonials */}
            <section className={`mb-24 transition-all duration-1000 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <Card className="bg-gradient-to-r from-card/50 to-card/30 backdrop-blur-sm border-muted/50">
                <CardContent className="p-12">
                  <div className="text-center mb-12">
                    <h2 className="text-4xl font-bold gradient-text mb-4">Depoimentos</h2>
                    <p className="text-xl text-muted-foreground">O que profissionais da área estão dizendo</p>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-8">
                    {[
                      {
                        name: "Mariana Silva",
                        role: "Engenheira Civil",
                        image: "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150&h=150&fit=crop&crop=face",
                        quote: "As ferramentas de IA para engenharia revolucionaram meu fluxo de trabalho. Economizo horas na criação de scripts."
                      },
                      {
                        name: "Carlos Mendes",
                        role: "Arquiteto",
                        image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
                        quote: "A integração entre arquitetura sustentável e tecnologia aqui é impressionante. Conteúdo de altíssima qualidade."
                      },
                      {
                        name: "Ana Costa",
                        role: "Engenheira Elétrica",
                        image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
                        quote: "O suporte para automação e a geração de comandos me ajudou muito nos projetos industriais. Recomendo!"
                      }
                    ].map((testimonial, index) => (
                      <div key={index} className="text-center group">
                        <div className="relative mb-6">
                          <img 
                            src={testimonial.image} 
                            alt={testimonial.name}
                            className="w-20 h-20 rounded-full mx-auto object-cover border-4 border-primary/20 group-hover:border-primary/40 transition-colors duration-300"
                          />
                        </div>
                        <blockquote className="text-sm italic text-muted-foreground mb-4 leading-relaxed">
                          "{testimonial.quote}"
                        </blockquote>
                        <div>
                          <div className="font-semibold text-foreground">{testimonial.name}</div>
                          <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Footer */}
            <footer className="text-center py-8 border-t border-border">
              <p className="text-muted-foreground">
                © 2025 Ivo Fernandes. Transformando ideias em realidade através da engenharia.
              </p>
            </footer>

            {/* IA Commands Dialog */}
            <Dialog open={iaOpen} onOpenChange={setIaOpen}>
              <DialogContent className="sm:max-w-[680px] bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-foreground">
                    {iaMode === 'engenharia' ? 'Geração de Comandos por IA' : 
                     iaMode === 'crypto' ? 'Crypto IA — Pergunte' : 'Crescimento Pessoal IA'}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    {iaMode === 'engenharia' ? 
                      'Descreva a tarefa ou comando que você precisa e nossa IA gerará o script ou instruções para ferramentas de engenharia.' : 
                      iaMode === 'crypto' ? 
                      'Faça sua pergunta sobre criptomoedas e blockchain (educacional, sem aconselhamento financeiro).' : 
                      'Peça conselhos práticos de produtividade, hábitos e carreira.'}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <Textarea 
                    value={iaPrompt} 
                    onChange={e => setIaPrompt(e.target.value)} 
                    placeholder={
                      iaMode === 'engenharia' ? 
                      "Ex: 'Gerar um script Python para automatizar a criação de camadas no AutoCAD'; 'Comando para criar uma parede de 20cm no Revit'; 'Modelar uma viga no SAP2000'" :
                      iaMode === 'crypto' ?
                      "Ex: 'O que é staking e quais os riscos?'; 'Como funciona a rede Ethereum e o gas?'; 'Diferença entre token e coin?'; 'Como guardar minhas chaves com segurança?'" :
                      "Ex: 'Como montar uma rotina matinal produtiva?'; 'Técnicas para foco profundo (deep work)?'; 'Como criar o hábito de estudar diariamente?'; 'Framework para metas SMART?'"
                    }
                    className="min-h-[140px] bg-muted/50 text-foreground placeholder:text-muted-foreground border-border"
                  />

                  <div className="flex items-center gap-3">
                    <Button 
                      onClick={handleGenerateIaCommand} 
                      disabled={iaLoading} 
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      {iaLoading ? 'Gerando...' : 
                       iaMode === 'engenharia' ? 'Gerar Comando' : 
                       iaMode === 'crypto' ? 'Pergunte IA' : 'Gerar Dica'}
                    </Button>
                    <Button 
                      variant="secondary" 
                      onClick={() => setIaOpen(false)}
                      className="bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                    >
                      Fechar
                    </Button>
                  </div>

                  {iaResult && (
                    <Card className="mt-4 border-border bg-muted/20">
                      <CardHeader className="pb-2">
                        <div className="text-sm font-medium text-foreground">Resultado</div>
                      </CardHeader>
                      <CardContent>
                        <div 
                          className="max-h-[320px] overflow-auto text-sm text-foreground leading-relaxed space-y-3 
                                   [&_h2]:text-foreground [&_h2]:text-lg [&_h2]:font-semibold 
                                   [&_h3]:text-foreground [&_ul]:list-disc [&_ul]:pl-6 
                                   [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded 
                                   [&_pre]:bg-muted [&_pre]:p-3 [&_pre]:rounded" 
                          dangerouslySetInnerHTML={{ __html: iaResult }} 
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>

                <DialogFooter />
              </DialogContent>
            </Dialog>
          </main>
        </div>
      </TooltipProvider>;
  }

  // Special layout for crypto category
  if (categoryFilter === 'crypto') {
    return <TooltipProvider>
        <div className="min-h-screen w-full overflow-x-hidden" style={{
        backgroundColor: '#0f172a'
      }}>
            <main className="mx-auto w-full px-4 py-8 max-w-[95vw] md:max-w-[70vw]">
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
      </TooltipProvider>;
  }

  // Special layout for music category
  if (categoryFilter === 'musica') {
    return <TooltipProvider>
        <div className="min-h-screen w-full overflow-x-hidden" style={{
        backgroundColor: '#0f172a'
      }}>
            <main className="mx-auto w-full px-4 py-8 max-w-[95vw] md:max-w-[70vw]">
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
      </TooltipProvider>;
  }

  // Special layout for motivational category
  if (categoryFilter === 'motivacional') {
    return <TooltipProvider>
        <div className="min-h-screen w-full overflow-x-hidden" style={{
        backgroundColor: '#0f172a'
      }}>
            <main className="mx-auto w-full px-4 py-8 max-w-[95vw] md:max-w-[70vw]">
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
      </TooltipProvider>;
  }

  // Default layout for "Notícias" (main page) - shows cards
  return <TooltipProvider>
      <div className="min-h-screen w-full overflow-x-hidden" style={{
      backgroundColor: '#0f172a'
    }}>
        {/* Main Content */}
        <main className="container mx-auto px-4 py-8 max-w-full">
          {/* Search Bar */}
          <div className="mb-6 flex justify-center">
            <form onSubmit={e => {
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
              <Input placeholder="Buscar conteúdo..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-10" />
            </form>
          </div>

          <div className="mb-6 flex justify-center">
            <Tabs value={filter} onValueChange={value => setFilter(value as any)}>
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="posts">Notícias</TabsTrigger>
                <TabsTrigger value="videos">Vídeos</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Search Results Info */}
          {searchQuery && <div className="mb-4 text-center text-muted-foreground">
              <p>{filteredContent.length} resultado(s) para o termo "{searchQuery}"</p>
            </div>}

          {filteredContent.length === 0 ? <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhum conteúdo encontrado.</p>
            </div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1200px] mx-auto">
              {filteredContent.map(item => {
            const isLiked = userLikes.has(item.id);
            return <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow w-full">
                    <Link to={`/${item.type}/${item.slug}`}>
                      <div className="aspect-video bg-muted relative overflow-hidden">
                        {item.type === 'video' && item.youtube_video_id ? <>
                            <img src={item.thumbnail_url || `https://img.youtube.com/vi/${item.youtube_video_id}/maxresdefault.jpg`} alt={item.title} className="w-full h-full object-cover" />
                            {item.duration && <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                                {item.duration}
                              </div>}
                          </> : item.cover_image_url ? <img src={item.cover_image_url} alt={item.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-muted">
                            {item.type === 'video' ? <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                                <div className="w-0 h-0 border-l-[6px] border-l-primary border-y-[4px] border-y-transparent ml-1"></div>
                              </div> : <div className="text-muted-foreground text-sm">Sem imagem</div>}
                          </div>}
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
                        <CardDescription className="line-clamp-2 break-anywhere" dangerouslySetInnerHTML={{
                  __html: processTextWithLinks(item.type === 'post' ? truncateText(item.content || '', 150) : truncateText(item.description || '', 150))
                }} />
                    </CardHeader>
                    
                     <CardContent>
                       <div className="flex items-center justify-between text-sm text-muted-foreground">
                         <div className="flex items-center gap-2">
                           <Avatar className="h-6 w-6">
                             <img src={item.author?.avatar_url || ''} alt={item.author?.display_name || 'Avatar'} className="h-full w-full object-cover" onError={e => {
                        e.currentTarget.style.display = 'none';
                      }} />
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
                        <Button variant="ghost" size="sm" onClick={e => {
                    e.preventDefault();
                    handleLike(item);
                  }} className={`flex items-center space-x-1 ${isLiked ? 'text-red-500' : ''}`}>
                          <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
                          <span>{item.likes_count}</span>
                        </Button>
                        <div className="flex items-center space-x-1">
                          <MessageCircle className="h-4 w-4" />
                          <span>{item.comments_count}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>;
          })}
            </div>}
        </main>
      </div>
    </TooltipProvider>;
}