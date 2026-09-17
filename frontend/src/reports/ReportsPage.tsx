import { useState } from 'react';
import { getSalesTrend, type SalesTrendResponse } from '../api/reports';

type Props = {
  onBack: () => void;
};

type FormValues = {
  from: string;
  to: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

const initialValues: FormValues = {
  from: '',
  to: '',
};

const validate = (values: FormValues): FormErrors => {
  const errors: FormErrors = {};
  if (values.from === '') {
    errors.from = '開始日を入力してください。';
  }
  if (values.to === '') {
    errors.to = '終了日を入力してください。';
  }
  if (values.from !== '' && values.to !== '' && values.from > values.to) {
    errors.to = '開始日は終了日以前の日付を指定してください。';
  }
  return errors;
};

const formatSalesAmount = (salesAmount: string): string => {
  const [integer, decimal = ''] = salesAmount.split('.');
  const sign = integer.startsWith('-') ? '-' : '';
  const absoluteInteger = sign === '' ? integer : integer.slice(1);
  const groupedInteger = absoluteInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${groupedInteger}.${decimal.padEnd(2, '0')}`;
};

export function ReportsPage({ onBack }: Props) {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [salesTrend, setSalesTrend] = useState<SalesTrendResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const updateValue = (field: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationErrors = validate(values);
    setErrors(validationErrors);
    setApiError('');

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsLoading(true);
    try {
      setSalesTrend(await getSalesTrend(values.from, values.to));
    } catch (error) {
      setApiError(error instanceof Error ? error.message : '売上推移を取得できませんでした。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main>
      <button type="button" onClick={onBack}>顧客登録画面に戻る</button>
      <h1>レポート</h1>

      <section aria-labelledby="sales-trend-heading" className="report-section">
        <h2 id="sales-trend-heading">売上推移</h2>
        <form noValidate onSubmit={submit}>
          <div className="form-field">
            <label htmlFor="sales-trend-from">開始日</label>
            <input
              id="sales-trend-from"
              name="from"
              type="date"
              value={values.from}
              onChange={(event) => updateValue('from', event.target.value)}
              aria-invalid={errors.from !== undefined}
              aria-describedby={errors.from ? 'sales-trend-from-error' : undefined}
            />
            {errors.from && <p id="sales-trend-from-error" role="alert">{errors.from}</p>}
          </div>

          <div className="form-field">
            <label htmlFor="sales-trend-to">終了日</label>
            <input
              id="sales-trend-to"
              name="to"
              type="date"
              value={values.to}
              onChange={(event) => updateValue('to', event.target.value)}
              aria-invalid={errors.to !== undefined}
              aria-describedby={errors.to ? 'sales-trend-to-error' : undefined}
            />
            {errors.to && <p id="sales-trend-to-error" role="alert">{errors.to}</p>}
          </div>

          <button type="submit" disabled={isLoading}>{isLoading ? '表示中...' : '表示'}</button>
        </form>

        {isLoading && <p role="status">売上推移を読み込み中...</p>}
        {apiError && <p role="alert">{apiError}</p>}

        {salesTrend !== null && salesTrend.items.length === 0 && <p>対象期間の売上データはありません。</p>}

        {salesTrend !== null && salesTrend.items.length > 0 && (
          <table>
            <caption>売上推移</caption>
            <thead>
              <tr>
                <th scope="col">月</th>
                <th scope="col">売上金額</th>
              </tr>
            </thead>
            <tbody>
              {salesTrend.items.map((item) => (
                <tr key={item.month}>
                  <td>{item.month}</td>
                  <td>{formatSalesAmount(item.salesAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section aria-labelledby="upcoming-reports-heading" className="report-section">
        <h2 id="upcoming-reports-heading">その他のレポート</h2>
        <p>顧客分類と営業担当者別実績は未実装です。</p>
      </section>
    </main>
  );
}
