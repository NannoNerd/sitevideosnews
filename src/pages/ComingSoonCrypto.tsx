import { useState, useEffect } from "react";
import { Bitcoin, TrendingUp, Zap, ArrowRight } from "lucide-react";

const ComingSoonCrypto = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5 flex items-center justify-center px-4">
      <div className="max-w-4xl mx-auto text-center">
        {/* Animated crypto icons */}
        <div className="relative mb-8">
          <div className={`transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="flex justify-center items-center space-x-8 mb-8">
              <div className="animate-bounce" style={{ animationDelay: '0s' }}>
                <Bitcoin className="w-16 h-16 text-yellow-400 drop-shadow-lg" />
              </div>
              <div className="animate-bounce" style={{ animationDelay: '0.5s' }}>
                <TrendingUp className="w-16 h-16 text-green-400 drop-shadow-lg" />
              </div>
              <div className="animate-bounce" style={{ animationDelay: '1s' }}>
                <Zap className="w-16 h-16 text-blue-400 drop-shadow-lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className={`transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 bg-clip-text text-transparent mb-6">
            CRYPTO
          </h1>
          <h2 className="text-2xl md:text-4xl font-semibold text-foreground mb-4">
            Em Construção
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Estamos preparando uma experiência incrível sobre o mundo das criptomoedas. 
            Trading, análises, notícias e muito mais chegando em breve!
          </p>
        </div>

        {/* Progress indicator */}
        <div className={`transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="max-w-md mx-auto mb-8">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Progresso</span>
              <span>75%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 h-2 rounded-full w-3/4 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Call to action */}
        <div className={`transition-all duration-1000 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="inline-flex items-center space-x-2 text-primary hover:text-primary/80 transition-colors cursor-pointer group">
            <span className="text-lg font-medium">Voltar ao início</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Floating elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-orange-500 rounded-full animate-ping" style={{ animationDelay: '3s' }}></div>
          <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" style={{ animationDelay: '4s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonCrypto;