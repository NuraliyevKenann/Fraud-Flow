import { FormEvent, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  Sparkles,
  ShieldCheck,
  Zap,
} from "lucide-react";
import "./risk.css";

type TransactionType =
  | "CASH_IN"
  | "CASH_OUT"
  | "DEBIT"
  | "PAYMENT"
  | "TRANSFER";
type TransactionForm = {
  step: string;
  type: TransactionType;
  amount: string;
  oldbalanceOrg: string;
  newbalanceOrig: string;
  oldbalanceDest: string;
  newbalanceDest: string;
};
type NumericField = Exclude<keyof TransactionForm, "type">;
type Prediction = {
  fraud_score: number;
  threshold: number;
  is_fraud: boolean;
  model_version: string;
};

const initialForm: TransactionForm = {
  step: "1",
  type: "TRANSFER",
  amount: "181",
  oldbalanceOrg: "181",
  newbalanceOrig: "0",
  oldbalanceDest: "0",
  newbalanceDest: "0",
};
const presets = [
  {
    label: "Обычная оплата",
    icon: "●",
    data: {
      step: "120",
      type: "PAYMENT",
      amount: "250",
      oldbalanceOrg: "2000",
      newbalanceOrig: "1750",
      oldbalanceDest: "0",
      newbalanceDest: "0",
    } as TransactionForm,
  },
  {
    label: "Крупный перевод",
    icon: "◆",
    data: {
      step: "680",
      type: "TRANSFER",
      amount: "850000",
      oldbalanceOrg: "850000",
      newbalanceOrig: "0",
      oldbalanceDest: "0",
      newbalanceDest: "850000",
    } as TransactionForm,
  },
  {
    label: "Снятие наличных",
    icon: "▲",
    data: {
      step: "320",
      type: "CASH_OUT",
      amount: "120000",
      oldbalanceOrg: "120000",
      newbalanceOrig: "0",
      oldbalanceDest: "40000",
      newbalanceDest: "160000",
    } as TransactionForm,
  },
];

export default function RiskCheck() {
  const [form, setForm] = useState<TransactionForm>(initialForm);
  const [result, setResult] = useState<Prediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const update = (name: NumericField, value: string) =>
    setForm((current) => ({ ...current, [name]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    const payload = {
      ...form,
      step: Number(form.step),
      amount: Number(form.amount),
      oldbalanceOrg: Number(form.oldbalanceOrg),
      newbalanceOrig: Number(form.newbalanceOrig),
      oldbalanceDest: Number(form.oldbalanceDest),
      newbalanceDest: Number(form.newbalanceDest),
    };
    try {
      const response = await fetch("http://127.0.0.1:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      setResult(await response.json());
    } catch {
      setError(
        "Не удалось связаться с API. Убедитесь, что Uvicorn запущен на порту 8000.",
      );
    } finally {
      setLoading(false);
    }
  };

  const numericInput = (name: NumericField, label: string) => (
    <label>
      {label}
      <input
        type="number"
        min="0"
        step="0.01"
        required
        value={form[name]}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => update(name, event.target.value)}
      />
    </label>
  );

  return (
    <div className="risk-page">
      <div className="risk-intro">
        <div>
          <span className="live-dot" />
          Модель подключена
        </div>
        <p>
          Выберите пример или заполните операцию вручную. Любое число можно
          полностью стереть и заменить.
        </p>
      </div>
      <div className="preset-row">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => {
              setForm(preset.data);
              setResult(null);
              setError("");
            }}
          >
            <span>{preset.icon}</span>
            {preset.label}
          </button>
        ))}
      </div>
      <div className="risk-layout">
        <section className="panel risk-form-panel">
          <div className="form-heading">
            <div className="panel-title">
              <h2>Параметры транзакции</h2>
              <p>Семь признаков, которые использует FraudFlow</p>
            </div>
            <span className="api-pill">
              <Zap size={13} />
              Live API
            </span>
          </div>
          <form className="risk-form" onSubmit={submit}>
            <label>
              Шаг операции
              <input
                type="number"
                min="1"
                required
                value={form.step}
                onFocus={(event) => event.currentTarget.select()}
                onChange={(event) => update("step", event.target.value)}
              />
            </label>
            <label>
              Тип операции
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    type: event.target.value as TransactionType,
                  }))
                }
              >
                {["TRANSFER", "CASH_OUT", "CASH_IN", "PAYMENT", "DEBIT"].map(
                  (value) => (
                    <option key={value}>{value}</option>
                  ),
                )}
              </select>
            </label>
            <div className="amount-field">
              {numericInput("amount", "Сумма")}
            </div>
            {numericInput("oldbalanceOrg", "Баланс отправителя до")}
            {numericInput("newbalanceOrig", "Баланс отправителя после")}
            {numericInput("oldbalanceDest", "Баланс получателя до")}
            {numericInput("newbalanceDest", "Баланс получателя после")}
            <button className="predict-button" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <LoaderCircle className="spin" size={18} />
                  Проверяем...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Проверить транзакцию
                </>
              )}
            </button>
          </form>
        </section>
        <section className="panel risk-result-panel">
          <div className="panel-title">
            <h2>Результат модели</h2>
            <p>Порог решения: 99.31%</p>
          </div>
          {!result && !error && (
            <div className="result-empty">
              <div className="pulse-shield">
                <ShieldCheck size={38} />
              </div>
              <b>Ожидается транзакция</b>
              <span>Измените значения слева и запустите проверку.</span>
            </div>
          )}
          {error && (
            <div className="result-card danger">
              <AlertTriangle size={32} />
              <b>API недоступно</b>
              <span>{error}</span>
            </div>
          )}
          {result && (
            <div
              className={"result-card " + (result.is_fraud ? "danger" : "safe")}
            >
              {result.is_fraud ? (
                <AlertTriangle size={34} />
              ) : (
                <CheckCircle2 size={34} />
              )}
              <span className="result-label">
                {result.is_fraud
                  ? "ПОДОЗРИТЕЛЬНАЯ ОПЕРАЦИЯ"
                  : "РИСК НЕ ОБНАРУЖЕН"}
              </span>
              <strong>{(result.fraud_score * 100).toFixed(2)}%</strong>
              <span>Оценка риска модели</span>
              <div className="score-track">
                <i
                  style={{
                    width: `${Math.min(result.fraud_score * 100, 100)}%`,
                  }}
                />
              </div>
              <div className="result-details">
                <span>
                  Порог <b>{(result.threshold * 100).toFixed(2)}%</b>
                </span>
                <span>
                  Модель <b>v{result.model_version}</b>
                </span>
              </div>
            </div>
          )}
          <p className="risk-note">
            Результат является прогнозом учебной ML-модели, а не окончательным
            финансовым решением.
          </p>
        </section>
      </div>
    </div>
  );
}
