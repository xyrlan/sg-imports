import { db } from '@/db';
import { shipmentDocuments } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

/** Upload a file to Supabase Storage and create a shipmentDocument record */
export async function uploadShipmentDocument(params: {
  shipmentId: string;
  type: string;
  name: string;
  file: File;
  uploadedById: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();

  const fileExt = params.file.name.split('.').pop()?.toLowerCase();
  const fileName = `${params.type}-${Date.now()}.${fileExt}`;
  const filePath = `shipments/${params.shipmentId}/${fileName}`;

  const arrayBuffer = await params.file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error } = await supabase.storage
    .from('shipment-documents')
    .upload(filePath, buffer, {
      contentType: params.file.type,
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from('shipment-documents')
    .getPublicUrl(filePath);

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
