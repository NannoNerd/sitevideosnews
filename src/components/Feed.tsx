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
import { Heart, MessageCircle, Eye, Search, Plus, Settings, User, Cog, CreditCard, Brain } from 'lucide-react';
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

  // Special layout for engineering category
  if (categoryFilter === 'engenharia') {
    return <TooltipProvider>
        <div className="min-h-screen w-full overflow-x-hidden" style={{
        backgroundColor: '#0f172a'
      }}>
            <main className="mx-auto w-full px-4 py-8 max-w-[95vw] md:max-w-[70vw]">
            {/* Hero Section */}
            <div className={`text-center mb-16 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="relative mb-8">
                <div className="flex justify-center items-center space-x-8 mb-8">
                  <div className="animate-bounce" style={{ animationDelay: '0s' }}>
                    <Cog className="w-16 h-16 text-orange-400 drop-shadow-lg" />
                  </div>
                  <div className="animate-bounce" style={{ animationDelay: '0.5s' }}>
                    <CreditCard className="w-16 h-16 text-cyan-400 drop-shadow-lg" />
                  </div>
                  <div className="animate-bounce" style={{ animationDelay: '1s' }}>
                    <Brain className="w-16 h-16 text-pink-400 drop-shadow-lg" />
                  </div>
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-orange-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent mb-6">
                Explore o Futuro com Tecnologia e Conhecimento
              </h1>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Aprenda, evolua e acompanhe o crescimento do nosso ativo digital.
              </p>
              <div className="relative inline-block">
                <Button className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-8 py-3 rounded-full text-lg font-semibold transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-purple-500/25">
                  Gerar Mensagem Positiva
                </Button>
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur opacity-20 animate-pulse"></div>
              </div>
            </div>

            {/* IA Commands Dialog */}
            <Dialog open={iaOpen} onOpenChange={setIaOpen}>
              <DialogContent className="sm:max-w-[680px] bg-slate-900 text-white border border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-2xl">
                    {iaMode === 'engenharia' ? 'Geração de Comandos por IA' : iaMode === 'crypto' ? 'Crypto IA — Pergunte' : 'Crescimento Pessoal IA'}
                  </DialogTitle>
                  <DialogDescription className="text-slate-300">
                    {iaMode === 'engenharia' ? 'Descreva a tarefa ou comando que você precisa e nossa IA gerará o script ou instruções para ferramentas de engenharia.' : iaMode === 'crypto' ? 'Faça sua pergunta sobre criptomoedas e blockchain (educacional, sem aconselhamento financeiro).' : 'Peça conselhos práticos de produtividade, hábitos e carreira.'}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <Textarea value={iaPrompt} onChange={e => setIaPrompt(e.target.value)} placeholder={iaMode === 'engenharia' ? "Ex: 'Gerar um script Python para automatizar a criação de camadas no AutoCAD'; 'Comando para criar uma parede de 20cm no Revit'; 'Modelar uma viga no SAP2000'" : iaMode === 'crypto' ? "Ex: 'O que é staking e quais os riscos?'; 'Como funciona a rede Ethereum e o gas?'; 'Diferença entre token e coin?'; 'Como guardar minhas chaves com segurança?'" : "Ex: 'Como montar uma rotina matinal produtiva?'; 'Técnicas para foco profundo (deep work)?'; 'Como criar o hábito de estudar diariamente?'; 'Framework para metas SMART?'"} className="min-h-[140px] bg-slate-800/60 text-white placeholder:text-slate-400" />

                  <div className="flex items-center gap-3">
                    <Button onClick={handleGenerateIaCommand} disabled={iaLoading} className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white">
                      {iaLoading ? 'Gerando...' : iaMode === 'engenharia' ? 'Gerar Comando' : iaMode === 'crypto' ? 'Pergunte IA' : 'Gerar Dica'}
                    </Button>
                    <Button variant="secondary" onClick={() => setIaOpen(false)} className="bg-slate-700 hover:bg-slate-600 text-gray-200">
                      Fechar
                    </Button>
                  </div>

                  {iaResult && <div className="mt-2 rounded-lg border border-slate-700 bg-slate-900 overflow-hidden">
                      <div className="px-4 py-2 text-sm text-slate-300 border-b border-slate-700">Resultado</div>
                      <div className="max-h-[320px] overflow-auto p-4 text-sm text-slate-200 leading-relaxed space-y-3 [&_h2]:text-white [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-white [&_ul]:list-disc [&_ul]:pl-6 [&_code]:bg-black/40 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-black/40 [&_pre]:p-3 [&_pre]:rounded" dangerouslySetInnerHTML={{
                    __html: iaResult
                  }} />
                    </div>}
                </div>

                <DialogFooter />
              </DialogContent>
            </Dialog>

            {/* Three Cards Section */}
            <div className={`grid md:grid-cols-3 gap-8 transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              {/* Engenharia e Designer */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 card-hover transform hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/10 group">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mx-auto mb-4 rounded-2xl transform group-hover:rotate-12 transition-transform duration-300 shadow-lg">
                    <div className="text-white text-2xl animate-pulse">⚙️</div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-orange-400 transition-colors duration-300">
                    Engenharia e Designer
                  </h3>
                  <p className="text-gray-400 mb-6 group-hover:text-gray-300 transition-colors duration-300">
                    Gere scripts e comandos para softwares de engenharia usando IA.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Button onClick={() => {
                  setIaMode('engenharia');
                  setIaOpen(true);
                }} className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white py-3 rounded-lg font-semibold transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-cyan-500/25">
                    Geração de Comandos por IA
                  </Button>
                  <Button variant="secondary" className="w-full bg-slate-700 hover:bg-slate-600 text-gray-300 py-3 rounded-lg transform hover:scale-105 transition-all duration-200">
                    Manuais e Tutoriais
                  </Button>
                  <Button variant="secondary" className="w-full bg-slate-700 hover:bg-slate-600 text-gray-300 py-3 rounded-lg transform hover:scale-105 transition-all duration-200">
                    Projetos de Engenharia Civil
                  </Button>
                </div>
              </div>

              {/* CryptoMoeda + IA */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 card-hover transform hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-pink-500/10 group">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4 transform group-hover:rotate-12 transition-transform duration-300 shadow-lg">
                    <div className="text-white text-2xl animate-pulse">🧠</div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-pink-400 transition-colors duration-300">
                    CryptoMoeda + IA
                  </h3>
                  <p className="text-gray-400 mb-6 group-hover:text-gray-300 transition-colors duration-300">
                    Tire suas dúvidas sobre criptomoedas e blockchain com nosso assistente.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Button onClick={() => {
                  setIaMode('crypto');
                  setIaOpen(true);
                }} className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-3 rounded-lg font-semibold transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-purple-500/25">
                    Crypto IA / Pergunte
                  </Button>
                  <Button variant="secondary" className="w-full bg-slate-700 hover:bg-slate-600 text-gray-300 py-3 rounded-lg transform hover:scale-105 transition-all duration-200">
                    Análise de Gráficos
                  </Button>
                  <Button variant="secondary" className="w-full bg-slate-700 hover:bg-slate-600 text-gray-300 py-3 rounded-lg transform hover:scale-105 transition-all duration-200">
                    Notícias e Atualidades
                  </Button>
                </div>
              </div>

              {/* Conteúdo + Motivação */}
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 card-hover transform hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-gray-500/10 group">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-500 to-gray-600 rounded-2xl flex items-center justify-center mx-auto mb-4 transform group-hover:rotate-12 transition-transform duration-300 shadow-lg">
                    <div className="text-white text-2xl animate-pulse">💭</div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-gray-400 transition-colors duration-300">
                    Conteúdo + Motivação
                  </h3>
                  <p className="text-gray-400 mb-6 group-hover:text-gray-300 transition-colors duration-300">
                    Receba conselhos e insights para seu desenvolvimento pessoal e carreira.
                  </p>
                </div>
                
                <div className="space-y-3">
                  <Button onClick={() => {
                  setIaMode('growth');
                  setIaOpen(true);
                }} className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white py-3 rounded-lg font-semibold transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-pink-500/25">
                    Crescimento Pessoal IA
                  </Button>
                  <Button variant="secondary" className="w-full bg-slate-700 hover:bg-slate-600 text-gray-300 py-3 rounded-lg transform hover:scale-105 transition-all duration-200">
                    Atualidades IA
                  </Button>
                  <Button variant="secondary" className="w-full bg-slate-700 hover:bg-slate-600 text-gray-300 py-3 rounded-lg transform hover:scale-105 transition-all duration-200">
                    Conteúdo Vlog
                  </Button>
                </div>
              </div>
            </div>

            {/* Testimonials Section */}
            <div style={{
            backgroundColor: '#111828'
          }} className={`backdrop-blur-sm rounded-3xl p-12 border border-slate-700/50 mt-24 mb-16 transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              <div className="max-w-6xl mx-auto">
                <h2 className="text-4xl font-bold text-white text-center mb-16">
                  O que as pessoas estão dizendo
                </h2>
                <div className="grid md:grid-cols-4 gap-8">
                  <div style={{
                  backgroundColor: '#202938'
                }} className="backdrop-blur-sm rounded-2xl p-6 border border-slate-600/50 card-hover text-center">
                    <div className="flex flex-col items-center mb-4">
                      <img src="https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&h=150&fit=crop&crop=face" alt="Mariana L." className="w-12 h-12 rounded-full object-cover mb-2" />
                      <div>
                        <div className="text-white font-medium">Mariana L.</div>
                        <div className="text-gray-400 text-sm">Engenheira Civil</div>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm italic">
                      "Esse projeto me inspira todos os dias a buscar mais conhecimento. Parabéns pela iniciativa!"
                    </p>
                  </div>

                  <div style={{
                  backgroundColor: '#202938'
                }} className="backdrop-blur-sm rounded-2xl p-6 border border-slate-600/50 card-hover text-center">
                    <div className="flex flex-col items-center mb-4">
                      <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face" alt="João V." className="w-12 h-12 rounded-full object-cover mb-2" />
                      <div>
                        <div className="text-white font-medium">João V.</div>
                        <div className="text-gray-400 text-sm">Arquiteto</div>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm italic">
                      "Muito além de um site comum. É uma experiência completa com conteúdo útil de verdade."
                    </p>
                  </div>

                  <div style={{
                  backgroundColor: '#202938'
                }} className="backdrop-blur-sm rounded-2xl p-6 border border-slate-600/50 card-hover text-center">
                    <div className="flex flex-col items-center mb-4">
                      <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face" alt="Camila F." className="w-12 h-12 rounded-full object-cover mb-2" />
                      <div>
                        <div className="text-white font-medium">Camila F.</div>
                        <div className="text-gray-400 text-sm">Designer</div>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm italic">
                      "Gostei da parte da IA motivacional. Às vezes, é exatamente o que a gente precisa."
                    </p>
                  </div>

                  <div style={{
                  backgroundColor: '#202938'
                }} className="backdrop-blur-sm rounded-2xl p-6 border border-slate-600/50 card-hover text-center">
                    <div className="flex flex-col items-center mb-4">
                      <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face" alt="Ricardo T." className="w-12 h-12 rounded-full object-cover mb-2" />
                      <div>
                        <div className="text-white font-medium">Ricardo T.</div>
                        <div className="text-gray-400 text-sm">Desenvolvedor</div>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm italic">
                      "A proposta de ativos digitais é bem original. Estou curioso para ver como isso vai evoluir."
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* About Us Section */}
            <div style={{
            backgroundColor: '#030712'
          }} className="backdrop-blur-sm rounded-3xl p-12 border border-slate-700/50 mb-16">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-4xl font-bold text-white mb-8">
                  Sobre Nós
                </h2>
                <p className="text-lg text-gray-300 leading-relaxed">
                  Somos movidos pela vontade de transformar ideias em realidade. Nosso projeto une 
                  engenharia, inteligência artificial, criação de conteúdo e ativos digitais em um só lugar. Aqui 
                  você aprende, investe, se motiva e evolui — sempre com apoio de tecnologia de ponta e 
                  inteligência coletiva.
                </p>
              </div>
            </div>

            {/* Novidades & Atualizações Section */}
            <div style={{
            backgroundColor: '#111828'
          }} className="backdrop-blur-sm rounded-3xl p-12 border border-slate-700/50 mb-16">
              <div className="max-w-4xl mx-auto text-center">
                <h2 className="text-4xl font-bold text-white mb-8">
                  Novidades & Atualizações
                </h2>
                <div className="space-y-4 text-gray-300 text-lg">
                  <div className="flex items-start justify-center gap-3">
                    <span className="text-orange-400 text-xl">🚀</span>
                    <p>Lançamento oficial do site e início da fase beta!</p>
                  </div>
                  <div className="flex items-start justify-center gap-3">
                    <span className="text-blue-400 text-xl">💡</span>
                    <p>Nova IA para conselhos motivacionais já em funcionamento.</p>
                  </div>
                  <div className="flex items-start justify-center gap-3">
                    <span className="text-green-400 text-xl">📱</span>
                    <p>Monitoramento de Ativo Digital agora disponível.</p>
                  </div>
                  <div className="flex items-start justify-center gap-3">
                    <span className="text-purple-400 text-xl">📚</span>
                    <p>Mais recursos chegando em breve, fique ligado!</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Perguntas Frequentes Section */}
            <div style={{
            backgroundColor: '#030712'
          }} className="backdrop-blur-sm rounded-3xl p-12 border border-slate-700/50 mb-16">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-4xl font-bold text-white text-center mb-12">
                  Perguntas Frequentes
                </h2>
                <div className="space-y-8">
                  <div>
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-blue-400 text-xl">🔍</span>
                      <h3 className="text-xl font-bold text-white">O que é o Ativo Digital?</h3>
                    </div>
                    <p className="text-gray-300 leading-relaxed ml-8">
                      É um valor construído com base nas transações positivas de Ivo Fernandes, disponível para consulta e participação.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-green-400 text-xl">📊</span>
                      <h3 className="text-xl font-bold text-white">Como posso acompanhar os lucros?</h3>
                    </div>
                    <p className="text-gray-300 leading-relaxed ml-8">
                      Os lucros são exibidos na seção "Nosso Ativo Digital". Em breve, teremos gráficos dinâmicos!
                    </p>
                  </div>

                  <div>
                    <div className="flex items-start gap-3 mb-3">
                      <span className="text-pink-400 text-xl">🧠</span>
                      <h3 className="text-xl font-bold text-white">Como funciona a IA Motivacional?</h3>
                    </div>
                    <p className="text-gray-300 leading-relaxed ml-8">
                      Ao clicar no botão, você recebe uma mensagem gerada automaticamente com foco em bem-estar e motivação.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center py-8 border-t border-slate-700/50">
              <p className="text-gray-400">
                © 2025 Ivo Fernandes. Todos os direitos reservados.
              </p>
            </div>
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