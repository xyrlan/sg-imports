import { getAuthenticatedUser } from '@/services/auth.service';
import { getOrganizationById } from '@/services/organization.service';
import { importProductsFromRows, type ImportRow } from '@/services/product.service';
import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import ExcelJS from 'exceljs';

function normalizeRow(row: Record<string, unknown>): ImportRow {
  const getStr = (key: string) => {
    const v = row[key];
    return v != null ? String(v).trim() : '';
  };
  const getNum = (key: string) => {
    const v = row[key];
    if (v == null) return 1;
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
    return isNaN(n) ? 1 : n;
  };

  return {
    sku: getStr('sku'),
    name: getStr('name'),
    description: getStr('description') || undefined,
    boxQuantity: getNum('boxQuantity'),
    boxWeight: getStr('boxWeight') || '0',
    variantName: getStr('variantName'),
    priceUsd: getStr('priceUsd'),
    height: getStr('height') || undefined,
    width: getStr('width') || undefined,
    length: getStr('length') || undefined,
    netWeight: getStr('netWeight') || undefined,
    unitWeight: getStr('unitWeight') || undefined,
  };
}

async function parseFile(file: File): Promise<ImportRow[]> {
  const buffer = await file.arrayBuffer();
  const filename = file.name.toLowerCase();

  if (filename.endsWith('.csv')) {
    const text = new TextDecoder('utf-8').decode(buffer);
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
      delimiter: ';',
      transformHeader: (h) => h.replace(/^"|"$/g, ''),
    });

    if (parsed.errors.length > 0) {
      throw new Error('CSV parse error: ' + parsed.errors.map((e) => e.message).join(', '));
    }

    return parsed.data.map(normalizeRow);
  }

  if (filename.endsWith('.xlsx')) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      throw new Error('No worksheet found');
    }

    const headerRow = worksheet.getRow(1);
    const headers: string[] = [];
    headerRow.eachCell({ includeEmpty: false }, (cell) => {
      headers.push(cell.value?.toString() ?? '');
    });

    const data: ImportRow[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const rowData: Record<string, unknown> = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber - 1] ?? '';
        const value = cell.value;
        if (value === null || value === undefined) {
          rowData[header] = '';
        } else if (typeof value === 'object' && 'text' in value) {
          rowData[header] = (value as { text?: string }).text ?? '';
        } else {
          rowData[header] = String(value);
        }
      });
      data.push(normalizeRow(rowData));
    });

    return data;
  }

  throw new Error('Unsupported file type. Use CSV or XLSX.');
}

/**
 * POST /api/products/import
 * Import products from CSV/XLSX (FormData: file, organizationId)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const organizationId = formData.get('organizationId') as string | null;

    if (!file || !organizationId) {
      return NextResponse.json(
        { message: 'file and organizationId are required' },
        { status: 400 }
      );
    }

    const access = await getOrganizationById(organizationId, user.id);

    if (!access) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const rows = await parseFile(file);

    if (rows.length === 0) {
      return NextResponse.json(
        { message: 'The file is empty' },
        { status: 400 }
      );
    }

    const result = await importProductsFromRows(organizationId, rows);

    return NextResponse.json(result);
  } catch (err) {
    console.error('POST /api/products/import:', err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
