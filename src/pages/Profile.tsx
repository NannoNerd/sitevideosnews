import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { User, Camera, Key, FileText } from "lucide-react";

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      // Aqui você implementaria o upload da imagem
      toast({
        title: "Sucesso!",
        description: "Foto de perfil atualizada.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao atualizar foto de perfil.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    
    try {
      // Aqui você implementaria a mudança de senha
      toast({
        title: "Sucesso!",
        description: "Senha alterada com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao alterar senha.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
              <CardHeader className="text-center">
                <div className="relative mx-auto">
                  <Avatar className="h-24 w-24 mx-auto">
                    <AvatarImage src="" alt="Profile" />
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
            </Card>

            <Tabs defaultValue="posts" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="posts" className="flex-1">
                  <FileText className="h-4 w-4 mr-2" />
                  Posts
                </TabsTrigger>
                <TabsTrigger value="account" className="flex-1">
                  <User className="h-4 w-4 mr-2" />
                  Conta
                </TabsTrigger>
              </TabsList>

              <TabsContent value="posts" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Posts Criados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="text-center text-muted-foreground py-8">
                        Você ainda não criou nenhum post
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="account" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Configurações da Conta</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div>
                        <Label htmlFor="current-password">Senha Atual</Label>
                        <Input
                          id="current-password"
                          type="password"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="new-password">Nova Senha</Label>
                        <Input
                          id="new-password"
                          type="password"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                        <Input
                          id="confirm-password"
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
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <Tabs defaultValue="posts">
              <TabsContent value="posts">
                <Card>
                  <CardHeader>
                    <CardTitle>Meus Posts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      <div className="text-center text-muted-foreground py-12">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">Nenhum post encontrado</h3>
                        <p>Você ainda não criou nenhum conteúdo.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;