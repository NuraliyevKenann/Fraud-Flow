import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";
import "./transactions-page.css";

type Transaction = {
  id: string;
  step: number;
  type: string;
  amount: number;
  isFraud: number;
};
type TransactionResponse = {
  items: Transaction[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};
const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TransactionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`http://127.0.0.1:8000/transactions?page=${page}&page_size=7`)
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      })
      .then(setData)
      .catch(() =>
        setError(
          "Не удалось загрузить транзакции. Проверьте, что API запущено.",
        ),
      )
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <section className="panel transactions-panel">
      <div className="transactions-summary">
        <div>
          <b>Полный датасет PaySim</b>
          <span>
            {data ? data.total.toLocaleString("ru-RU") : "6 362 620"} транзакций
            · 7 на странице
          </span>
        </div>
        <div className="live-badge">
          <i />
          Данные из CSV
        </div>
      </div>
      {loading && (
        <div className="transactions-state">
          <LoaderCircle className="spin" size={25} />
          Загрузка страницы...
        </div>
      )}
      {error && (
        <div className="transactions-state error">
          <AlertTriangle size={25} />
          {error}
        </div>
      )}
      {!loading && !error && data && (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>TRANSACTION ID</th>
                  <th>TYPE</th>
                  <th>STEP</th>
                  <th>AMOUNT</th>
                  <th>DATASET LABEL</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="id">{transaction.id}</td>
                    <td>{transaction.type}</td>
                    <td>{transaction.step}</td>
                    <td className="amount">{money(transaction.amount)}</td>
                    <td>
                      <span
                        className={
                          "status " +
                          (transaction.isFraud ? "fraud" : "complete")
                        }
                      >
                        {transaction.isFraud ? (
                          <>
                            <AlertTriangle size={13} /> Fraud
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={13} /> Normal
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <span>
              Страница {data.page.toLocaleString("ru-RU")} из{" "}
              {data.total_pages.toLocaleString("ru-RU")}
            </span>
            <div>
              <button
                disabled={page === 1}
                onClick={() => setPage((current) => current - 1)}
              >
                <ChevronLeft size={17} />
                Назад
              </button>
              <button
                disabled={page === data.total_pages}
                onClick={() => setPage((current) => current + 1)}
              >
                Вперёд
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
