import { useState, useEffect } from "react";
import { Target, Zap, Star, ArrowRight, Heart, Trophy } from "lucide-react";

const ComingSoonMotivational = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-orange-900/10 to-yellow-900/10 flex items-center justify-center px-4">
      <div className="max-w-4xl mx-auto text-center">
        {/* Animated motivational icons */}
        <div className="relative mb-8">
          <div className={`transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <div className="flex justify-center items-center space-x-8 mb-8">
              <div className="animate-bounce" style={{ animationDelay: '0s' }}>
                <Target className="w-16 h-16 text-orange-400 drop-shadow-lg" />
              </div>
              <div className="animate-bounce" style={{ animationDelay: '0.5s' }}>
                <Trophy className="w-16 h-16 text-yellow-400 drop-shadow-lg" />
              </div>
              <div className="animate-bounce" style={{ animationDelay: '1s' }}>
                <Star className="w-16 h-16 text-amber-400 drop-shadow-lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className={`transition-all duration-1000 delay-300 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h1 className="text-6xl md:text-8xl font-bold bg-gradient-to-r from-orange-400 via-yellow-500 to-amber-500 bg-clip-text text-transparent mb-6">
            MOTIVAÇÃO
          </h1>
          <h2 className="text-2xl md:text-4xl font-semibold text-foreground mb-4">
            Em Construção
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Estamos criando um espaço especial para inspirar e motivar. 
            Histórias de sucesso, dicas de produtividade e muito mais!
          </p>
        </div>

        {/* Motivational quote */}
        <div className={`transition-all duration-1000 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="max-w-lg mx-auto bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-8 mb-8">
            <div className="flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-red-400 animate-pulse" />
            </div>
            <blockquote className="text-xl italic text-foreground/90 mb-4">
              "O sucesso é a soma de pequenos esforços repetidos dia após dia."
            </blockquote>
            <cite className="text-sm text-muted-foreground">- Robert Collier</cite>
          </div>
        </div>

        {/* Progress indicator */}
        <div className={`transition-all duration-1000 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="max-w-md mx-auto mb-8">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
              <span>Progresso</span>
              <span>80%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-gradient-to-r from-orange-400 to-yellow-500 h-2 rounded-full w-4/5 animate-pulse"></div>
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

        {/* Floating motivational elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Energy sparks */}
          <div className="absolute top-1/4 left-1/6">
            <Zap className="w-4 h-4 text-yellow-400 animate-pulse" style={{ animationDelay: '2s' }} />
          </div>
          <div className="absolute top-1/2 right-1/6">
            <Star className="w-3 h-3 text-orange-400 animate-pulse" style={{ animationDelay: '3s' }} />
          </div>
          <div className="absolute bottom-1/3 left-1/3">
            <Target className="w-5 h-5 text-amber-400 animate-pulse" style={{ animationDelay: '4s' }} />
          </div>
          
          {/* Floating dots */}
          <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-orange-400 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-1/2 left-1/5 w-1.5 h-1.5 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '2.5s' }}></div>
          <div className="absolute top-3/4 right-1/5 w-1 h-1 bg-amber-400 rounded-full animate-ping" style={{ animationDelay: '3.5s' }}></div>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonMotivational;