import { useState, useEffect } from "react";
import { Music, Headphones, Mic, ArrowRight, Play } from "lucide-react";

const ComingSoonMusic = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-purple-900/10 to-pink-900/10 flex items-center justify-center">
      <div className="max-w-4xl mx-auto text-center">
        {/* Animated music icons */}
        <div className="relative mb-8">
          <div className={`transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="flex justify-center items-center space-x-8 mb-8">
              <div className="animate-pulse" style={{ animationDelay: '0s' }}>
                <Music className="w-16 h-16 text-purple-400 drop-shadow-lg" />
              </div>
              <div className="animate-pulse" style={{ animationDelay: '0.5s' }}>
                <Headphones className="w-16 h-16 text-pink-400 drop-shadow-lg" />
              </div>
              <div className="animate-pulse" style={{ animationDelay: '1s' }}>
                <Mic className="w-16 h-16 text-indigo-400 drop-shadow-lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className={`transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-indigo-500 bg-clip-text text-transparent mb-6">
            MÚSICA
          </h1>
          <h2 className="text-2xl md:text-4xl font-semibold text-foreground mb-4">
            Em Construção
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Preparando uma seção dedicada à música! Reviews, lançamentos, 
            artistas emergentes e tudo sobre o universo musical.
          </p>
        </div>

        {/* Music player mockup */}
        <div className={`transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="max-w-sm mx-auto bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-6 mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center">
                <Play className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="h-2 bg-muted rounded-full mb-2">
                  <div className="h-2 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full w-1/3 animate-pulse"></div>
                </div>
                <div className="text-xs text-muted-foreground">Aguarde por novidades...</div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress indicator */}
        <div className={`transition-all duration-1000 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="max-w-md mx-auto mb-8">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Progresso</span>
              <span>60%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-gradient-to-r from-purple-400 to-pink-500 h-2 rounded-full w-3/5 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Call to action */}
        <div className={`transition-all duration-1000 delay-900 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors cursor-pointer group">
            <span className="text-lg font-medium">Voltar ao início</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Sound waves animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/4">
            <div className="flex space-x-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-purple-400 rounded-full animate-pulse"
                  style={{
                    height: `${Math.random() * 40 + 10}px`,
                    animationDelay: `${i * 0.2}s`,
                    animationDuration: '1s'
                  }}
                ></div>
              ))}
            </div>
          </div>
          <div className="absolute top-2/3 right-1/4">
            <div className="flex space-x-1">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-pink-400 rounded-full animate-pulse"
                  style={{
                    height: `${Math.random() * 30 + 8}px`,
                    animationDelay: `${i * 0.3}s`,
                    animationDuration: '1.2s'
                  }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonMusic;