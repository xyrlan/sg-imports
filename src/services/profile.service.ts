import { db } from '@/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import type { InferSelectModel } from 'drizzle-orm';

type Profile = InferSelectModel<typeof profiles>;

export interface UpdateProfileData {
  fullName?: string;
  avatarUrl?: string;
  phone?: string;
  documentPhotoUrl?: string;
  addressProofUrl?: string;
}

/**
 * Get profile by user ID
 * @param userId - Profile ID from Supabase Auth
 * @returns Profile or null if not found
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, userId),
  });

  return profile || null;
}

/**
 * Update profile data
 * @param userId - Profile ID from Supabase Auth
 * @param data - Updated profile data
 * @returns Updated profile or null if not found
 */
export async function updateProfile(
  userId: string,
  data: UpdateProfileData
): Promise<Profile | null> {
  const [updatedProfile] = await db
    .update(profiles)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId))
    .returning();

  return updatedProfile || null;
}

/**
 * Check if profile has completed document uploads
 * @param userId - Profile ID from Supabase Auth
 * @returns True if both documents are uploaded
 */
export async function checkProfileDocumentsComplete(userId: string): Promise<boolean> {
  const profile = await getProfile(userId);
  
  if (!profile) {
    return false;
  }

  return !!(profile.documentPhotoUrl && profile.addressProofUrl);
}
