// ZapSign API configuration
const ZAPSIGN_API_TOKEN = process.env.ZAPSIGN_API_TOKEN;

const ZAPSIGN_BASE_URL = process.env.ZAPSIGN_BASE_URL ?? 'https://api.zapsign.com.br/api/v1';

const brand_logo_url = new URL('/logo-white.png', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')

const brand_primary_color = "#407BFF"

const redirect_url = new URL('/dashboard/after-signature', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000')

interface ZapSignSigner {
  token: string;
  sign_url: string;
  status: string;
  name: string;
  email: string;
}

interface ZapSignResponse {
  token: string;
  status: string;
  name: string;
  signers: ZapSignSigner[];
}

export type CreateDocumentResult =
  | { success: true; docToken: string; signerToken: string; signUrl: string }
  | { success: false; error: string };

/**
 * Create a document by uploading a base64-encoded PDF to ZapSign.
 * @see https://docs.zapsign.com.br/documentos/criar-documento
 */
export async function createDocumentFromPdf(
  pdfBase64: string,
  documentName: string,
  profile: {
    id: string;
    email: string;
    phone: string | null;
    fullName: string | null;
    taxId: string | null
}
): Promise<CreateDocumentResult> {
  if (!ZAPSIGN_API_TOKEN) {
    console.warn('ZapSign not configured — missing ZAPSIGN_API_TOKEN');
    return { success: false, error: 'ZapSign is not configured' };
  }

  try {
    const response = await fetch(`${ZAPSIGN_BASE_URL}/docs/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ZAPSIGN_API_TOKEN}`,
      },
      body: JSON.stringify({
        name: documentName,
        base64_pdf: pdfBase64,
        signers: [
          { name: profile.fullName,
            email: profile.email,
            external_id: profile.id,
            phone_country: "55",
            phone_number: profile.phone,
            cpf: profile.taxId,
            redirect_link: redirect_url
          }
        ],
        lang: "pt-br",
        brand_name: "Soulglobal",
        brand_logo: brand_logo_url,
        brand_primary_color: brand_primary_color,

      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error('ZapSign create-doc failed:', response.status, body);
      return { success: false, error: `ZapSign API error: ${response.status}` };
    }

    const data: ZapSignResponse = await response.json();

    const signer = data.signers?.[0];
    if (!signer) {
      console.error('ZapSign response missing signers:', data);
      return { success: false, error: 'ZapSign response did not include a signer' };
    }

    return {
      success: true,
      docToken: data.token,
      signerToken: signer.token,
      signUrl: signer.sign_url,
    };
  } catch (error) {
    console.error('ZapSign create-doc error:', error);
    return { success: false, error: 'Failed to connect to ZapSign API' };
  }
}

/**
 * Add an attachment (amendment) to an existing signed document.
 * @see https://docs.zapsign.com.br/documentos/adicionar-anexo-documento-extra-1
 */
export async function addDocumentAttachment(
  docToken: string,
  attachmentName: string,
  pdfBase64: string
): Promise<{ success: boolean; error?: string }> {
  if (!ZAPSIGN_API_TOKEN) {
    return { success: false, error: 'ZapSign is not configured' };
  }

  try {
    const response = await fetch(`${ZAPSIGN_BASE_URL}/docs/${docToken}/add-attachment/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ZAPSIGN_API_TOKEN}`,
      },
      body: JSON.stringify({
        name: attachmentName,
        base64_pdf: pdfBase64,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { success: false, error: `ZapSign API error: ${response.status} ${body}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: `Failed to connect to ZapSign: ${error}` };
  }
}

/**
 * Cancel (delete) a document on ZapSign.
 * Fire-and-forget safe — logs errors but does not throw.
 * @see https://docs.zapsign.com.br/documentos/deletar-documento
 */
export async function cancelDocument(
  docToken: string,
): Promise<{ success: boolean; error?: string }> {
  if (!ZAPSIGN_API_TOKEN) {
    return { success: false, error: 'ZapSign is not configured' };
  }

  try {
    const response = await fetch(`${ZAPSIGN_BASE_URL}/docs/${docToken}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${ZAPSIGN_API_TOKEN}` },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error('ZapSign cancel-doc failed:', response.status, body);
      return { success: false, error: `ZapSign API error: ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    console.error('ZapSign cancel-doc error:', error);
    return { success: false, error: 'Failed to connect to ZapSign API' };
  }
}

/**
 * Retrieve the signer's sign_url from an existing ZapSign document.
 * Used to let clients resume signing after navigating away.
 */
export async function getSignerSignUrl(
  docToken: string,
): Promise<{ success: true; signUrl: string } | { success: false; error: string }> {
  if (!ZAPSIGN_API_TOKEN) {
    return { success: false, error: 'ZapSign is not configured' };
  }

  try {
    const response = await fetch(`${ZAPSIGN_BASE_URL}/docs/${docToken}/`, {
      headers: { Authorization: `Bearer ${ZAPSIGN_API_TOKEN}` },
    });

    if (!response.ok) {
      return { success: false, error: `ZapSign API error: ${response.status}` };
    }

    const data = await response.json() as ZapSignResponse;
    const signer = data.signers?.[0];
    if (!signer?.sign_url) {
      return { success: false, error: 'Sign URL not found' };
    }

    return { success: true, signUrl: signer.sign_url };
  } catch (error) {
    console.error('ZapSign get-sign-url error:', error);
    return { success: false, error: 'Failed to connect to ZapSign API' };
  }
}

/**
 * Verify document status via ZapSign API (used to validate webhooks).
 * Returns true if the document exists and has status "signed".
 */
export async function verifyDocumentSigned(docToken: string): Promise<boolean> {
  if (!ZAPSIGN_API_TOKEN) return false;

  try {
    const response = await fetch(`${ZAPSIGN_BASE_URL}/docs/${docToken}/`, {
      headers: { Authorization: `Bearer ${ZAPSIGN_API_TOKEN}` },
    });

    if (!response.ok) return false;

    const data = await response.json() as { status?: string };
    return data.status === 'signed';
  } catch {
    console.error('ZapSign verify-doc error for token:', docToken);
    return false;
  }
}
