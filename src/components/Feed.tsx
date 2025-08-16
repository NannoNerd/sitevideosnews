import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Calendar, User, Play, FileText, Eye, Sparkles } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import PositiveMessageModal from "./PositiveMessageModal";

const Feed = () => {
  const [searchParams] = useSearchParams();
  const category = searchParams.get("category") || "engenharia";
  const searchQuery = searchParams.get("search");
  const [positiveMessageModalOpen, setPositiveMessageModalOpen] = useState(false);
  const [positiveMessage, setPositiveMessage] = useState("");
  const [generatingPositiveMessage, setGeneratingPositiveMessage] = useState(false);

  const {
    data: posts,
    isLoading,
    error,
  } = useQuery(
    ["posts", category, searchQuery],
    async () => {
      let query = supabase
        .from("posts")
        .select("*")
        .eq("category", category)
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.ilike("title", `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  const { data: videos } = useQuery(
    ["videos", category, searchQuery],
    async () => {
      let query = supabase
        .from("videos")
        .select("*")
        .eq("category", category)
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.ilike("title", `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      return data;
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  const handleGeneratePositiveMessage = async () => {
    try {
      setGeneratingPositiveMessage(true);
      
      const { data, error } = await supabase.functions.invoke('generate-with-ai', {
        body: {
          prompt: "Gere uma mensagem motivacional e positiva em português para engenheiros e estudantes de engenharia. A mensagem deve ser inspiradora, com no máximo 100 palavras, focando em perseverança, inovação e crescimento profissional."
        }
      });

      if (error) throw error;
      
      setPositiveMessage(data.content || "Continue perseverando! Cada desafio é uma oportunidade de crescimento. 💪");
      setPositiveMessageModalOpen(true);
    } catch (error) {
      console.error('Erro ao gerar mensagem positiva:', error);
      setPositiveMessage("Continue perseverando! Cada desafio é uma oportunidade de crescimento. 💪");
      setPositiveMessageModalOpen(true);
    } finally {
      setGeneratingPositiveMessage(false);
    }
  };

  const getFilteredContent = () => {
    if (!posts || !videos) return [];

    const allContent = [...posts, ...videos].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return allContent;
  };

  const filteredContent = getFilteredContent();

  const getCategoryTitle = () => {
    switch (category) {
      case "engenharia":
        return "Engenharia";
      case "noticias":
        return "Notícias";
      default:
        return "Conteúdo";
    }
  };

  const renderQuickAccessButtons = () => {
    if (category !== "engenharia") return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col items-center gap-2 text-sm"
          disabled
        >
          <FileText className="h-5 w-5" />
          <span className="text-center">Manuais e Tutoriais (Em Breve...)</span>
        </Button>
        
        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col items-center gap-2 text-sm"
          disabled
        >
          <FileText className="h-5 w-5" />
          <span className="text-center">Projetos de Engenharia Civil (Em Breve...)</span>
        </Button>
        
        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col items-center gap-2 text-sm"
          disabled
        >
          <FileText className="h-5 w-5" />
          <span className="text-center">Análise de Gráficos (Em Breve...)</span>
        </Button>
        
        <Button
          variant="outline" 
          className="h-auto p-4 flex flex-col items-center gap-2 text-sm"
          disabled
        >
          <FileText className="h-5 w-5" />
          <span className="text-center">Notícias e atualidades (Em Breve...)</span>
        </Button>
        
        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col items-center gap-2 text-sm"
          disabled
        >
          <FileText className="h-5 w-5" />
          <span className="text-center">Atualidades IA (Em Breve...)</span>
        </Button>
        
        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col items-center gap-2 text-sm"
          disabled
        >
          <Play className="h-5 w-5" />
          <span className="text-center">Conteúdo Vlog (Em Breve...)</span>
        </Button>
        
        <Button
          variant="outline"
          className="h-auto p-4 flex flex-col items-center gap-2 text-sm gradient-bg text-white hover:opacity-90"
          onClick={handleGeneratePositiveMessage}
          disabled={generatingPositiveMessage}
        >
          <Sparkles className="h-5 w-5" />
          <span className="text-center">
            {generatingPositiveMessage ? "Gerando..." : "Gerar Mensagem Positiva"}
          </span>
        </Button>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{getCategoryTitle()}</h1>
      </div>

      {renderQuickAccessButtons()}

      {searchQuery && (
        <div className="mb-6">
          <p className="text-muted-foreground">
            Resultados da busca por: <strong>"{searchQuery}"</strong>
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-500">Erro ao carregar conteúdo: {error.message}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredContent.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchQuery 
                  ? "Nenhum resultado encontrado para sua busca." 
                  : "Nenhum conteúdo disponível nesta categoria."}
              </p>
            </div>
          ) : (
            filteredContent.map((item) => (
              <Card key={`${item.type}-${item.id}`} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2 mb-2">
                    {item.type === "post" ? (
                      <>
                        <FileText className="h-4 w-4" />
                        <Badge variant="secondary">Artigo</Badge>
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        <Badge variant="secondary">Vídeo</Badge>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {item.description}
                  </p>
                  <div className="flex items-center space-x-2 mt-4">
                    <Calendar className="h-4 w-4" />
                    <span className="text-xs text-muted-foreground">
                      Publicado{" "}
                      {formatDistanceToNow(new Date(item.created_at), {
                        locale: ptBR,
                        addSuffix: true,
                      })}
                    </span>
                    <Eye className="h-4 w-4" />
                    <span className="text-xs text-muted-foreground">
                      {item.views || 0} visualizações
                    </span>
                  </div>
                  <Link to={`/${item.type}/${item.slug}`}>
                    <Button className="w-full mt-4">Ver Conteúdo</Button>
                  </Link>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <PositiveMessageModal
        open={positiveMessageModalOpen}
        onClose={() => setPositiveMessageModalOpen(false)}
        initialMessage={positiveMessage}
      />
    </div>
  );
};

export default Feed;
