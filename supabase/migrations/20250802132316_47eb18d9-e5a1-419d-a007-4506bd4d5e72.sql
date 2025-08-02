-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create posts table for news articles
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  cover_image_url TEXT,
  category_id UUID REFERENCES public.categories(id),
  author_id UUID NOT NULL REFERENCES auth.users(id),
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create videos table
CREATE TABLE public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  youtube_url TEXT NOT NULL,
  youtube_video_id TEXT NOT NULL,
  thumbnail_url TEXT,
  category_id UUID REFERENCES public.categories(id),
  author_id UUID NOT NULL REFERENCES auth.users(id),
  published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tags table
CREATE TABLE public.tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create post_tags junction table
CREATE TABLE public.post_tags (
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- Create video_tags junction table
CREATE TABLE public.video_tags (
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (video_id, tag_id)
);

-- Create likes table
CREATE TABLE public.likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT likes_content_check CHECK (
    (post_id IS NOT NULL AND video_id IS NULL) OR 
    (post_id IS NULL AND video_id IS NOT NULL)
  ),
  UNIQUE(user_id, post_id),
  UNIQUE(user_id, video_id)
);

-- Create comments table
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  video_id UUID REFERENCES public.videos(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  approved BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT comments_content_check CHECK (
    (post_id IS NOT NULL AND video_id IS NULL) OR 
    (post_id IS NULL AND video_id IS NOT NULL)
  )
);

-- Enable RLS on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Categories policies (readable by all, editable by admins)
CREATE POLICY "Categories are viewable by everyone" 
ON public.categories FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" 
ON public.categories FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Posts policies
CREATE POLICY "Published posts are viewable by everyone" 
ON public.posts FOR SELECT 
USING (published = true OR author_id = auth.uid());

CREATE POLICY "Users can create their own posts" 
ON public.posts FOR INSERT 
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors and admins can update posts" 
ON public.posts FOR UPDATE 
USING (
  author_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Videos policies
CREATE POLICY "Published videos are viewable by everyone" 
ON public.videos FOR SELECT 
USING (published = true OR author_id = auth.uid());

CREATE POLICY "Users can create their own videos" 
ON public.videos FOR INSERT 
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors and admins can update videos" 
ON public.videos FOR UPDATE 
USING (
  author_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Tags policies
CREATE POLICY "Tags are viewable by everyone" 
ON public.tags FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create tags" 
ON public.tags FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Junction tables policies
CREATE POLICY "Post tags are viewable by everyone" 
ON public.post_tags FOR SELECT USING (true);

CREATE POLICY "Authors can manage post tags" 
ON public.post_tags FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.posts 
    WHERE id = post_id AND author_id = auth.uid()
  )
);

CREATE POLICY "Video tags are viewable by everyone" 
ON public.video_tags FOR SELECT USING (true);

CREATE POLICY "Authors can manage video tags" 
ON public.video_tags FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.videos 
    WHERE id = video_id AND author_id = auth.uid()
  )
);

-- Likes policies
CREATE POLICY "Likes are viewable by everyone" 
ON public.likes FOR SELECT USING (true);

CREATE POLICY "Users can manage their own likes" 
ON public.likes FOR ALL 
USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Approved comments are viewable by everyone" 
ON public.comments FOR SELECT USING (approved = true);

CREATE POLICY "Users can create comments" 
ON public.comments FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" 
ON public.comments FOR UPDATE 
USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_videos_updated_at
BEFORE UPDATE ON public.videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default categories
INSERT INTO public.categories (name, slug, description) VALUES
('Notícias', 'noticias', 'Notícias gerais e atualizações'),
('Vídeos', 'videos', 'Conteúdo em vídeo'),
('Tecnologia', 'tecnologia', 'Novidades em tecnologia'),
('Política', 'politica', 'Assuntos políticos'),
('Esportes', 'esportes', 'Cobertura esportiva');

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public) VALUES ('content-images', 'content-images', true);

-- Create storage policies
CREATE POLICY "Content images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'content-images');

CREATE POLICY "Authenticated users can upload content images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'content-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own content images" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'content-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own content images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'content-images' AND auth.uid()::text = (storage.foldername(name))[1]);