import { createClient } from '@/lib/supabase/server';

/**
 * Upload a file to Supabase Storage and return the public URL.
 */
export async function uploadToSupabase(params: {
  bucket: string;
  filePath: string;
  file: File;
  contentType?: string;
}): Promise<string> {
  const supabase = await createClient();

  const arrayBuffer = await params.file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabase.storage
    .from(params.bucket)
    .upload(params.filePath, buffer, {
      contentType: params.contentType ?? params.file.type,
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from(params.bucket)
    .getPublicUrl(params.filePath);

  return publicUrl;
}

/**
 * Upload a profile document to Supabase Storage
 */
export async function uploadProfileDocument(
  file: File,
  userId: string,
  type: 'document' | 'address'
): Promise<string> {
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  const filePath = `${userId}/${type}-${Date.now()}.${fileExt}`;
  return uploadToSupabase({ bucket: 'onboarding-documents', filePath, file });
}

/**
 * Upload an organization document to Supabase Storage
 * Path uses userId as first segment to satisfy RLS: (storage.foldername(name))[1] = auth.uid()
 */
export async function uploadOrganizationDocument(
  file: File,
  userId: string,
  orgId: string
): Promise<string> {
  const fileExt = file.name.split('.').pop()?.toLowerCase();
  const filePath = `${userId}/organizations/${orgId}/social-contract-${Date.now()}.${fileExt}`;
  return uploadToSupabase({ bucket: 'onboarding-documents', filePath, file });
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

const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/x-png', // alternative PNG MIME (some browsers/OS)
  'image/webp',
  'image/gif',
];

const ALLOWED_IMAGE_EXTENSIONS = ['jpeg', 'jpg', 'png', 'webp', 'gif'];

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

  const mimeValid = file.type && ALLOWED_IMAGE_MIME_TYPES.includes(file.type);
  const ext = file.name.split('.').pop()?.toLowerCase();
  const extValid = ext && ALLOWED_IMAGE_EXTENSIONS.includes(ext);

  if (!mimeValid && !extValid) {
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

  const timestamp = Date.now();
  const basePath = `${userId}/organizations/${organizationId}/products`;

  const uploadPromises = files.map(async (file, index) => {
    const validation = validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filePath = `${basePath}/${timestamp}-${index}.${fileExt}`;

    const contentType =
      file.type && ALLOWED_IMAGE_MIME_TYPES.includes(file.type)
        ? file.type === 'image/x-png'
          ? 'image/png'
          : file.type
        : `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;

    return uploadToSupabase({ bucket: PRODUCT_IMAGES_BUCKET, filePath, file, contentType });
  });

  return Promise.all(uploadPromises);
}

const SHIPMENT_DOCUMENTS_BUCKET = 'shipment-documents';

/**
 * Upload observation documents (PDF, JPG, PNG, WebP) to Supabase Storage
 * @param files - Array of files to upload
 * @param userId - User ID (for RLS path)
 * @param quoteId - Quote ID
 * @returns Array of { name, url } objects
 */
export async function uploadObservationDocuments(
  files: File[],
  userId: string,
  quoteId: string
): Promise<{ name: string; url: string }[]> {
  if (files.length === 0) return [];

  const timestamp = Date.now();
  const basePath = `${userId}/quotes/${quoteId}/observations`;

  const uploadPromises = files.map(async (file, index) => {
    const validation = validateFile(file, 10);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const filePath = `${basePath}/${timestamp}-${index}.${fileExt}`;

    const url = await uploadToSupabase({ bucket: SHIPMENT_DOCUMENTS_BUCKET, filePath, file });
    return { name: file.name, url };
  });

  return Promise.all(uploadPromises);
}
