import type { CustomerCategoriesResponse } from '../api/reports';

type Props = {
  customerCategories: CustomerCategoriesResponse | null;
  isLoading: boolean;
  error: string;
};

export function CustomerCategoriesReport({ customerCategories, isLoading, error }: Props) {
  return (
    <section aria-labelledby="customer-categories-heading" className="report-section">
      <h2 id="customer-categories-heading">顧客分類</h2>

      {isLoading && <p role="status">顧客分類を読み込み中...</p>}
      {error && <p role="alert">{error}</p>}

      {customerCategories !== null && customerCategories.items.length === 0 && <p>顧客データはありません。</p>}

      {customerCategories !== null && customerCategories.items.length > 0 && (
        <table>
          <caption>顧客分類</caption>
          <thead>
            <tr>
              <th scope="col">顧客分類</th>
              <th scope="col">顧客数</th>
            </tr>
          </thead>
          <tbody>
            {customerCategories.items.map((item) => (
              <tr key={item.category}>
                <td>{item.category}</td>
                <td>{item.customerCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
