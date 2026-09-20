import { useState } from 'react';
import { getStaffPerformance, type StaffPerformanceResponse } from '../api/reports';
import { formatSalesAmount } from './report-format';

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

  if (values.from.length === 0) {
    errors.from = '開始日を入力してください。';
  }

  if (values.to.length === 0) {
    errors.to = '終了日を入力してください。';
  }

  if (values.from.length > 0 && values.to.length > 0 && values.from > values.to) {
    errors.from = '開始日は終了日以前の日付を指定してください。';
  }

  return errors;
};

export function StaffPerformanceReport() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [staffPerformance, setStaffPerformance] = useState<StaffPerformanceResponse | null>(null);
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
    setStaffPerformance(null);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsLoading(true);
    try {
      setStaffPerformance(await getStaffPerformance(values.from, values.to));
    } catch (error) {
      setApiError(error instanceof Error ? error.message : '営業担当者別実績を取得できませんでした。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section aria-labelledby="staff-performance-heading" className="report-section">
      <h2 id="staff-performance-heading">営業担当者別実績</h2>
      <form noValidate onSubmit={submit}>
        <div className="form-field">
          <label htmlFor="staff-performance-from">開始日</label>
          <input id="staff-performance-from" name="from" type="date" value={values.from} onChange={(event) => updateValue('from', event.target.value)} aria-invalid={errors.from !== undefined} aria-describedby={errors.from ? 'staff-performance-from-error' : undefined} />
          {errors.from && <p id="staff-performance-from-error" role="alert">{errors.from}</p>}
        </div>

        <div className="form-field">
          <label htmlFor="staff-performance-to">終了日</label>
          <input id="staff-performance-to" name="to" type="date" value={values.to} onChange={(event) => updateValue('to', event.target.value)} aria-invalid={errors.to !== undefined} aria-describedby={errors.to ? 'staff-performance-to-error' : undefined} />
          {errors.to && <p id="staff-performance-to-error" role="alert">{errors.to}</p>}
        </div>

        <button type="submit" disabled={isLoading}>{isLoading ? '表示中...' : '表示'}</button>
      </form>

      {isLoading && <p role="status">営業担当者別実績を読み込み中...</p>}
      {apiError && <p role="alert">{apiError}</p>}
      {staffPerformance !== null && staffPerformance.items.length === 0 && <p>対象期間の営業実績データはありません。</p>}

      {staffPerformance !== null && staffPerformance.items.length > 0 && (
        <table>
          <caption>営業担当者別実績</caption>
          <thead><tr><th scope="col">営業担当者</th><th scope="col">売上金額</th><th scope="col">売上件数</th></tr></thead>
          <tbody>
            {staffPerformance.items.map((item) => (
              <tr key={item.staffId}><td>{item.staffEmail}</td><td>{formatSalesAmount(item.salesAmount)}</td><td>{item.salesCount}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
