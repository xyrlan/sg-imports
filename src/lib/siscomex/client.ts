/**
 * Siscomex Portal Único API Client
 * Fetches DUIMP data (taxes, channel, declaration info)
 */

const BASE_URL = process.env.SISCOMEX_BASE_URL;
const CERTIFICATE = process.env.SISCOMEX_CERTIFICATE;

export interface DuimpData {
  numero: string;
  canal: 'VERDE' | 'AMARELO' | 'VERMELHO' | 'CINZA';
  impostos: {
    ii: number; // II - Imposto de Importação
    ipi: number; // IPI - Imposto sobre Produtos Industrializados
    pis: number; // PIS - Programa de Integração Social
    cofins: number; // COFINS - Contribuição para o Financiamento da Seguridade Social
    taxaSiscomex: number;
  };
  declaracao: Record<string, unknown>;
}

type DuimpChannelMap = {
  VERDE: 'GREEN';
  AMARELO: 'YELLOW';
  VERMELHO: 'RED';
  CINZA: 'GREY';
};

const CHANNEL_MAP: DuimpChannelMap = {
  VERDE: 'GREEN',
  AMARELO: 'YELLOW',
  VERMELHO: 'RED',
  CINZA: 'GREY',
};

export type FetchDuimpResult =
  | { success: true; data: DuimpData; channel: 'GREEN' | 'YELLOW' | 'RED' | 'GREY' }
  | { success: false; error: string };

export async function fetchDuimpData(duimpNumber: string): Promise<FetchDuimpResult> {
  if (!BASE_URL || !CERTIFICATE) {
    return { success: false, error: 'Siscomex API is not configured' };
  }

  try {
    const res = await fetch(`${BASE_URL}/duimp/${duimpNumber}`, {
      headers: {
        Authorization: `Bearer ${CERTIFICATE}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { success: false, error: `Siscomex API error ${res.status}: ${text}` };
    }

    const data = (await res.json()) as DuimpData;
    const channel = CHANNEL_MAP[data.canal] ?? 'GREEN';

    return { success: true, data, channel };
  } catch (error) {
    return { success: false, error: `Failed to connect to Siscomex: ${error}` };
  }
}
