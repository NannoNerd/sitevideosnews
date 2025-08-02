import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Menu, X, Plus, LogOut, User } from "lucide-react";

const Navigation = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Sucesso!",
        description: "Você foi desconectado.",
      });
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast({
        title: "Erro",
        description: "Erro ao fazer logout. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2 hover-lift">
          <div className="h-8 w-8 rounded-lg gradient-bg flex items-center justify-center">
            <span className="text-white font-bold text-lg">N</span>
          </div>
          <span className="gradient-text font-bold text-xl hidden sm:inline">
            NewsPortal
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-6">
          <Link
            to="/"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive("/") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Início
          </Link>
          
          {user && (
            <Link
              to="/create"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                isActive("/create") ? "text-primary" : "text-muted-foreground"
              }`}
            >
              Criar Conteúdo
            </Link>
          )}
        </div>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span className="text-sm text-muted-foreground">
                  {user.email}
                </span>
              </div>
              {location.pathname !== "/create" && (
                <Button
                  asChild
                  size="sm"
                  className="gradient-bg hover:opacity-90"
                >
                  <Link to="/create">
                    <Plus className="h-4 w-4 mr-1" />
                    Criar
                  </Link>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="hover-lift"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Sair
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Button variant="ghost" asChild size="sm">
                <Link to="/auth">Entrar</Link>
              </Button>
              <Button asChild size="sm" className="gradient-bg hover:opacity-90">
                <Link to="/auth">Cadastrar</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background/95 backdrop-blur animate-slide-up">
          <div className="container py-4 px-4 space-y-4">
            <Link
              to="/"
              className={`block text-sm font-medium transition-colors hover:text-primary ${
                isActive("/") ? "text-primary" : "text-muted-foreground"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              Início
            </Link>
            
            {user && (
              <Link
                to="/create"
                className={`block text-sm font-medium transition-colors hover:text-primary ${
                  isActive("/create") ? "text-primary" : "text-muted-foreground"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Criar Conteúdo
              </Link>
            )}

            <div className="pt-4 border-t space-y-3">
              {user ? (
                <>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>{user.email}</span>
                  </div>
                  {location.pathname !== "/create" && (
                    <Button
                      asChild
                      size="sm"
                      className="w-full gradient-bg hover:opacity-90"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Link to="/create">
                        <Plus className="h-4 w-4 mr-1" />
                        Criar Conteúdo
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full"
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    Sair
                  </Button>
                </>
              ) : (
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    asChild
                    size="sm"
                    className="w-full"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link to="/auth">Entrar</Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="w-full gradient-bg hover:opacity-90"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Link to="/auth">Cadastrar</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;