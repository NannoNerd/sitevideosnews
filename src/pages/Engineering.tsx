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
  const [userLikes, setUserLikes] = useState<Set<string>>(new Set());
  
  // IA Commands state
  const [iaOpen, setIaOpen] = useState(false);
  const [iaPrompt, setIaPrompt] = useState('');
  const [iaLoading, setIaLoading] = useState(false);
  const [iaResult, setIaResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Projects data
  const projects: Project[] = [
    {
      id: 1,
      title: "Sistema de Drenagem Urbana",
      description: "Projeto completo de drenagem para área urbana com análise hidrológica e dimensionamento de estruturas.",
      image: "/lovable-uploads/da5ece07-5628-4634-ab39-067d57524178.png",
      technologies: ["AutoCAD Civil 3D", "HEC-HMS", "HEC-RAS"]
    },
    {
      id: 2,
      title: "Rodovia com Terraplanagem",
      description: "Projeto geométrico de rodovia rural incluindo terraplanagem, curvas de nível e perfis longitudinais.",
      image: "/lovable-uploads/da5ece07-5628-4634-ab39-067d57524178.png",
      technologies: ["AutoCAD Civil 3D", "Bentley MicroStation", "Topografia"]
    },
    {
      id: 3,
      title: "Ponte de Concreto Armado",
      description: "Estrutura de ponte com 50m de vão, incluindo cálculos estruturais e detalhamento executivo.",
      image: "/lovable-uploads/da5ece07-5628-4634-ab39-067d57524178.png",
      technologies: ["SAP2000", "AutoCAD", "EBERICK"]
    },
    {
      id: 4,
      title: "Loteamento Residencial",
      description: "Projeto urbanístico completo com ruas, quadras, infraestrutura e aprovação na prefeitura.",
      image: "/lovable-uploads/da5ece07-5628-4634-ab39-067d57524178.png",
      technologies: ["AutoCAD Civil 3D", "SketchUp", "QGIS"]
    }
  ];

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
          const likedIds = new Set(likes.map(like => like.video_id).filter(Boolean));
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

    try {
      if (isLiked) {
        // Remove like
        await supabase
          .from('likes')
          .delete()
          .eq('video_id', item.id)
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
          .insert({ video_id: item.id, user_id: user.id });

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
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-16 gradient-bg text-white">
        <div className="container mx-auto px-4 text-center animate-fade-in">
          <div className="flex items-center justify-center mb-6">
            <Cog className="w-12 h-12 text-white/90 mr-4" />
            <h1 className="text-4xl md:text-5xl font-bold">
              Engenharia & Design com o Poder da IA
            </h1>
          </div>
          <p className="text-xl md:text-2xl mb-8 text-white/80 max-w-3xl mx-auto">
            Explore ferramentas e recursos inovadores para otimizar seus projetos, gerar comandos e aprimorar suas habilidades em engenharia e design.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button 
              onClick={() => scrollToSection('ai-commands')}
              className="bg-white/20 hover:bg-white/30 text-white border-white/20 px-6 py-3 text-lg backdrop-blur-sm transition-all duration-300 transform hover:scale-105"
            >
              Geração de Comandos IA
            </Button>
            <Button 
              onClick={() => scrollToSection('latest-video')}
              className="bg-white/20 hover:bg-white/30 text-white border-white/20 px-6 py-3 text-lg backdrop-blur-sm transition-all duration-300 transform hover:scale-105"
            >
              Vídeos Tutoriais IA
            </Button>
            <Button 
              onClick={() => scrollToSection('video-playlists')}
              className="bg-white/20 hover:bg-white/30 text-white border-white/20 px-6 py-3 text-lg backdrop-blur-sm transition-all duration-300 transform hover:scale-105"
            >
              Playlists de Vídeos
            </Button>
            <Button 
              onClick={() => scrollToSection('civil-projects')}
              className="bg-white/20 hover:bg-white/30 text-white border-white/20 px-6 py-3 text-lg backdrop-blur-sm transition-all duration-300 transform hover:scale-105"
            >
              Projetos de Engenharia Civil
            </Button>
          </div>
        </div>
      </section>

      {/* AI Command Generation Section */}
      <section id="ai-commands" className="py-16 bg-card animate-fade-in">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-primary">
              Geração de Comandos por IA
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Descreva a tarefa ou o comando que você precisa, e nossa IA irá gerar o script ou a instrução para diversas ferramentas de engenharia.
            </p>
            
            <div className="bg-secondary rounded-lg p-6 mb-8 border border-border hover-lift">
              <Textarea 
                placeholder="Ex: 'Gerar um script Python para automatizar a criação de camadas no AutoCAD', 'Comando para criar uma parede de 20cm no Revit', 'Instrução para modelar uma viga em concreto armado no SAP2000'"
                value={iaPrompt}
                onChange={(e) => setIaPrompt(e.target.value)}
                rows={4}
                className="mb-4 bg-background border-border text-foreground"
              />
              <Button 
                onClick={handleGenerateIaCommand} 
                disabled={iaLoading}
                className="px-8 py-3 text-lg transition-all duration-300 hover:scale-105"
              >
                {iaLoading ? 'Gerando...' : 'Gerar Comando'}
              </Button>
            </div>

            {iaResult && (
              <div className="bg-secondary rounded-lg p-6 text-left border border-border animate-slide-up">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xl font-semibold text-primary">Comando Gerado:</h4>
                  <Button 
                    onClick={copyToClipboard}
                    variant="outline"
                    size="sm"
                    className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    {copied ? <CheckCircle className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                    {copied ? 'Copiado!' : 'Copiar Comando'}
                  </Button>
                </div>
                <div 
                  className="prose prose-lg max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(iaResult, 'content') }}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Latest Video Section */}
      {latestVideo && (
        <section id="latest-video" className="py-16 gradient-bg text-white animate-fade-in">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
                Vídeos Tutoriais com Auxílio de IA
              </h2>
              <p className="text-lg text-white/80 text-center mb-12 max-w-3xl mx-auto">
                Desvende os segredos da engenharia com a clareza da inteligência artificial. Nossos vídeos tutoriais, criados com o auxílio de IA, oferecem insights precisos e explicações detalhadas.
              </p>
              
              <div className="grid lg:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-2xl font-bold mb-4 text-white">Último Vídeo Postado</h3>
                  <Card className="bg-white/10 backdrop-blur-sm border-white/20 card-hover">
                    <CardContent className="p-6">
                      <div className="aspect-video bg-muted rounded-lg mb-4 overflow-hidden">
                        {latestVideo.youtube_video_id ? (
                          <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${latestVideo.youtube_video_id}`}
                            title={latestVideo.title}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        ) : latestVideo.thumbnail_url ? (
                          <img 
                            src={latestVideo.thumbnail_url} 
                            alt={latestVideo.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Play className="w-16 h-16 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <h4 className="text-xl font-semibold mb-2 text-white">{latestVideo.title}</h4>
                      <p className="text-white/80 mb-4">
                        {truncateText(latestVideo.description || '', 120)}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-sm text-white/70">
                          <span>Visualizações Total: {latestVideo.views_count.toLocaleString()}</span>
                          <span>•</span>
                          <span>Curtidas: {latestVideo.likes_count}</span>
                        </div>
                        <Link to={`/video/${latestVideo.slug}`}>
                          <Button className="bg-white/20 hover:bg-white/30 text-white border-white/20">Assistir</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div id="video-playlists">
                  <h3 className="text-2xl font-bold mb-4 text-white">Top 10 Vídeos Mais Assistidos</h3>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {topVideos.map((video, index) => (
                      <Card key={video.id} className="bg-white/10 backdrop-blur-sm border-white/20 hover:border-white/40 transition-all duration-300 card-hover">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              <Badge variant={index < 3 ? 'default' : 'secondary'} className="w-8 h-8 rounded-full flex items-center justify-center p-0 bg-white/20 text-white border-white/20">
                                {index < 3 ? (
                                  <Star className="w-4 h-4" />
                                ) : (
                                  <span>{index + 1}</span>
                                )}
                              </Badge>
                            </div>
                            <div className="flex-1 min-w-0">
                              <Link to={`/video/${video.slug}`} className="hover:text-white/80">
                                <h5 className="font-medium truncate text-white">{video.title}</h5>
                              </Link>
                              <div className="flex items-center gap-2 text-sm text-white/70">
                                <Eye className="w-3 h-3" />
                                <span>{video.views_count.toLocaleString()} visualizações</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Engineering Projects Section */}
      <section id="civil-projects" className="py-16 bg-card animate-fade-in">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                Projetos de Engenharia Civil
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Explore nosso portfólio de projetos reais desenvolvidos com as melhores práticas e tecnologias da engenharia civil moderna.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {projects.map((project) => (
                <Card key={project.id} className="border border-border hover:border-primary transition-all duration-300 card-hover hover-lift">
                  <div className="aspect-video overflow-hidden rounded-t-lg">
                    <img 
                      src={project.image} 
                      alt={project.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <CardContent className="p-6">
                    <h3 className="text-xl font-semibold mb-3 text-foreground">{project.title}</h3>
                    <p className="text-muted-foreground mb-4">{project.description}</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {project.technologies.map((tech, index) => (
                        <Badge key={index} variant="secondary" className="text-xs bg-accent text-accent-foreground">
                          {tech}
                        </Badge>
                      ))}
                    </div>
                    <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors duration-300">
                      Ver Detalhes do Projeto
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* IA Commands Dialog */}
      <Dialog open={iaOpen} onOpenChange={setIaOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Assistente IA - Engenharia
            </DialogTitle>
            <DialogDescription>
              Gere comandos e scripts para ferramentas de engenharia
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea 
              placeholder="Ex: Como criar um script para automatizar a criação de perfis longitudinais no AutoCAD Civil 3D?"
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
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">Resposta da IA:</h4>
                  <Button 
                    onClick={copyToClipboard}
                    variant="ghost"
                    size="sm"
                  >
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <div 
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(iaResult, 'content') }}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}