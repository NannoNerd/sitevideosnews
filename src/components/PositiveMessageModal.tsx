import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Sparkles, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PositiveMessageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PositiveMessageModal({ open, onOpenChange }: PositiveMessageModalProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generatePositiveMessage = async () => {
    try {
      setLoading(true);
      setMessage(null);
      
      console.log('Gerando mensagem positiva...');
      
      const prompt = `Gere uma mensagem motivacional e inspiradora em português do Brasil. 
      A mensagem deve ser:
      - Curta (máximo 2 frases)
      - Poética e bonita
      - Sobre fé, destino, sucesso, perseverança ou crescimento pessoal
      - No estilo da frase: "A fé que vibra no coração é a semente que germina o destino."
      
      Retorne apenas a mensagem, sem aspas ou formatação adicional.`;

      const { data, error } = await supabase.functions.invoke('generate-with-ai', {
        body: { prompt }
      });

      console.log('Resposta da IA:', data, error);

      if (error) throw error;

      const generatedMessage = (data as any)?.generatedText || (data as any)?.text || '';
      
      // Clean the message - remove quotes and extra formatting
      const cleanMessage = generatedMessage
        .replace(/^["']|["']$/g, '') // Remove quotes from start/end
        .replace(/^\s*["""'']\s*|\s*["""'']\s*$/g, '') // Remove fancy quotes
        .trim();

      console.log('Mensagem limpa:', cleanMessage);
      setMessage(cleanMessage || 'Mensagem não disponível no momento.');
    } catch (err) {
      console.error('Erro ao gerar mensagem:', err);
      toast({
        title: 'Erro ao gerar mensagem',
        description: 'Tente novamente em alguns momentos.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate first message when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !message && !loading) {
      generatePositiveMessage();
    }
    if (!newOpen) {
      setMessage(null); // Reset message when closing
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent 
        className="sm:max-w-[500px] bg-gray-900 text-white border border-gray-700 shadow-2xl [&>button]:hidden"
        onPointerDownOutside={() => onOpenChange(false)}
      >
        <DialogHeader className="relative">
          <DialogTitle className="text-2xl font-bold text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent pr-8">
            Mensagem Inspiradora
          </DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="absolute -top-2 -right-2 h-8 w-8 rounded-full hover:bg-purple-500/20 text-gray-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="py-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <Sparkles className="w-12 h-12 text-purple-400 animate-spin" />
                <div className="absolute inset-0 w-12 h-12 bg-purple-400/20 rounded-full animate-ping"></div>
              </div>
              <p className="text-gray-300 text-center">Gerando uma mensagem especial para você...</p>
            </div>
          ) : message ? (
            <div className="text-center space-y-6">
              <div className="relative">
                <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg blur-lg animate-pulse"></div>
                <blockquote className="relative text-xl md:text-2xl font-medium text-cyan-300 leading-relaxed italic px-6 py-4">
                  "{message}"
                </blockquote>
              </div>
              
              <div className="flex justify-center">
                <Button
                  onClick={generatePositiveMessage}
                  disabled={loading}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-3 rounded-full font-semibold transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-purple-500/25"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Gerar Outra Mensagem
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-gray-300">Ops! Algo deu errado.</p>
              <Button
                onClick={generatePositiveMessage}
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-3 rounded-full font-semibold"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Tentar Novamente
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}