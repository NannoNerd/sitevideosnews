import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Save, Trash2, Upload } from 'lucide-react';
import RichTextEditor from '@/components/RichTextEditor';

interface ContentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  contentType: 'post' | 'video';
  onContentUpdated?: () => void;
  onContentDeleted?: () => void;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ContentData {
  id: string;
  title: string;
  slug: string;
  content?: string;
  description?: string;
  cover_image_url?: string;
  thumbnail_url?: string;
  youtube_url?: string;
  youtube_video_id?: string;
  published: boolean;
  category_id?: string;
}

export default function ContentEditDialog({
  open,
  onOpenChange,
  contentId,
  contentType,
  onContentUpdated,
  onContentDeleted
}: ContentEditDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [contentData, setContentData] = useState<ContentData | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    description: '',
    cover_image_url: '',
    thumbnail_url: '',
    youtube_url: '',
    published: false,
    category_id: ''
  });

  const MAX_TITLE_LENGTH = 120;

  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const extractYouTubeVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchContent = async () => {
    if (!contentId) return;

    setLoading(true);
    try {
      const tableName = contentType === 'post' ? 'posts' : 'videos';
      
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', contentId)
        .single();

      if (error) throw error;

      setContentData(data);
      
      // Handle different content types
      if (contentType === 'post') {
        setFormData({
          title: data.title || '',
          slug: data.slug || '',
          content: (data as any).content || '',
          description: '',
          cover_image_url: (data as any).cover_image_url || '',
          thumbnail_url: '',
          youtube_url: '',
          published: data.published || false,
          category_id: data.category_id || ''
        });
      } else {
        setFormData({
          title: data.title || '',
          slug: data.slug || '',
          content: '',
          description: (data as any).description || '',
          cover_image_url: '',
          thumbnail_url: (data as any).thumbnail_url || '',
          youtube_url: (data as any).youtube_url || '',
          published: data.published || false,
          category_id: data.category_id || ''
        });
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar conteúdo.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, field: 'cover_image_url' | 'thumbnail_url') => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${contentType}_${contentId}_${field}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('content-images')
        .upload(`${contentType}s/${fileName}`, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('content-images')
        .getPublicUrl(`${contentType}s/${fileName}`);

      setFormData(prev => ({
        ...prev,
        [field]: publicUrl
      }));

      toast({
        title: 'Sucesso!',
        description: 'Imagem enviada com sucesso.',
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao enviar imagem.',
        variant: 'destructive'
      });
    }
  };

  const handleSave = async () => {
    if (!user || !contentData) return;

    if (!formData.title.trim()) {
      toast({
        title: 'Erro',
        description: 'Título é obrigatório.',
        variant: 'destructive'
      });
      return;
    }

    if (formData.title.length > MAX_TITLE_LENGTH) {
      toast({
        title: 'Erro',
        description: `Título deve ter no máximo ${MAX_TITLE_LENGTH} caracteres.`,
        variant: 'destructive'
      });
      return;
    }

    setSaving(true);
    try {
      const tableName = contentType === 'post' ? 'posts' : 'videos';
      
      let updateData: any = {
        title: formData.title,
        slug: formData.slug || generateSlug(formData.title),
        published: formData.published,
        category_id: formData.category_id || null,
        updated_at: new Date().toISOString()
      };

      if (contentType === 'post') {
        updateData.content = formData.content;
        updateData.cover_image_url = formData.cover_image_url || null;
      } else {
        updateData.description = formData.description;
        updateData.youtube_url = formData.youtube_url;
        updateData.youtube_video_id = extractYouTubeVideoId(formData.youtube_url) || null;
        updateData.thumbnail_url = formData.thumbnail_url || null;
      }

      if (formData.published && !contentData.published) {
        updateData.published_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', contentId);

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: `${contentType === 'post' ? 'Post' : 'Vídeo'} atualizado com sucesso.`,
      });

      onOpenChange(false);
      onContentUpdated?.();
    } catch (error) {
      console.error('Error saving content:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao salvar alterações.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !contentData) return;
    
    if (!window.confirm(`Tem certeza que deseja excluir este ${contentType === 'post' ? 'post' : 'vídeo'}?`)) {
      return;
    }

    setDeleting(true);
    try {
      const tableName = contentType === 'post' ? 'posts' : 'videos';
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', contentId);

      if (error) throw error;

      toast({
        title: 'Sucesso!',
        description: `${contentType === 'post' ? 'Post' : 'Vídeo'} excluído com sucesso.`,
      });

      onOpenChange(false);
      onContentDeleted?.();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir conteúdo.',
        variant: 'destructive'
      });
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchCategories();
      fetchContent();
    }
  }, [open, contentId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Editar {contentType === 'post' ? 'Post' : 'Vídeo'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="title">Título</Label>
                  <span className={`text-xs ${formData.title.length > MAX_TITLE_LENGTH ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {formData.title.length}/{MAX_TITLE_LENGTH}
                  </span>
                </div>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Título do conteúdo"
                  className={formData.title.length > MAX_TITLE_LENGTH ? 'border-destructive' : ''}
                />
                {formData.title.length > MAX_TITLE_LENGTH && (
                  <p className="text-xs text-destructive mt-1">
                    Título muito longo. Máximo de {MAX_TITLE_LENGTH} caracteres.
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="slug">Slug (URL)</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="url-amigavel"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {contentType === 'post' ? (
              <>
                <div>
                  <Label htmlFor="content">Conteúdo</Label>
                  <RichTextEditor
                    value={formData.content}
                    onChange={(value) => setFormData(prev => ({ ...prev, content: value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="cover-image">Imagem de Capa</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.cover_image_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, cover_image_url: e.target.value }))}
                      placeholder="URL da imagem de capa"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('cover-upload')?.click()}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                  <input
                    id="cover-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'cover_image_url')}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="youtube-url">URL do YouTube</Label>
                  <Input
                    id="youtube-url"
                    value={formData.youtube_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, youtube_url: e.target.value }))}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrição do vídeo"
                    rows={4}
                  />
                </div>
                
                <div>
                  <Label htmlFor="thumbnail">Thumbnail personalizada</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.thumbnail_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                      placeholder="URL da thumbnail"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('thumbnail-upload')?.click()}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                  <input
                    id="thumbnail-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'thumbnail_url')}
                  />
                </div>
              </>
            )}

            <div className="flex items-center space-x-2">
              <Switch
                id="published"
                checked={formData.published}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, published: checked }))}
              />
              <Label htmlFor="published">Publicado</Label>
            </div>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting || saving}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {deleting ? 'Excluindo...' : 'Excluir'}
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || formData.title.length > MAX_TITLE_LENGTH}
              className="gradient-bg"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}