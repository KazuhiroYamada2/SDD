import { useState } from 'react';
import { updateCustomer, type Customer, type UpdateCustomerInput } from '../api/customers';
import { useAuthenticatedApi } from '../auth/useAuthenticatedApi';

type EditableField = 'name' | 'name_kana' | 'email' | 'phone' | 'address' | 'category';
type Values = Record<EditableField, string>;
type Props = { customer: Customer; onCancel: () => void; onSaved: () => void };

const fields: { key: EditableField; label: string; type?: string }[] = [
  { key: 'name', label: '顧客名' },
  { key: 'name_kana', label: '顧客名（カナ）' },
  { key: 'email', label: 'メールアドレス', type: 'email' },
  { key: 'phone', label: '電話番号' },
  { key: 'address', label: '住所' },
  { key: 'category', label: '分類' },
];

const initialValues = (customer: Customer): Values => ({
  name: customer.name,
  name_kana: customer.name_kana ?? '',
  email: customer.email ?? '',
  phone: customer.phone ?? '',
  address: customer.address ?? '',
  category: customer.category ?? '',
});

export function CustomerEditScreen({ customer, onCancel, onSaved }: Props) {
  const runAuthenticated = useAuthenticatedApi();
  const [values, setValues] = useState(() => initialValues(customer));
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (values.name.trim() === '') {
      setError('顧客名を入力してください。');
      return;
    }
    if (values.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
      setError('メールアドレスの形式で入力してください。');
      return;
    }

    const original = initialValues(customer);
    const input: UpdateCustomerInput = {};
    for (const { key } of fields) {
      const next = values[key].trim();
      const normalized: string | null = key === 'name' ? next : (next === '' ? null : next);
      const previous: string | null = key === 'name' ? original[key].trim() : (original[key].trim() === '' ? null : original[key].trim());
      if (normalized !== previous) input[key] = normalized as never;
    }
    if (Object.keys(input).length === 0) {
      setError('変更する項目がありません。');
      return;
    }

    setIsSubmitting(true);
    try {
      await runAuthenticated((token) => updateCustomer(customer.id, input, token));
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '顧客情報を更新できませんでした。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return <main>
    <section aria-labelledby="customer-edit-heading" className="customer-edit">
      <h1 id="customer-edit-heading">顧客情報を編集</h1>
      {error && <p role="alert">{error}</p>}
      <form noValidate onSubmit={submit}>
        {fields.map(({ key, label, type }) => <div className="form-field" key={key}>
          <label htmlFor={`customer-edit-${key}`}>{label}</label>
          <input
            id={`customer-edit-${key}`}
            name={key}
            type={type}
            value={values[key]}
            onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))}
          />
        </div>)}
        <button type="submit" disabled={isSubmitting}>{isSubmitting ? '保存中…' : '保存する'}</button>
        <button type="button" disabled={isSubmitting} onClick={onCancel}>キャンセル</button>
      </form>
    </section>
  </main>;
}
