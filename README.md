# FraudFlow

Учебный проект по выявлению мошеннических финансовых транзакций.

## Основа проекта

Для обучения модели используется синтетический набор транзакций
[PaySim](https://www.kaggle.com/datasets/ealaxi/paysim1).

- целевая переменная: `isFraud`;
- `isFlaggedFraud` не используется как входной признак;
- файл датасета хранится локально в папке `data/` и не добавляется в Git.

Код проекта автор пишет самостоятельно в `project.py`.

## Запуск

Нужны Python 3.11+ и Node.js 20+. Датасет должен лежать в `data/`.

```bash
# 1. Окружение Python (один раз)
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# 2. Обучить модель — сохраняет models/fraudflow_model.joblib и models/metrics.json
.venv/bin/python train_model.py

# 3. API (из корня проекта) — http://127.0.0.1:8000/docs
.venv/bin/uvicorn backend.main:app --reload --port 8000

# 4. Интерфейс (в отдельном терминале) — http://localhost:5173
cd fraudflow-ui
npm install
npm run dev
```

Vite проксирует запросы `/api` на `127.0.0.1:8000`, поэтому API должен быть запущен.

## API

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/health` | Статус и число транзакций |
| GET | `/api/summary` | Сводка по test-периоду и разбивка по типам |
| GET | `/api/metrics` | Порог и метрики модели (validation и test) |
| GET | `/api/transactions` | Транзакции с вероятностями: `search`, `type`, `status`, `sort`, `limit`, `offset` |
| GET | `/api/transactions/export` | То же в CSV |
| POST | `/api/predict` | Оценка одной транзакции: `{"step", "type", "amount"}` |
