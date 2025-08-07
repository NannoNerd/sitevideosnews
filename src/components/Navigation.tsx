import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Menu, X, Plus, LogOut, User, Search } from "lucide-react";
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
      <div ref={containerRef} className="mx-auto w-full max-w-[95vw] md:max-w-[70vw] flex h-12 items-center justify-between px-4">
        {/* Logo */}
        <Link ref={logoRef} to="/" className="flex items-center">
          <img 
            src="/lovable-uploads/ffe260a2-df9a-4ce0-ae33-5d76f7e56231.png" 
            alt="VidNews Logo" 
            className="h-[60px] rounded-lg"
          />
        </Link>

        {/* Navigation Menu */}
        <div ref={menuRef} className={`${(!isMobile && !collapseMenu) ? "flex" : "hidden"} items-center space-x-6 flex-1 mx-8`}>
          <Link to="/" className="text-white/80 hover:text-white transition-colors text-sm font-medium">
            Notícias
          </Link>
          <Link to="/?category=engenharia" className="text-white/80 hover:text-white transition-colors text-sm font-medium">
            Engenharia
          </Link>
          <Link to="/?category=crypto" className="text-white/80 hover:text-white transition-colors text-sm font-medium">
            Crypto
          </Link>
          <Link to="/?category=musica" className="text-white/80 hover:text-white transition-colors text-sm font-medium">
            Música
          </Link>
          <Link to="/?category=motivacional" className="text-white/80 hover:text-white transition-colors text-sm font-medium">
            Motivacional
          </Link>
        </div>

        {/* Desktop Auth Buttons */}
        <div ref={actionsRef} className={`${(!isMobile && !collapseMenu) ? "flex" : "hidden"} items-center space-x-4`}>
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
                    Criar
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

        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="sm"
          className={`${(isMobile || collapseMenu) ? "" : "hidden"}`}
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