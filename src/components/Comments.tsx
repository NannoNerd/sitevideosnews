import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Reply, Send, User, Trash2, Ban, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Comment {
  id: string;
  content: string;
  user_id: string;
  parent_id?: string;
  created_at: string;
  approved: boolean;
  user_profile: {
    display_name: string;
    role?: string;
    avatar_url?: string;
  };
  replies?: Comment[];
}

interface CommentsProps {
  contentId: string;
  contentType: 'post' | 'video';
}

export default function Comments({ contentId, contentType }: CommentsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userRole, setUserRole] = useState<string>('user');
  const [userShadowBanned, setUserShadowBanned] = useState(false);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, shadow_banned')
          .eq('user_id', user.id)
          .single();
        
        setUserRole(profile?.role || 'user');
        setUserShadowBanned(profile?.shadow_banned || false);
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };

    fetchUserRole();
  }, [user]);

  const fetchComments = async () => {
    try {
      const foreignKey = contentType === 'post' ? 'post_id' : 'video_id';
      
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          user_id,
          parent_id,
          created_at,
          approved
        `)
        .eq(foreignKey, contentId)
        .eq('approved', true)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user profiles for comments
      const userIds = (commentsData || []).map(comment => comment.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, role, avatar_url')
        .in('user_id', userIds);

      const profileMap = (profiles || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, any>);

      // Fetch replies for each comment
      const commentsWithReplies = await Promise.all(
        (commentsData || []).map(async (comment) => {
          const { data: replies, error: repliesError } = await supabase
            .from('comments')
            .select(`
              id,
              content,
              user_id,
              parent_id,
              created_at,
              approved
            `)
            .eq('parent_id', comment.id)
            .eq('approved', true)
            .order('created_at', { ascending: true });

          if (repliesError) throw repliesError;

          // Get user profiles for replies
          const replyUserIds = (replies || []).map(reply => reply.user_id);
          const { data: replyProfiles } = await supabase
            .from('profiles')
            .select('user_id, display_name, role, avatar_url')
            .in('user_id', replyUserIds);

          const replyProfileMap = (replyProfiles || []).reduce((acc, profile) => {
            acc[profile.user_id] = profile;
            return acc;
          }, {} as Record<string, any>);

          return {
            ...comment,
            user_profile: profileMap[comment.user_id] || { display_name: 'Usuário' },
            replies: (replies || []).map(reply => ({
              ...reply,
              user_profile: replyProfileMap[reply.user_id] || { display_name: 'Usuário' }
            }))
          };
        })
      );

      setComments(commentsWithReplies);
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar comentários.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      toast({
        title: 'Login necessário',
        description: 'Faça login para comentar.',
        variant: 'destructive'
      });
      return;
    }

    if (userShadowBanned) {
      toast({
        title: 'Comentário não permitido',
        description: 'Você não tem permissão para comentar.',
        variant: 'destructive'
      });
      return;
    }

    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const foreignKey = contentType === 'post' ? 'post_id' : 'video_id';
      
      const { error } = await supabase
        .from('comments')
        .insert({
          content: newComment.trim(),
          user_id: user.id,
          [foreignKey]: contentId,
          approved: true
        });

      if (error) throw error;

      setNewComment('');
      toast({
        title: 'Sucesso!',
        description: 'Comentário adicionado.',
      });
      
      fetchComments();
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar comentário.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (userRole !== 'admin') return;

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: 'Comentário excluído.',
      });
      
      fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir comentário.',
        variant: 'destructive'
      });
    }
  };

  const handleToggleShadowBan = async (userId: string) => {
    if (userRole !== 'admin') return;

    try {
      const { error } = await supabase
        .rpc('toggle_shadow_ban', { target_user_id: userId });

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: 'Status do usuário alterado.',
      });
      
      fetchComments();
    } catch (error) {
      console.error('Error toggling shadow ban:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao alterar status do usuário.',
        variant: 'destructive'
      });
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!user || !replyContent.trim()) return;

    setSubmitting(true);
    try {
      const foreignKey = contentType === 'post' ? 'post_id' : 'video_id';
      
      const { error } = await supabase
        .from('comments')
        .insert({
          content: replyContent.trim(),
          user_id: user.id,
          [foreignKey]: contentId,
          parent_id: parentId,
          approved: true
        });

      if (error) throw error;

      setReplyContent('');
      setReplyTo(null);
      
      toast({
        title: 'Sucesso!',
        description: 'Resposta adicionada.',
      });

      fetchComments();
    } catch (error) {
      console.error('Error submitting reply:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar resposta.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [contentId, contentType]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-5 w-5" />
        <h3 className="text-lg font-semibold">
          Comentários ({comments.reduce((total, comment) => total + 1 + (comment.replies?.length || 0), 0)})
        </h3>
      </div>

      {/* New Comment Form */}
      {user && !userShadowBanned ? (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <Textarea
                placeholder="Escreva seu comentário..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex justify-end">
                <Button 
                  onClick={handleSubmitComment}
                  disabled={submitting || !newComment.trim()}
                  className="bg-gradient-to-r from-primary to-accent text-white hover:opacity-90"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {submitting ? 'Enviando...' : 'Comentar'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : userShadowBanned ? (
        <Card>
          <CardContent className="p-4 text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
            <p>Você não tem permissão para comentar</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4 text-center text-muted-foreground">
            Faça login para comentar
          </CardContent>
        </Card>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {comments.map((comment) => (
        <Card key={comment.id}>
          <CardHeader className="pb-3">
            <div className={`flex items-start gap-3 p-4 rounded-lg ${comment.user_profile?.role === 'admin' ? 'gradient-bg' : ''}`}>
              <Avatar className="h-8 w-8">
                {comment.user_profile?.avatar_url && (
                  <AvatarImage src={comment.user_profile.avatar_url} alt={comment.user_profile.display_name || 'Usuário'} />
                )}
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-medium text-sm ${comment.user_profile?.role === 'admin' ? 'text-white' : ''}`}>
                    {comment.user_profile?.display_name || 'Usuário'}
                  </span>
                  <span className={`text-xs ${comment.user_profile?.role === 'admin' ? 'text-white/70' : 'text-muted-foreground'}`}>
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </span>
                </div>
                <p className={`text-sm mt-2 break-words ${comment.user_profile?.role === 'admin' ? 'text-white' : ''}`}>{comment.content}</p>
              </div>
            </div>
          </CardHeader>
            
            <CardContent className="pt-0">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                  className="text-xs"
                >
                  <Reply className="h-3 w-3 mr-1" />
                  Responder
                </Button>
                
                {userRole === 'admin' && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-xs text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Excluir
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleShadowBan(comment.user_id)}
                      className="text-xs text-orange-600 hover:text-orange-700"
                    >
                      <Ban className="h-3 w-3 mr-1" />
                      Shadow Ban
                    </Button>
                  </>
                )}
              </div>

              {/* Reply Form */}
              {replyTo === comment.id && user && (
                <div className="mt-4 space-y-3">
                  <Textarea
                    placeholder="Escreva sua resposta..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="min-h-[80px]"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReplyTo(null);
                        setReplyContent('');
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSubmitReply(comment.id)}
                      disabled={submitting || !replyContent.trim()}
                      className="bg-gradient-to-r from-primary to-accent text-white hover:opacity-90"
                    >
                      {submitting ? 'Enviando...' : 'Responder'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="mt-4 space-y-3 border-l-2 border-muted pl-4">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className={`flex gap-3 p-3 rounded-lg ${reply.user_profile?.role === 'admin' ? 'gradient-bg' : ''}`}>
                      <Avatar className="h-6 w-6">
                        {reply.user_profile?.avatar_url && (
                          <AvatarImage src={reply.user_profile.avatar_url} alt={reply.user_profile.display_name || 'Usuário'} />
                        )}
                        <AvatarFallback>
                          <User className="h-3 w-3" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium text-xs ${reply.user_profile?.role === 'admin' ? 'text-white' : ''}`}>
                            {reply.user_profile?.display_name || 'Usuário'}
                          </span>
                          <span className={`text-xs ${reply.user_profile?.role === 'admin' ? 'text-white/70' : 'text-muted-foreground'}`}>
                            {formatDistanceToNow(new Date(reply.created_at), {
                              addSuffix: true,
                              locale: ptBR
                            })}
                          </span>
                        </div>
                        <p className={`text-xs mt-1 break-words ${reply.user_profile?.role === 'admin' ? 'text-white' : ''}`}>{reply.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {comments.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum comentário ainda. Seja o primeiro a comentar!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}