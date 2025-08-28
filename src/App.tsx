import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Navigation from "./components/Navigation";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import CreateContent from "./pages/CreateContent";
import PostView from "./pages/PostView";
import VideoView from "./pages/VideoView";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import ComingSoonCrypto from "./pages/ComingSoonCrypto";
import ComingSoonMusic from "./pages/ComingSoonMusic";
import ComingSoonMotivational from "./pages/ComingSoonMotivational";
import Engineering from "./pages/Engineering";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-background dark">
            <Navigation />
            <main className="container mx-auto max-w-7xl px-4">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/create" element={<CreateContent />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/post/:slug" element={<PostView />} />
                <Route path="/video/:slug" element={<VideoView />} />
                <Route path="/crypto" element={<ComingSoonCrypto />} />
                <Route path="/musica" element={<ComingSoonMusic />} />
                <Route path="/motivacional" element={<ComingSoonMotivational />} />
                <Route path="/engenharia" element={<Engineering />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
