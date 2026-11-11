"""FraudFlow API: serves the trained fraud model and its test-set predictions.

Run from the project root:
    .venv/bin/uvicorn backend.main:app --reload --port 8000
"""
import io
from pathlib import Path
from typing import Literal

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = ROOT / 'models' / 'fraudflow_model.joblib'
DATA_PATH = ROOT / 'data' / 'PS_20174392719_1491204439457_log.csv'
TRANSACTION_TYPES = ['PAYMENT', 'TRANSFER', 'CASH_OUT', 'CASH_IN', 'DEBIT']

if not MODEL_PATH.exists():
    raise RuntimeError(f'Model not found at {MODEL_PATH}. Run `python train_model.py` first.')
if not DATA_PATH.exists():
    raise RuntimeError(f'Dataset not found at {DATA_PATH}.')

artifact = joblib.load(MODEL_PATH)
pipeline = artifact['pipeline']
threshold: float = artifact['threshold']
features: list[str] = artifact['features']
first_step, last_step = artifact['test_steps']


def load_test_transactions() -> pd.DataFrame:
    """Load the test split and score every transaction with the model."""
    data = pd.read_csv(DATA_PATH, usecols=features + ['isFraud'])
    test = data.loc[(data['step'] >= first_step) & (data['step'] <= last_step)].copy()
    test['probability'] = pipeline.predict_proba(test[features])[:, 1]
    test['flagged'] = test['probability'] >= threshold
    test['id'] = 'TXN-' + test.index.astype(str)
    test['status'] = test['flagged'].map({True: 'Flagged', False: 'Clear'})
    test['search_text'] = (
        test['id'] + ' ' + test['type'] + ' ' + test['status'].str.lower()
        + ' ' + test['step'].astype(str) + ' ' + test['amount'].astype(str)
    ).str.lower()
    return test.reset_index(drop=True)


transactions = load_test_transactions()

app = FastAPI(title='FraudFlow API')
app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:5173', 'http://127.0.0.1:5173'],
    allow_methods=['*'],
    allow_headers=['*'],
)


def filter_transactions(search: str, tx_type: str | None, status: str | None) -> pd.DataFrame:
    rows = transactions
    if tx_type:
        rows = rows[rows['type'] == tx_type]
    if status:
        rows = rows[rows['status'] == status]
    if search.strip():
        rows = rows[rows['search_text'].str.contains(search.strip().lower(), regex=False)]
    return rows


def to_records(rows: pd.DataFrame) -> list[dict]:
    return [
        {
            'id': r.id,
            'step': int(r.step),
            'type': r.type,
            'amount': float(r.amount),
            'probability': float(r.probability),
            'status': r.status,
            'is_fraud': bool(r.isFraud),
        }
        for r in rows.itertuples(index=False)
    ]


@app.get('/api/health')
def health():
    return {'status': 'ok', 'transactions': len(transactions)}


@app.get('/api/summary')
def summary():
    flagged = transactions['flagged']
    by_type = (
        transactions.groupby('type')
        .agg(count=('id', 'size'), flagged=('flagged', 'sum'), fraud=('isFraud', 'sum'))
        .reindex(TRANSACTION_TYPES, fill_value=0)
    )
    return {
        'total_transactions': len(transactions),
        'flagged': int(flagged.sum()),
        'flagged_rate': float(flagged.mean()),
        'actual_fraud': int(transactions['isFraud'].sum()),
        'total_volume': float(transactions['amount'].sum()),
        'step_range': [first_step, last_step],
        'by_type': [
            {'type': t, 'count': int(r['count']), 'flagged': int(r['flagged']), 'fraud': int(r['fraud'])}
            for t, r in by_type.iterrows()
        ],
    }


@app.get('/api/metrics')
def metrics():
    return artifact['metrics']


@app.get('/api/transactions')
def list_transactions(
    search: str = '',
    type: str | None = None,
    status: Literal['Flagged', 'Clear'] | None = None,
    sort: Literal['risk', 'step'] = 'risk',
    limit: int = Query(25, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    rows = filter_transactions(search, type, status)
    rows = rows.sort_values('probability' if sort == 'risk' else 'step', ascending=sort == 'step')
    return {'total': len(rows), 'items': to_records(rows.iloc[offset:offset + limit])}


@app.get('/api/transactions/export')
def export_transactions(
    search: str = '',
    type: str | None = None,
    status: Literal['Flagged', 'Clear'] | None = None,
):
    rows = filter_transactions(search, type, status).sort_values('probability', ascending=False)
    out = rows[['id', 'step', 'type', 'amount', 'probability', 'status', 'isFraud']].rename(
        columns={'id': 'transaction_id', 'probability': 'fraud_probability', 'isFraud': 'is_fraud'}
    )
    buffer = io.StringIO()
    out.to_csv(buffer, index=False)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type='text/csv',
        headers={'Content-Disposition': 'attachment; filename=fraudflow-transactions.csv'},
    )


class PredictRequest(BaseModel):
    step: int = Field(ge=1)
    type: Literal['PAYMENT', 'TRANSFER', 'CASH_OUT', 'CASH_IN', 'DEBIT']
    amount: float = Field(ge=0)


@app.post('/api/predict')
def predict(request: PredictRequest):
    row = pd.DataFrame([request.model_dump()])[features]
    try:
        probability = float(pipeline.predict_proba(row)[0, 1])
    except Exception as error:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail=str(error))
    return {
        'probability': probability,
        'threshold': threshold,
        'flagged': probability >= threshold,
    }
