import { useState } from 'react';
import { deleteCustomer, type Customer } from '../api/customers';
import { useAuthenticatedApi } from '../auth/useAuthenticatedApi';

type Props = {
  customer: Customer;
  onCancel: () => void;
  onDeleted: () => void;
};

export function CustomerDeleteConfirmation({ customer, onCancel, onDeleted }: Props) {
  const runAuthenticated = useAuthenticatedApi();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const confirmDelete = async () => {
    setError('');
    setIsDeleting(true);
    try {
      await runAuthenticated((token) => deleteCustomer(customer.id, token));
      onDeleted();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '顧客情報を削除できませんでした。');
    } finally {
      setIsDeleting(false);
    }
  };

  return <main>
    <section aria-labelledby="customer-delete-heading">
      <h1 id="customer-delete-heading">顧客を削除</h1>
      <p>「{customer.name}」を削除しますか？</p>
      {error && <p role="alert">{error}</p>}
      <button type="button" disabled={isDeleting} onClick={() => void confirmDelete()}>
        {isDeleting ? '削除中…' : '削除する'}
      </button>
      <button type="button" disabled={isDeleting} onClick={onCancel}>キャンセル</button>
    </section>
  </main>;
}
