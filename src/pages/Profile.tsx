import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { User, Camera, Key, FileText, Eye, Heart, MessageCircle, Play, Edit } from "lucide-react";
import { Link } from "react-router-dom";
import ContentEditDialog from "@/components/ContentEditDialog";

interface UserContent {
  id: string;
  title: string;
  slug: string;
  content?: string;
  description?: string;
  cover_image_url?: string;
  thumbnail_url?: string;
  youtube_video_id?: string;
  published: boolean;
  published_at?: string;
  views_count: number;
  likes_count: number;
  comments_count: number;
  type: 'post' | 'video';
  categories?: { name: string; slug: string };
}

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [userContent, setUserContent] = useState<UserContent[]>([]);
  const [loadingContent, setLoadingContent] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [editingContent, setEditingContent] = useState<{id: string, type: 'post' | 'video'} | null>(null);
  const [userProfile, setUserProfile] = useState<{display_name?: string} | null>(null);

  const fetchUserContent = async () => {
    if (!user) return;
    
    setLoadingContent(true);
    try {
      // Fetch user posts
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          categories(name, slug)
        `)
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Fetch user videos
      const { data: videos, error: videosError } = await supabase
        .from('videos')
        .select(`
          *,
          categories(name, slug)
        `)
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });

      if (videosError) throw videosError;

      // Combine content
      const allContent: UserContent[] = [
        ...(posts || []).map(post => ({ ...post, type: 'post' as const })),
        ...(videos || []).map(video => ({ ...video, type: 'video' as const }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setUserContent(allContent);
    } catch (error) {
      console.error('Error fetching user content:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar seus conteúdos.",
        variant: "destructive",
      });
    } finally {
      setLoadingContent(false);
    }
  };

  const fetchUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (profile) {
        if ((profile as any).avatar_url) {
          setAvatarUrl((profile as any).avatar_url);
        }
        setUserProfile({
          display_name: (profile as any).display_name
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) {
      console.log('No file selected or user not found');
      return;
    }

    console.log('Starting avatar upload for user:', user.id);
    setIsLoading(true);
    try {
      // Upload image to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;
      
      console.log('Uploading file:', fileName);
      const { error: uploadError } = await supabase.storage
        .from('content-images')
        .upload(`avatars/${fileName}`, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('content-images')
        .getPublicUrl(`avatars/${fileName}`);

      console.log('Public URL:', publicUrl);

      // Update profile with avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          avatar_url: publicUrl,
          display_name: userProfile?.display_name || user.email?.split('@')[0] || 'Usuário'
        });

      if (updateError) {
        console.error('Profile update error:', updateError);
        throw updateError;
      }

      console.log('Avatar updated successfully');
      setAvatarUrl(publicUrl);
      await fetchUserProfile(); // Refresh profile data
      toast({
        title: "Sucesso!",
        description: "Foto de perfil atualizada.",
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao atualizar foto de perfil.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const currentPassword = formData.get('current-password') as string;
    const newPassword = formData.get('new-password') as string;
    const confirmPassword = formData.get('confirm-password') as string;

    if (newPassword !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ 
        password: newPassword 
      });

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Senha alterada com sucesso.",
      });
      event.currentTarget.reset();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao alterar senha.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserContent();
      fetchUserProfile();
    }
  }, [user]);

  if (!user) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 space-y-4">
            <Card className="hover-lift">
              <CardHeader className="text-center pb-4">
                <div className="relative mx-auto">
                  <Avatar className="h-24 w-24 mx-auto">
                    <AvatarImage src={avatarUrl} alt="Profile" />
                    <AvatarFallback className="bg-gradient-to-r from-primary to-secondary text-white text-2xl">
                      {user.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    size="sm"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0 gradient-bg"
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>
                <CardTitle className="text-lg">{user.email}</CardTitle>
              </CardHeader>
              
              <CardContent className="pt-0">
                <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="w-full">
                  <TabsList className="grid w-full grid-cols-1 gap-2 h-auto bg-transparent p-0">
                    <TabsTrigger value="posts" className="w-full justify-start bg-background">
                      <FileText className="h-4 w-4 mr-2" />
                      Posts
                    </TabsTrigger>
                    <TabsTrigger value="account" className="w-full justify-start bg-background">
                      <User className="h-4 w-4 mr-2" />
                      Conta
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1 max-w-[calc(100%-320px-1.5rem)]">
            {activeTab === "posts" && (
              <Card>
                <CardHeader>
                  <CardTitle>Meus Conteúdos</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingContent ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : userContent.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-semibold mb-2">Nenhum conteúdo encontrado</h3>
                      <p>Você ainda não criou nenhum conteúdo.</p>
                      <Button asChild className="mt-4 gradient-bg">
                        <Link to="/create">Criar Primeiro Conteúdo</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {userContent.map((item) => (
                        <Card key={item.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex gap-4">
                              <div className="flex-shrink-0">
                                {item.type === 'video' && item.youtube_video_id ? (
                                  <div className="w-24 h-16 bg-muted rounded-lg overflow-hidden relative">
                                    <img
                                      src={item.thumbnail_url || `https://img.youtube.com/vi/${item.youtube_video_id}/default.jpg`}
                                      alt={item.title}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                      <Play className="h-4 w-4 text-white" fill="currentColor" />
                                    </div>
                                  </div>
                                ) : item.cover_image_url ? (
                                  <img
                                    src={item.cover_image_url}
                                    alt={item.title}
                                    className="w-24 h-16 object-cover rounded-lg"
                                  />
                                ) : (
                                  <div className="w-24 h-16 bg-muted rounded-lg flex items-center justify-center">
                                    <FileText className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                   <div className="flex-1">
                                     <div 
                                       className="font-semibold hover:text-primary line-clamp-2 cursor-pointer flex items-center gap-2 flex-wrap"
                                       onClick={() => setEditingContent({id: item.id, type: item.type})}
                                     >
                                       <span className="flex-1">{item.title}</span>
                                       <div className="flex items-center gap-1">
                                         <Badge variant={item.published ? "default" : "secondary"} className="text-xs">
                                           {item.published ? "Publicado" : "Rascunho"}
                                         </Badge>
                                         <Badge variant="outline" className="text-xs">
                                           {item.type === 'post' ? 'Post' : 'Vídeo'}
                                         </Badge>
                                         <Edit className="h-3 w-3 opacity-60" />
                                       </div>
                                     </div>
                                     <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                       {item.type === 'post' ? item.content?.substring(0, 100) + '...' : item.description}
                                     </p>
                                   </div>
                                </div>
                                
                                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <Eye className="h-3 w-3" />
                                    <span>{item.views_count}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Heart className="h-3 w-3" />
                                    <span>{item.likes_count}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <MessageCircle className="h-3 w-3" />
                                    <span>{item.comments_count}</span>
                                  </div>
                                  {item.published_at && (
                                    <span className="ml-auto">
                                      {new Date(item.published_at).toLocaleDateString('pt-BR')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {activeTab === "account" && (
              <Card>
                <CardHeader>
                  <CardTitle>Configurações da Conta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Seção de Apelido */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Informações do Perfil</h3>
                    <div>
                      <Label htmlFor="display-name">Apelido</Label>
                      <Input
                        id="display-name"
                        name="display-name"
                        type="text"
                        placeholder="Seu apelido"
                        value={userProfile?.display_name || ''}
                        onChange={(e) => setUserProfile(prev => ({ ...prev, display_name: e.target.value }))}
                      />
                      <Button 
                        type="button" 
                        className="mt-2" 
                        onClick={async () => {
                          try {
                            const { error } = await supabase
                              .from('profiles')
                              .update({ display_name: userProfile?.display_name })
                              .eq('user_id', user?.id);
                            
                            if (error) throw error;
                            
                            toast({
                              title: 'Sucesso',
                              description: 'Apelido atualizado com sucesso!'
                            });
                          } catch (error) {
                            toast({
                              title: 'Erro',
                              description: 'Não foi possível atualizar o apelido.',
                              variant: 'destructive'
                            });
                          }
                        }}
                      >
                        Salvar Apelido
                      </Button>
                    </div>
                  </div>

                  {/* Seção de Senha */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Alterar Senha</h3>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div>
                        <Label htmlFor="current-password">Senha Atual</Label>
                        <Input
                          id="current-password"
                          name="current-password"
                          type="password"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-password">Nova Senha</Label>
                        <Input
                          id="new-password"
                          name="new-password"
                          type="password"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                        <Input
                          id="confirm-password"
                          name="confirm-password"
                          type="password"
                          required
                        />
                      </div>
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full gradient-bg"
                      >
                        <Key className="h-4 w-4 mr-2" />
                        {isLoading ? "Alterando..." : "Alterar Senha"}
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Edit Content Dialog */}
      {editingContent && (
        <ContentEditDialog
          open={!!editingContent}
          onOpenChange={(open) => !open && setEditingContent(null)}
          contentId={editingContent.id}
          contentType={editingContent.type}
          onContentUpdated={() => {
            fetchUserContent();
            setEditingContent(null);
          }}
          onContentDeleted={() => {
            fetchUserContent();
            setEditingContent(null);
          }}
        />
      )}
    </div>
  );
};

export default Profile;