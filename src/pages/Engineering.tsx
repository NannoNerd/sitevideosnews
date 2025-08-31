import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Heart, MessageCircle, Eye, Search, Cog, Brain, Play, Copy, CheckCircle, Settings, Star, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { truncateText } from '@/lib/text-utils';
import { sanitizeHtml } from '@/lib/html-sanitizer';

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

interface Project {
  id: number;
  title: string;
  description: string;
  image: string;
  technologies: string[];
}

export default function Engineering() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const [content, setContent] = useState<ContentItem[]>([]);
  const [topVideos, setTopVideos] = useState<ContentItem[]>([]);
  const [latestVideo, setLatestVideo] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLikes, setUserLikes] = useState<Record<string, boolean>>({});
  
  // IA Commands state
  const [iaOpen, setIaOpen] = useState(false);
  const [iaPrompt, setIaPrompt] = useState('');
  const [iaLoading, setIaLoading] = useState(false);
  const [iaResult, setIaResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Engineering videos
  const engineeringVideos = content.filter(item => item.type === 'video');

  const fetchEngineeringContent = async () => {
    try {
      // Fetch videos for engineering category
      const { data: videos, error: videosError } = await supabase
        .from('videos')
        .select(`
          *,
          categories(name, slug)
        `)
        .eq('published', true)
        .eq('categories.slug', 'engenharia')
        .order('published_at', { ascending: false });

      if (videosError) throw videosError;

      // Get author IDs
      const authorIds = (videos || []).map(v => v.author_id)
        .filter((id, index, arr) => arr.indexOf(id) === index);

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

      // Process videos with author data
      const processedVideos: ContentItem[] = (videos || []).map(video => ({
        ...video,
        type: 'video' as const,
        category: video.categories || { name: 'Engenharia', slug: 'engenharia' },
        author: {
          display_name: authorMap[video.author_id]?.display_name || 'Anônimo',
          avatar_url: authorMap[video.author_id]?.avatar_url
        }
      }));

      setContent(processedVideos);

      // Set latest video (most recent)
      if (processedVideos.length > 0) {
        setLatestVideo(processedVideos[0]);
      }

      // Set top videos (sorted by views)
      const topVideosList = [...processedVideos]
        .sort((a, b) => b.views_count - a.views_count)
        .slice(0, 10);
      setTopVideos(topVideosList);

      // Fetch user likes if authenticated
      if (user && processedVideos.length > 0) {
        const videoIds = processedVideos.map(video => video.id);
        const { data: likes } = await supabase
          .from('likes')
          .select('video_id')
          .eq('user_id', user.id)
          .in('video_id', videoIds);

        if (likes) {
          const likedMap = likes.reduce((acc, like) => {
            if (like.video_id) acc[like.video_id] = true;
            return acc;
          }, {} as Record<string, boolean>);
          setUserLikes(likedMap);
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

  const handleLike = async (videoId: string) => {
    if (!user) {
      toast({
        title: 'Login necessário',
        description: 'Faça login para curtir conteúdos.',
        variant: 'destructive'
      });
      return;
    }

    const isLiked = userLikes[videoId];

    try {
      if (isLiked) {
        // Remove like
        await supabase
          .from('likes')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id);

        setUserLikes(prev => ({ ...prev, [videoId]: false }));
        setContent(prev => 
          prev.map(contentItem => 
            contentItem.id === videoId 
              ? { ...contentItem, likes_count: contentItem.likes_count - 1 }
              : contentItem
          )
        );
        if (latestVideo && latestVideo.id === videoId) {
          setLatestVideo(prev => prev ? { ...prev, likes_count: prev.likes_count - 1 } : null);
        }
      } else {
        // Add like
        await supabase
          .from('likes')
          .insert({ video_id: videoId, user_id: user.id });

        setUserLikes(prev => ({ ...prev, [videoId]: true }));
        setContent(prev => 
          prev.map(contentItem => 
            contentItem.id === videoId 
              ? { ...contentItem, likes_count: contentItem.likes_count + 1 }
              : contentItem
          )
        );
        if (latestVideo && latestVideo.id === videoId) {
          setLatestVideo(prev => prev ? { ...prev, likes_count: prev.likes_count + 1 } : null);
        }
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

  // Generate IA content via Edge Function
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

      const baseInstruction = 'Você é um assistente técnico especializado em engenharia civil e ferramentas como AutoCAD Civil 3D, Revit, SAP2000, MATLAB, Python para engenharia, etc. Forneça passos claros e, quando aplicável, blocos de código ou comandos prontos para copiar.';
      const formatInstruction = 'Formate a resposta em HTML simples (sem markdown). Use <h2>, <h3>, <p>, <ul>, <li>, <code>, <pre> quando apropriado. Não use asteriscos para negrito; use <strong>. Responda em português do Brasil.';
      const fullPrompt = `${baseInstruction}\n\n${formatInstruction}\n\nSolicitação do usuário: ${iaPrompt}`;

      const { data, error } = await supabase.functions.invoke('generate-with-ai', {
        body: { prompt: fullPrompt }
      });

      if (error) throw error;

      const generated = (data as any)?.generatedText || (data as any)?.text || '';

      // Convert to HTML if not already formatted
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
      toast({
        title: 'Erro ao gerar comando',
        description: 'Verifique sua conexão ou tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setIaLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (iaResult) {
      const textContent = iaResult.replace(/<[^>]*>/g, '');
      navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copiado!',
        description: 'Comando copiado para a área de transferência.',
      });
    }
  };

  useEffect(() => {
    fetchEngineeringContent();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Hero Section with Quick Actions */}
        <section className="text-center space-y-6 bg-gradient-to-br from-primary/10 to-accent/20 rounded-xl p-8 animate-fade-in">
          <h1 className="text-4xl font-bold gradient-text mb-4">
            Engenharia Civil & Tecnologia
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Transforme sua carreira em engenharia com as ferramentas mais avançadas de IA, 
            tutoriais práticos e projetos reais.
          </p>
          
          {/* Quick Action Buttons */}
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <Button onClick={() => scrollToSection('ai-commands')} className="hover-lift animate-bounce-in">
              Geração de Comandos IA
            </Button>
            <Button variant="outline" onClick={() => scrollToSection('latest-video')} className="hover-lift animate-bounce-in" style={{animationDelay: '0.1s'}}>
              Vídeos Tutoriais IA
            </Button>
            <Button variant="outline" onClick={() => scrollToSection('video-playlists')} className="hover-lift animate-bounce-in" style={{animationDelay: '0.2s'}}>
              Playlists de Vídeos
            </Button>
            <Button variant="outline" onClick={() => scrollToSection('civil-projects')} className="hover-lift animate-bounce-in" style={{animationDelay: '0.3s'}}>
              Projetos de Engenharia Civil
            </Button>
          </div>
        </section>

        {/* AI Commands Section - Dark Theme */}
        <section id="ai-commands" className="bg-slate-900 text-white rounded-xl p-8 animate-slide-up">
          <h2 className="text-3xl font-bold text-center mb-8 text-white">Geração de Comandos por IA</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {[
              {
                title: "AutoCAD Civil 3D",
                description: "Comandos automatizados para modelagem de terrenos, redes e infraestrutura",
                icon: "🏗️"
              },
              {
                title: "Análise Estrutural",
                description: "Scripts para cálculos de vigas, pilares e fundações",
                icon: "🏢"
              },
              {
                title: "Geotecnia",
                description: "Comandos para análise de solo e estabilidade de taludes",
                icon: "🌍"
              },
              {
                title: "Hidráulica",
                description: "Cálculos automáticos de redes de água e esgoto",
                icon: "💧"
              },
              {
                title: "Pavimentação",
                description: "Dimensionamento automático de pavimentos flexíveis e rígidos",
                icon: "🛣️"
              },
              {
                title: "Orçamentação",
                description: "Geração automática de planilhas e composições de custos",
                icon: "💰"
              }
            ].map((item, index) => (
              <Card key={index} className="card-hover bg-slate-800 border-slate-700 animate-fade-in" style={{animationDelay: `${index * 0.1}s`}}>
                <CardContent className="p-6 text-center">
                  <div className="text-3xl mb-4 animate-bounce-in" style={{animationDelay: `${index * 0.15}s`}}>{item.icon}</div>
                  <h3 className="text-lg font-semibold mb-2 text-white">{item.title}</h3>
                  <p className="text-slate-300 text-sm">{item.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 mb-8 border border-slate-700 hover-lift">
              <Textarea 
                placeholder="Ex: 'Gerar um script Python para automatizar a criação de camadas no AutoCAD', 'Comando para criar uma parede de 20cm no Revit', 'Instrução para modelar uma viga em concreto armado no SAP2000'"
                value={iaPrompt}
                onChange={(e) => setIaPrompt(e.target.value)}
                rows={4}
                className="mb-4 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
              <Button 
                onClick={handleGenerateIaCommand} 
                disabled={iaLoading}
                className="px-8 py-3 text-lg transition-all duration-300 hover:scale-105 hover-lift"
              >
                {iaLoading ? 'Gerando...' : 'Gerar Comando'}
              </Button>
            </div>

            {iaResult && (
              <div className="bg-slate-800/80 backdrop-blur-sm rounded-lg p-6 text-left border border-slate-700 animate-slide-up">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xl font-semibold text-blue-400">Comando Gerado:</h4>
                  <Button 
                    onClick={copyToClipboard}
                    variant="outline"
                    size="sm"
                    className="border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white hover-lift"
                  >
                    {copied ? <CheckCircle className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                    {copied ? 'Copiado!' : 'Copiar Comando'}
                  </Button>
                </div>
                <div 
                  className="prose prose-lg max-w-none text-white prose-headings:text-white prose-strong:text-white prose-code:text-blue-300 prose-pre:bg-slate-900"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(iaResult, 'content') }}
                />
              </div>
            )}
          </div>
        </section>

        {/* Latest Video Section - Light Theme */}
        <section id="latest-video" className="bg-white rounded-xl p-8 animate-slide-up border border-gray-200">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-900">Último Vídeo de Engenharia</h2>
          {latestVideo ? (
            <div className="max-w-4xl mx-auto">
              <Card className="overflow-hidden bg-white border-gray-200 card-hover animate-fade-in shadow-lg">
                <div className="aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${latestVideo.youtube_video_id}`}
                    title={latestVideo.title}
                    className="w-full h-full rounded-t-lg"
                    allowFullScreen
                  />
                </div>
                <CardContent className="p-6 bg-white">
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">{latestVideo.title}</h3>
                  <p className="text-gray-600 mb-4" 
                     dangerouslySetInnerHTML={{ __html: latestVideo.description?.substring(0, 200) + '...' || '' }} 
                  />
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Eye className="h-4 w-4" />
                        <span>{latestVideo.views_count} visualizações</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(latestVideo.id)}
                        className={`hover-lift text-gray-600 hover:text-gray-900 ${userLikes[latestVideo.id] ? 'text-red-500' : ''}`}
                      >
                        <Heart className={`h-4 w-4 mr-1 ${userLikes[latestVideo.id] ? 'fill-current' : ''}`} />
                        {latestVideo.likes_count}
                      </Button>
                    </div>
                    <span>{new Date(latestVideo.published_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center text-muted-foreground animate-fade-in">
              <p>Nenhum vídeo de engenharia encontrado.</p>
            </div>
          )}
        </section>

        {/* Video Playlists Section - Dark Theme */}
        <section id="video-playlists" className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-up">
          {/* Engineering Playlist */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 animate-fade-in">
            <h3 className="text-2xl font-bold mb-6 text-white">📚 Playlist de Engenharia</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {engineeringVideos.slice(0, 5).map((video, index) => (
                <Card key={video.id} className="card-hover bg-slate-800 border-slate-700 animate-fade-in" style={{animationDelay: `${index * 0.1}s`}}>
                  <CardContent className="p-4">
                    <div className="flex space-x-4">
                      <div className="w-20 h-14 bg-blue-600/20 rounded flex-shrink-0 flex items-center justify-center hover-lift">
                        <Play className="h-6 w-6 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2 mb-1 text-white">{video.title}</h4>
                        <div className="flex items-center text-xs text-slate-300 space-x-2">
                          <span>{video.views_count} views</span>
                          <span>•</span>
                          <span>{new Date(video.published_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Top 10 Videos */}
          <div className="bg-slate-800 rounded-xl p-6 animate-fade-in" style={{animationDelay: '0.2s'}}>
            <h3 className="text-2xl font-bold mb-6 text-white">🏆 Top 10 Vídeos Mais Vistos</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {topVideos.map((video, index) => (
                <Card key={video.id} className="card-hover bg-slate-700 border-slate-600 animate-fade-in" style={{animationDelay: `${index * 0.05}s`}}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold hover-lift">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-2 mb-1 text-white">{video.title}</h4>
                        <div className="flex items-center text-xs text-slate-300 space-x-2">
                          <Eye className="h-3 w-3" />
                          <span>{video.views_count}</span>
                          <Heart className="h-3 w-3" />
                          <span>{video.likes_count}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Civil Engineering Projects Section - Light Theme */}
        <section id="civil-projects" className="bg-white rounded-xl p-8 animate-slide-up border border-gray-200">
          <h2 className="text-3xl font-bold text-center mb-8 text-gray-900">Projetos de Engenharia Civil</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Ponte Estaiada",
                description: "Projeto completo de ponte estaiada com análise estrutural detalhada",
                image: "/lovable-uploads/23842c11-d314-4af2-9cd5-38695ed34b8e.png",
                category: "Estruturas"
              },
              {
                title: "Edifício Residencial",
                description: "Projeto arquitetônico e estrutural de edifício de 15 pavimentos",
                image: "/lovable-uploads/6c142c27-1a58-4d4a-ae6c-b97b5940f500.png",
                category: "Edificações"
              },
              {
                title: "Sistema Viário",
                description: "Projeto de sistema viário urbano com análise de tráfego",
                image: "/lovable-uploads/c6c3898c-a4a6-40fb-9d56-6444b39e70eb.png",
                category: "Infraestrutura"
              },
              {
                title: "Estação de Tratamento",
                description: "ETA completa com sistema de automação e controle",
                image: "/lovable-uploads/da5ece07-5628-4634-ab39-067d57524178.png",
                category: "Saneamento"
              },
              {
                title: "Terminal Rodoviário",
                description: "Projeto de terminal rodoviário com cobertura metálica",
                image: "/lovable-uploads/e597480e-da67-45df-a678-231acebdee17.png",
                category: "Infraestrutura"
              },
              {
                title: "Complexo Esportivo",
                description: "Centro esportivo com ginásio e piscina olímpica",
                image: "/lovable-uploads/ffe260a2-df9a-4ce0-ae33-5d76f7e56231.png",
                category: "Edificações"
              }
            ].map((project, index) => (
              <Card key={index} className="overflow-hidden card-hover bg-white border-gray-200 shadow-lg animate-fade-in" style={{animationDelay: `${index * 0.1}s`}}>
                <div className="aspect-video bg-gray-100">
                  <img 
                    src={project.image} 
                    alt={project.title}
                    className="w-full h-full object-cover hover-lift"
                  />
                </div>
                <CardContent className="p-6 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">{project.category}</Badge>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">{project.title}</h3>
                  <p className="text-gray-600 text-sm">{project.description}</p>
                  <Button variant="outline" className="w-full mt-4 hover-lift bg-cyan-500 text-black border-cyan-500 hover:bg-cyan-600 hover:text-black font-semibold">
                    Ver Projeto
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}