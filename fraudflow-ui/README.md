# FraudFlow UI

Minimalist white-and-green React dashboard for the Fraud-Flow ML project, connected to the FastAPI backend in `../backend`.

## Run

Requires Node.js 20+. Start the API first (see the root README), then:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173).

## Features

- Left navigation: Overview, Transactions, Analytics.
- Overview: test-period totals, model-flagged count and rate, highest-risk transactions.
- Transactions: server-side search, type/status filters, risk sorting, pagination, CSV export. Each row shows the model's fraud probability, its decision, and the actual label.
- Analytics: test and validation metrics (precision, recall, F1, average precision), confusion matrix, actual vs. flagged fraud by type, and a form that scores a single transaction via `POST /api/predict`.
- Shows an "API offline" state with the start command when the backend is not running.
- Responsive layout.

## Data

All transactions are synthetic PaySim records from the test period (steps 632–743), scored by the logistic regression model trained in `train_model.py`. Nothing here processes real payments.
