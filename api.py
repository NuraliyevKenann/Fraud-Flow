from pathlib import Path
from typing import Literal

import joblib
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Query
from pydantic import BaseModel, Field


# Файл модели ищется относительно api.py, а не текущей папки терминала.
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "artifacts" / "fraudflow_model.joblib"
DATA_PATH = BASE_DIR / "data" / "PS_20174392719_1491204439457_log.csv"
TOTAL_TRANSACTIONS = 6_362_620

# Загружаем один артефакт и достаём его части.
model_artifact = joblib.load(MODEL_PATH)
model_pipeline = model_artifact["pipeline"]
threshold = model_artifact["threshold"]
feature_columns = model_artifact["feature_columns"]
model_version = model_artifact["version"]


class Transaction(BaseModel):
    """Данные одной транзакции, которые ожидает обученная модель."""

    step: int = Field(ge=1)
    type: Literal["CASH_IN", "CASH_OUT", "DEBIT", "PAYMENT", "TRANSFER"]
    amount: float = Field(ge=0)
    oldbalanceOrg: float = Field(ge=0)
    newbalanceOrig: float = Field(ge=0)
    oldbalanceDest: float = Field(ge=0)
    newbalanceDest: float = Field(ge=0)


class PredictionResult(BaseModel):
    """Ответ API после проверки транзакции."""

    fraud_score: float
    threshold: float
    is_fraud: bool
    model_version: str


class TransactionRow(BaseModel):
    id: str
    step: int
    type: str
    amount: float
    isFraud: int


class TransactionPage(BaseModel):
    items: list[TransactionRow]
    page: int
    page_size: int
    total: int
    total_pages: int


app = FastAPI(
    title="FraudFlow API",
    description="API для проверки транзакций ML-моделью FraudFlow.",
    version=model_version,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    """Проверяет, что API запущено и модель загружена."""

    return {"status": "ok", "model_version": model_version}


@app.get("/transactions", response_model=TransactionPage)
def transactions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
) -> TransactionPage:
    """Возвращает страницу реальных строк из полного датасета PaySim."""

    offset = (page - 1) * page_size
    if offset >= TOTAL_TRANSACTIONS:
        return TransactionPage(
            items=[], page=page, page_size=page_size,
            total=TOTAL_TRANSACTIONS,
            total_pages=(TOTAL_TRANSACTIONS + page_size - 1) // page_size,
        )

    data = pd.read_csv(
        DATA_PATH,
        usecols=["step", "type", "amount", "isFraud"],
        skiprows=range(1, offset + 1),
        nrows=page_size,
    )
    items = [
        TransactionRow(
            id=f"TXN-{offset + index + 1:07d}",
            step=int(row.step),
            type=str(row.type),
            amount=float(row.amount),
            isFraud=int(row.isFraud),
        )
        for index, row in enumerate(data.itertuples(index=False))
    ]
    return TransactionPage(
        items=items,
        page=page,
        page_size=page_size,
        total=TOTAL_TRANSACTIONS,
        total_pages=(TOTAL_TRANSACTIONS + page_size - 1) // page_size,
    )


@app.post("/predict", response_model=PredictionResult)
def predict(transaction: Transaction) -> PredictionResult:
    """Возвращает оценку риска и решение по сохранённому порогу."""

    transaction_frame = pd.DataFrame(
        [transaction.model_dump()],
        columns=feature_columns,
    )
    fraud_score = float(model_pipeline.predict_proba(transaction_frame)[0, 1])

    return PredictionResult(
        fraud_score=fraud_score,
        threshold=threshold,
        is_fraud=fraud_score >= threshold,
        model_version=model_version,
    )
