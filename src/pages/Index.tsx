import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const Index = () => {
  const { user, signOut, loading } = useAuth();

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20">
      <div className="text-center space-y-8 p-8">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          IvoFernandesNews
        </h1>
        {user ? (
          <div className="space-y-4">
            <p className="text-xl text-muted-foreground">
              Bem-vindo, {user.email}!
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={handleSignOut} variant="outline">
                Sair
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xl text-muted-foreground max-w-md mx-auto">
              Plataforma de notícias e vídeos
            </p>
            <Link to="/auth">
              <Button size="lg">
                Entrar / Cadastrar
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
