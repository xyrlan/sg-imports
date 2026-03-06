import { createClient } from '@/lib/supabase/server';

/**
 * Upload a profile document to Supabase Storage
 * @param file - File to upload
 * @param userId - User ID (profile ID)
 * @param type - Type of document ('document' or 'address')
 * @returns Public URL of the uploaded file
 */
export async function uploadProfileDocument(
  file: File,
  userId: string,
  type: 'document' | 'address'
): Promise<string> {
  const supabase = await createClient();
  
  // Get file extension
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  const fileName = `${type}-${Date.now()}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  // Convert File to ArrayBuffer for Supabase Storage
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('onboarding-documents')
    .upload(filePath, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('Error uploading profile document:', error);
    throw new Error(`Erro ao fazer upload do documento: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('onboarding-documents')
    .getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Upload an organization document to Supabase Storage
 * Path uses userId as first segment to satisfy RLS: (storage.foldername(name))[1] = auth.uid()
 * @param file - File to upload
 * @param userId - User ID (must match auth.uid() for RLS)
 * @param orgId - Organization ID
 * @returns Public URL of the uploaded file
 */
export async function uploadOrganizationDocument(
  file: File,
  userId: string,
  orgId: string
): Promise<string> {
  const supabase = await createClient();
  
  // Get file extension
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  const fileName = `social-contract-${Date.now()}.${fileExt}`;
  const filePath = `${userId}/organizations/${orgId}/${fileName}`;

  // Convert File to ArrayBuffer for Supabase Storage
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('onboarding-documents')
    .upload(filePath, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    console.error('Error uploading organization document:', error);
    throw new Error(`Erro ao fazer upload do documento: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('onboarding-documents')
    .getPublicUrl(filePath);

  return publicUrl;
}

/**
 * Validate file type and size
 * @param file - File to validate
 * @param maxSizeMB - Maximum file size in MB (default 10MB)
 * @returns Object with validation result
 */
export function validateFile(
  file: File,
  maxSizeMB: number = 10
): { valid: boolean; error?: string } {
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`,
    };
  }

  // Check file type
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Tipo de arquivo não permitido. Use PDF, JPG, PNG ou WebP',
    };
  }

  return { valid: true };
}

/**
 * Validate image file type and size
 * @param file - File to validate
 * @param maxSizeMB - Maximum file size in MB (default 5MB)
 * @returns Object with validation result
 */
export function validateImageFile(
  file: File,
  maxSizeMB: number = 5
): { valid: boolean; error?: string } {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Imagem muito grande. Tamanho máximo: ${maxSizeMB}MB`,
    };
  }

  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Tipo de arquivo não permitido. Use JPG, PNG, WebP ou GIF',
    };
  }

  return { valid: true };
}

/** Create bucket "product-images" in Supabase Storage (public) with RLS for authenticated users */
const PRODUCT_IMAGES_BUCKET = 'product-images';

/**
 * Upload product photos to Supabase Storage
 * @param files - Array of image files to upload
 * @param userId - User ID (for RLS path)
 * @param organizationId - Organization ID
 * @returns Array of public URLs
 */
export async function uploadProductPhotos(
  files: File[],
  userId: string,
  organizationId: string
): Promise<string[]> {
  if (files.length === 0) return [];

  const supabase = await createClient();
  const timestamp = Date.now();
  const basePath = `${userId}/organizations/${organizationId}/products`;

  const uploadPromises = files.map(async (file, index) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${timestamp}-${index}.${fileExt}`;
    const filePath = `${basePath}/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('Error uploading product photo:', error);
      throw new Error(`Erro ao fazer upload da imagem: ${error.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .getPublicUrl(filePath);

    return publicUrl;
  });

  return Promise.all(uploadPromises);
}
