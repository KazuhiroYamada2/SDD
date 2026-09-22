import { useEffect, useState } from 'react';
import {
  getCustomers,
  type CustomerListResponse,
  type CustomerListSort,
} from '../api/customers';
import { useAuthenticatedApi } from '../auth/useAuthenticatedApi';

type Props = {
  onBack: () => void;
  onSelectCustomer: (customerId: string) => void;
  listState: CustomerListState;
  setListState: React.Dispatch<React.SetStateAction<CustomerListState>>;
};

export type CustomerListState = {
  queryInput: string;
  categoryInput: string;
  appliedQuery: string;
  appliedCategory: string;
  sort: CustomerListSort;
  pageSize: 20 | 50 | 100;
  page: number;
};

export const initialCustomerListState: CustomerListState = {
  queryInput: '',
  categoryInput: '',
  appliedQuery: '',
  appliedCategory: '',
  sort: 'name_asc',
  pageSize: 20,
  page: 1,
};

export function CustomerList({ onBack, onSelectCustomer, listState, setListState }: Props) {
  const runAuthenticated = useAuthenticatedApi();
  const [customers, setCustomers] = useState<CustomerListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError('');
    setCustomers(null);

    void runAuthenticated((token) => getCustomers(token, {
      page: listState.page,
      page_size: listState.pageSize,
      query: listState.appliedQuery,
      category: listState.appliedCategory,
      sort: listState.sort,
    }))
      .then((response) => {
        if (active) setCustomers(response);
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : '顧客一覧を取得できませんでした。');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    listState.appliedCategory,
    listState.appliedQuery,
    listState.page,
    listState.pageSize,
    listState.sort,
    runAuthenticated,
  ]);

  const search = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setListState((current) => ({
      ...current,
      appliedQuery: current.queryInput.trim(),
      appliedCategory: current.categoryInput.trim(),
      page: 1,
    }));
  };

  return (
    <main>
      <button type="button" onClick={onBack}>顧客登録画面に戻る</button>
      <section aria-labelledby="customer-list-heading" className="customer-list">
        <h1 id="customer-list-heading">顧客一覧</h1>

        <form onSubmit={search}>
          <div className="form-field">
            <label htmlFor="customer-list-query">顧客名</label>
            <input
              id="customer-list-query"
              value={listState.queryInput}
              onChange={(event) => setListState((current) => ({
                ...current,
                queryInput: event.target.value,
              }))}
            />
          </div>
          <div className="form-field">
            <label htmlFor="customer-list-category">分類</label>
            <input
              id="customer-list-category"
              value={listState.categoryInput}
              onChange={(event) => setListState((current) => ({
                ...current,
                categoryInput: event.target.value,
              }))}
            />
          </div>
          <button type="submit">検索</button>
        </form>

        <div className="form-field">
          <label htmlFor="customer-list-sort">並び順</label>
          <select
            id="customer-list-sort"
            value={listState.sort}
            onChange={(event) => setListState((current) => ({
              ...current,
              sort: event.target.value as CustomerListSort,
              page: 1,
            }))}
          >
            <option value="name_asc">顧客名 昇順</option>
            <option value="name_desc">顧客名 降順</option>
            <option value="created_at_asc">登録日時 昇順</option>
            <option value="created_at_desc">登録日時 降順</option>
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="customer-list-page-size">表示件数</label>
          <select
            id="customer-list-page-size"
            value={listState.pageSize}
            onChange={(event) => setListState((current) => ({
              ...current,
              pageSize: Number(event.target.value) as 20 | 50 | 100,
              page: 1,
            }))}
          >
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>

        {isLoading && <p role="status">顧客一覧を読み込み中...</p>}
        {error && <p role="alert">{error}</p>}

        {!isLoading && error === '' && customers?.items.length === 0 && (
          <p>該当する顧客がありません。</p>
        )}

        {!isLoading && error === '' && customers !== null && customers.items.length > 0 && (
          <table>
            <caption>顧客一覧</caption>
            <thead>
              <tr>
                <th scope="col">顧客名</th>
                <th scope="col">分類</th>
                <th scope="col">操作</th>
              </tr>
            </thead>
            <tbody>
              {customers.items.map((customer) => (
                <tr key={customer.id}>
                  <td>{customer.name}</td>
                  <td>{customer.category ?? '未分類'}</td>
                  <td>
                    <button
                      type="button"
                      aria-label={`${customer.name}の詳細を表示`}
                      onClick={() => onSelectCustomer(customer.id)}
                    >詳細</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!isLoading && error === '' && customers !== null && (
          <nav aria-label="顧客一覧ページ">
            <p aria-label="現在のページ">
              {customers.page} / {customers.total_pages}ページ（全{customers.total_count}件）
            </p>
            <button
              type="button"
              disabled={listState.page <= 1}
              onClick={() => setListState((current) => ({ ...current, page: current.page - 1 }))}
            >前へ</button>
            <button
              type="button"
              disabled={listState.page >= customers.total_pages}
              onClick={() => setListState((current) => ({ ...current, page: current.page + 1 }))}
            >次へ</button>
          </nav>
        )}
      </section>
    </main>
  );
}
