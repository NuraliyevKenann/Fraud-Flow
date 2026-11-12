from pathlib import Path
from typing import Literal

import joblib
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel, Field


# Файл модели ищется относительно api.py, а не текущей папки терминала.
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "artifacts" / "fraudflow_model.joblib"

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


app = FastAPI(
    title="FraudFlow API",
    description="API для проверки транзакций ML-моделью FraudFlow.",
    version=model_version,
)


@app.get("/health")
def health() -> dict[str, str]:
    """Проверяет, что API запущено и модель загружена."""

    return {"status": "ok", "model_version": model_version}


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
