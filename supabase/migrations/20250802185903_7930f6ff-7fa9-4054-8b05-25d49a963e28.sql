-- Add example durations to existing videos
UPDATE public.videos 
SET duration = '15:30' 
WHERE youtube_video_id = '6OQlwDrGY2k';

UPDATE public.videos 
SET duration = '8:45' 
WHERE youtube_video_id = 'KTi9GDdRu-s';

UPDATE public.videos 
SET duration = '12:20' 
WHERE youtube_video_id = 'uJryRF3JIBQ';