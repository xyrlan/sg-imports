import { db } from '@/db';
import { shipmentDocuments } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { uploadToSupabase } from '@/services/upload.service';

/** Upload a file to Supabase Storage and create a shipmentDocument record */
export async function uploadShipmentDocument(params: {
  shipmentId: string;
  type: string;
  name: string;
  file: File;
  uploadedById: string;
  metadata?: Record<string, unknown>;
}) {
  const fileExt = params.file.name.split('.').pop()?.toLowerCase();
  const filePath = `shipments/${params.shipmentId}/${params.type}-${Date.now()}.${fileExt}`;

  const publicUrl = await uploadToSupabase({
    bucket: 'shipment-documents',
    filePath,
    file: params.file,
  });

  const [doc] = await db
    .insert(shipmentDocuments)
    .values({
      shipmentId: params.shipmentId,
      type: params.type as any,
      name: params.name,
      url: publicUrl,
      uploadedById: params.uploadedById,
      metadata: params.metadata,
    })
    .returning();

  return doc;
}

/** Get documents for a shipment, optionally filtered by type */
export async function getShipmentDocumentsByType(shipmentId: string, type?: string) {
  if (type) {
    return db.query.shipmentDocuments.findMany({
      where: and(
        eq(shipmentDocuments.shipmentId, shipmentId),
        eq(shipmentDocuments.type, type as any)
      ),
    });
  }
  return db.query.shipmentDocuments.findMany({
    where: eq(shipmentDocuments.shipmentId, shipmentId),
  });
}
