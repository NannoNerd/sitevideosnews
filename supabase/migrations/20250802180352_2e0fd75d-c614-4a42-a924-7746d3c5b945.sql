-- Enable real-time for comments table
ALTER TABLE public.comments REPLICA IDENTITY FULL;

-- Add table to real-time publication (if not already added)
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;