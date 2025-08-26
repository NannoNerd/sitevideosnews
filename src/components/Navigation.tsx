import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Menu, X, Plus, LogOut, User, Search, ChevronDown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";

const Navigation = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const [collapseMenu, setCollapseMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLAnchorElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setUserRole(null);
        setAvatarUrl(null);
        return;
      }
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, avatar_url')
          .eq('user_id', user.id)
          .single();
        
        setUserRole(profile?.role || 'user');
        setAvatarUrl(profile?.avatar_url || null);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setUserRole('user');
        setAvatarUrl(null);
      }
    };

    fetchUserProfile();
  }, [user]);

  useEffect(() => {
    const check = () => {
      const containerWidth = containerRef.current?.clientWidth ?? 0;
      const logoW = logoRef.current?.offsetWidth ?? 0;
      const menuW = menuRef.current?.scrollWidth ?? 0;
      const actionsW = actionsRef.current?.offsetWidth ?? 0;
      const gap = 32; // padding/margins allowance
      if (containerWidth > 0) {
        setCollapseMenu(logoW + menuW + actionsW + gap > containerWidth);
      }
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [isMobile, user, userRole, avatarUrl]);

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
      <div ref={containerRef} className="mx-auto w-full max-w-[95vw] md:max-w-[70vw] flex h-20 items-center px-4 justify-between">
        
        {/* Logo na Esquerda */}
        <div className="flex-1 flex justify-start">
          <Link ref={logoRef} to="/" className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
                <circle cx="12" cy="8" r="2" fill="currentColor" opacity="0.7"/>
                <path d="M8 14h8v2H8z" fill="currentColor" opacity="0.5"/>
              </svg>
            </div>
            <div className="hidden sm:block">
              <span className="text-white font-bold text-xl tracking-tight">
                IVO FERNANDES NEWS
              </span>
              <div className="text-xs text-white/70 -mt-1">
                Engenharia • IA • Motivação • Crypto • Música  
              </div>
            </div>
          </Link>
        </div>

        {/* Menu Links no Centro - Desktop */}
        <div className="flex-1 hidden md:flex justify-center">
          <nav className="flex items-center space-x-8">
            <Link 
              to="/?category=engenharia" 
              className="text-white hover:text-white/80 transition-colors font-medium"
            >
              Engenharia
            </Link>
            <Link 
              to="/?category=noticias" 
              className="text-white hover:text-white/80 transition-colors font-medium"
            >
              Notícias
            </Link>
            <Link 
              to="/crypto" 
              className="text-white hover:text-white/80 transition-colors font-medium"
            >
              Crypto
            </Link>
            <Link 
              to="/musica" 
              className="text-white hover:text-white/80 transition-colors font-medium"
            >
              Música
            </Link>
            <Link 
              to="/motivacional" 
              className="text-white hover:text-white/80 transition-colors font-medium"
            >
              Motivacional
            </Link>
          </nav>
        </div>

        {/* Menu Dropdown no Centro - Mobile */}
        <div className="flex-1 md:hidden flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 flex items-center gap-2">
                <Menu className="h-5 w-5" />
                <span>Menu</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-56 bg-background border-border">
              <DropdownMenuItem asChild>
                <Link to="/?category=engenharia" className="w-full cursor-pointer">
                  Engenharia
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/?category=noticias" className="w-full cursor-pointer">
                  Notícias
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/crypto" className="w-full cursor-pointer">
                  Crypto
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/musica" className="w-full cursor-pointer">
                  Música
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/motivacional" className="w-full cursor-pointer">
                  Motivacional
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Actions na Direita */}
        <div ref={actionsRef} className="flex-1 flex justify-end">
          <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 p-2" asChild>
                <Link to="/profile">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Perfil" 
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </Link>
              </Button>
              {location.pathname !== "/create" && userRole === 'admin' && (
                <Button
                  asChild
                  size="sm"
                  className="bg-white/20 text-white hover:bg-white/30 border-white/20"
                >
                  <Link to="/create">
                    <Plus className="h-4 w-4 mr-1" />
                    <span className="hidden md:inline">Criar</span>
                  </Link>
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-white hover:bg-white/10 p-2"
              >
                <LogOut className="h-5 w-5" />
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
        </div>

        {/* Mobile menu button (para mobile adicional se necessário) */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden ml-2"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5 text-white" />
          ) : (
            <Search className="h-5 w-5 text-white" />
          )}
        </Button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="border-t bg-background z-50 animate-slide-up">
          <div className="mx-auto w-full max-w-[95vw] md:max-w-[70vw] py-4 px-4 space-y-4">
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

            {/* Mobile Navigation Links */}
            <div className="space-y-2">
              <Link 
                to="/?category=engenharia" 
                className="block py-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Engenharia
              </Link>
              <Link 
                to="/?category=noticias" 
                className="block py-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Notícias
              </Link>
              <Link 
                to="/crypto" 
                className="block py-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Crypto
              </Link>
              <Link 
                to="/musica" 
                className="block py-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Música
              </Link>
              <Link 
                to="/motivacional" 
                className="block py-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Motivacional
              </Link>
            </div>

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
                  {location.pathname !== "/create" && userRole === 'admin' && (
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