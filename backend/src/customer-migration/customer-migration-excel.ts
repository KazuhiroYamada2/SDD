import readXlsxFile from 'read-excel-file/node';
import type {
  ParsedCustomerMigrationWorkbook,
  RawCustomerMigrationRow,
} from './customer-migration-types.js';

const requiredSheetNames = [
  '概要',
  '既存顧客データ',
  '担当者マスタ',
  'カテゴリマスタ',
  'データ辞書',
  '演習ケース一覧',
] as const;

const customerHeaders = [
  '顧客番号', '顧客名', '顧客名カナ', 'メールアドレス', '電話番号', '住所',
  '顧客区分コード', '担当者メール', '登録日時', '更新日時', '削除フラグ', '削除日時', '備考',
] as const;
const ownerHeaders = ['担当者メール', '表示名', 'role', 'active', '備考'] as const;
const categoryHeaders = ['顧客区分コード', 'Target category', '備考'] as const;
const dictionaryHeaders = ['Source列', '意味', '想定型', '必須/任意', '例', 'Target', '変換方針', '検証', '暗号化', '備考'] as const;
const caseHeaders = ['ケース', 'Source顧客番号', '想定論点', '移行時の期待', '備考'] as const;

const assertHeaders = (sheetName: string, rows: readonly (readonly unknown[])[], expected: readonly string[]) => {
  const header = rows[0];
  if (header === undefined || expected.some((value, index) => header[index] !== value)) {
    throw new Error(`Customer migration workbook has invalid headers in sheet: ${sheetName}.`);
  }
};

const stringValue = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

export const parseCustomerMigrationWorkbook = async (
  inputPath: string,
): Promise<ParsedCustomerMigrationWorkbook> => {
  const sheets = await readXlsxFile(inputPath);
  const byName = new Map(sheets.map(({ sheet, data }) => [sheet, data]));
  for (const name of requiredSheetNames) {
    if (!byName.has(name)) throw new Error(`Customer migration workbook is missing required sheet: ${name}.`);
  }
  if (sheets.length !== requiredSheetNames.length) {
    throw new Error('Customer migration workbook contains unexpected or duplicate sheets.');
  }

  const customerRows = byName.get('既存顧客データ')!;
  const ownerRows = byName.get('担当者マスタ')!;
  const categoryRows = byName.get('カテゴリマスタ')!;
  assertHeaders('既存顧客データ', customerRows, customerHeaders);
  assertHeaders('担当者マスタ', ownerRows, ownerHeaders);
  assertHeaders('カテゴリマスタ', categoryRows, categoryHeaders);
  assertHeaders('データ辞書', byName.get('データ辞書')!, dictionaryHeaders);
  assertHeaders('演習ケース一覧', byName.get('演習ケース一覧')!, caseHeaders);

  const activeOwnerEmails = new Set<string>();
  const ownerEmails = new Set<string>();
  for (const [index, row] of ownerRows.slice(1).entries()) {
    const email = stringValue(row[0]);
    if (email === null) throw new Error(`Customer migration owner master has no email at row ${index + 2}.`);
    if (ownerEmails.has(email)) throw new Error('Customer migration owner master contains duplicate emails.');
    ownerEmails.add(email);
    if (row[3] === true || row[3] === 1) activeOwnerEmails.add(email);
    else if (row[3] !== false && row[3] !== 0) throw new Error('Customer migration owner master has an invalid active value.');
  }

  const categories = new Map<string, string>();
  for (const row of categoryRows.slice(1)) {
    const code = stringValue(row[0]);
    const category = stringValue(row[1]);
    if (code === null || category === null || categories.has(code)) {
      throw new Error('Customer migration category master is invalid.');
    }
    categories.set(code, category);
  }

  const customers: RawCustomerMigrationRow[] = customerRows.slice(1).map((row, index) => ({
    sourceRowNumber: index + 2,
    sourceCustomerId: row[0],
    name: row[1],
    nameKana: row[2],
    email: row[3],
    phone: row[4],
    address: row[5],
    categoryCode: row[6],
    ownerEmail: row[7],
    createdAt: row[8],
    updatedAt: row[9],
    deletionFlag: row[10],
    deletedAt: row[11],
  }));

  return { customers, activeOwnerEmails, categories };
};
