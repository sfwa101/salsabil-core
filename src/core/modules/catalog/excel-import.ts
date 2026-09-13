// src/core/modules/catalog/excel-import.ts
// قراءة ملف Excel المرفوع من التاجر — قالب 3 أعمدة فقط (قرار مؤسس صريح): اسم المنتج، الكمية،
// التكلفة. لا سعر بيع هنا إطلاقاً (يحدده المالك فقط عبر الكتالوج الأساسي). لا وصول لقاعدة بيانات
// هنا — تحليل/تحقق بحت، نفس نمط validation/schemas.ts (يعيش عند حافة النظام، لا طبقة الأعمال).

import ExcelJS from 'exceljs';
import type { MerchantImportRow, MerchantImportRowError } from './types';

export interface ParsedImportFile {
  rows: MerchantImportRow[];
  errors: MerchantImportRowError[];
}

// مطابقة عناوين الأعمدة — عربي/إنجليزي، بلا حساسية لحالة الأحرف/المسافات الزائدة، لتفادي رفض ملف
// تاجر فقط لأن عنوان عمود مكتوب بصيغة مختلفة قليلاً.
const NAME_HEADERS = ['اسم المنتج', 'اسم', 'name', 'product name'];
const QUANTITY_HEADERS = ['الكمية', 'كمية', 'quantity', 'qty'];
const COST_HEADERS = ['التكلفة', 'تكلفة', 'cost', 'cost price'];

function normalizeHeader(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function findColumn(headerRow: ExcelJS.Row, candidates: string[]): number | null {
  let found: number | null = null;
  headerRow.eachCell((cell, colNumber) => {
    if (found !== null) return;
    if (candidates.includes(normalizeHeader(cell.value))) found = colNumber;
  });
  return found;
}

export async function parseMerchantImportFile(buffer: Buffer): Promise<ParsedImportFile> {
  const workbook = new ExcelJS.Workbook();
  try {
    // exceljs's bundled .d.ts predates the newer resizable-ArrayBuffer Buffer shape in @types/node —
    // structural TS mismatch only, not a runtime one (Buffer.from() still returns a real Buffer).
    await workbook.xlsx.load(buffer as any);
  } catch {
    return { rows: [], errors: [{ row: 0, message: 'تعذّرت قراءة الملف — تأكد أنه بصيغة Excel (.xlsx) صحيحة' }] };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) {
    return { rows: [], errors: [{ row: 0, message: 'الملف فارغ أو لا يحتوي صفوف بيانات بعد صف العناوين' }] };
  }

  const headerRow = sheet.getRow(1);
  const nameCol = findColumn(headerRow, NAME_HEADERS);
  const qtyCol = findColumn(headerRow, QUANTITY_HEADERS);
  const costCol = findColumn(headerRow, COST_HEADERS);

  if (!nameCol || !qtyCol || !costCol) {
    return {
      rows: [],
      errors: [{ row: 1, message: 'صف العناوين يجب أن يحتوي 3 أعمدة: اسم المنتج، الكمية، التكلفة' }],
    };
  }

  const rows: MerchantImportRow[] = [];
  const errors: MerchantImportRowError[] = [];

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
    const row = sheet.getRow(rowNumber);
    const name = String(row.getCell(nameCol).value ?? '').trim();
    const quantityRaw = row.getCell(qtyCol).value;
    const costRaw = row.getCell(costCol).value;

    if (!name && (quantityRaw === null || quantityRaw === undefined) && (costRaw === null || costRaw === undefined)) {
      continue; // صف فارغ كلياً (نهاية البيانات الفعلية) — يُتجاهَل بصمت، ليس خطأً
    }

    if (!name) {
      errors.push({ row: rowNumber, message: 'اسم المنتج فارغ' });
      continue;
    }

    const quantity = Number(quantityRaw);
    if (!Number.isFinite(quantity) || quantity < 0 || !Number.isInteger(quantity)) {
      errors.push({ row: rowNumber, message: `الكمية غير صحيحة: "${String(quantityRaw)}"` });
      continue;
    }

    const costPrice = Number(costRaw);
    if (!Number.isFinite(costPrice) || costPrice < 0) {
      errors.push({ row: rowNumber, message: `التكلفة غير صحيحة: "${String(costRaw)}"` });
      continue;
    }

    rows.push({ name, quantity, costPrice });
  }

  return { rows, errors };
}
