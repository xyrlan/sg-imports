-- Product Images Storage Bucket & RLS Policies
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
--
-- Path format: {userId}/organizations/{organizationId}/products/{filename}
-- RLS allows uploads only when the first folder segment equals auth.uid()
--
-- If policies already exist, drop them first:
-- DROP POLICY IF EXISTS "product_images_insert_own_folder" ON storage.objects;
-- DROP POLICY IF EXISTS "product_images_select_own_folder" ON storage.objects;
-- DROP POLICY IF EXISTS "product_images_update_own_folder" ON storage.objects;
-- DROP POLICY IF EXISTS "product_images_public_select" ON storage.objects;

-- 1. Create the bucket (skip if already exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880,  -- 5MB per file
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. RLS: Allow authenticated users to INSERT into their own folder
-- Path must start with {auth.uid()}/...
CREATE POLICY "product_images_insert_own_folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. RLS: Allow authenticated users to SELECT/UPDATE their own files (for upsert)
CREATE POLICY "product_images_select_own_folder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "product_images_update_own_folder"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. RLS: Allow public SELECT for public bucket (images need to be viewable)
-- If bucket is public, unauthenticated users can access via URL.
-- This policy allows anyone to read from the bucket (required for public URLs).
CREATE POLICY "product_images_public_select"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');
