// ZapSign API configuration
const ZAPSIGN_API_TOKEN = process.env.ZAPSIGN_API_TOKEN;
const ZAPSIGN_TEMPLATE_ORDER = process.env.ZAPSIGN_TEMPLATE_ORDER;
const ZAPSIGN_TEMPLATE_DIRECT_ORDER = process.env.ZAPSIGN_TEMPLATE_DIRECT_ORDER;

const ZAPSIGN_BASE_URL = 'https://api.zapsign.com.br/api/v1';

type OrderType = 'ORDER' | 'DIRECT_ORDER';

function getTemplateId(orderType: OrderType): string | undefined {
  return orderType === 'DIRECT_ORDER'
    ? ZAPSIGN_TEMPLATE_DIRECT_ORDER
    : ZAPSIGN_TEMPLATE_ORDER;
}

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

type CreateDocumentResult =
  | { success: true; docToken: string; signerToken: string; signUrl: string }
  | { success: false; error: string };

/**
 * Create a document from the configured ZapSign template.
 * Graceful degradation: returns an error result (never throws) if env vars are missing or the API call fails.
 */
export async function createDocumentFromTemplate(
  signerName: string,
  signerEmail: string,
  orderType: OrderType = 'ORDER'
): Promise<CreateDocumentResult> {
  const templateId = getTemplateId(orderType);

  if (!ZAPSIGN_API_TOKEN || !templateId) {
    console.warn('ZapSign not configured — missing ZAPSIGN_API_TOKEN or template for', orderType);
    return { success: false, error: 'ZapSign is not configured' };
  }

  try {
    const response = await fetch(`${ZAPSIGN_BASE_URL}/models/create-doc/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ZAPSIGN_API_TOKEN}`,
      },
      body: JSON.stringify({
        template_id: templateId,
        signer_name: signerName,
        signer_email: signerEmail,
        send_automatic_email: false,
        send_automatic_whatsapp: false,
        lang: 'pt-br',
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
