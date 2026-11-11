# FraudFlow UI

Minimalist white-and-green React dashboard prototype for the Fraud-Flow ML project.

## Run

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173).

## Features

- Left navigation: Overview, Transactions, Analytics.
- Searchable and filterable transactions table with five demo records.
- CSV export of filtered transactions.
- Overview metrics based on sample data.
- Analytics: transactions by type, placeholders for model metrics (precision, recall, F1, average precision) and the future prediction form.
- Responsive layout.

## Important

This is a **frontend-only prototype**. No backend or trained model is connected. `Review` and `Completed` statuses are illustrative, not ML predictions. No real payment functions are implemented.

## Integration roadmap

1. Export the fitted scikit-learn pipeline and validation-selected threshold from `train_model.py`.
2. Build a FastAPI service to load the artifacts and expose prediction endpoints.
3. Replace the demo data and placeholder analytics with API responses.
4. Validate predictions against known test cases before deployment.
