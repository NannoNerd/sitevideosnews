import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Menu, X, Plus, LogOut, User, Search } from "lucide-react";

const Navigation = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full border-b gradient-bg">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link to="/" className="flex items-center hover-lift">
          <img 
            src="/lovable-uploads/ffe260a2-df9a-4ce0-ae33-5d76f7e56231.png" 
            alt="VidNews Logo" 
            className="h-14 rounded-lg"
          />
        </Link>

        {/* Search Bar */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <form onSubmit={handleSearch} className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60 h-4 w-4" />
            <Input
              placeholder="Buscar conteúdo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white/20"
            />
          </form>
        </div>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-3">
              <Link 
                to="/profile" 
                className="flex items-center space-x-2 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <User className="h-4 w-4" />
                <span className="text-sm">
                  {user.email}
                </span>
              </Link>
              {location.pathname !== "/create" && (
                <Button
                  asChild
                  size="sm"
                  className="bg-white/20 text-white hover:bg-white/30 border-white/20"
                >
                  <Link to="/create">
                    <Plus className="h-4 w-4 mr-1" />
                    Criar
                  </Link>
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleLogout}
                className="bg-white/20 text-white hover:bg-white/30 border-white/20"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Sair
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Button variant="ghost" asChild size="sm" className="text-white hover:bg-white/10">
                <Link to="/auth">Entrar</Link>
              </Button>
              <Button asChild size="sm" className="bg-white/20 text-white hover:bg-white/30 border-white/20">
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
            {/* Mobile Search */}
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar conteúdo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </form>

            <div className="pt-4 border-t space-y-3">
              {user ? (
                <>
                  <Link 
                    to="/profile" 
                    className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    <span>{user.email}</span>
                  </Link>
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
                    size="sm"
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full gradient-bg hover:opacity-90"
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