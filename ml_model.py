

import pandas as pd

DATA_PATH='data/PS_20174392719_1491204439457_log.csv'
SAMPLE_ROWS=100_000

transactions_sample=pd.read_csv(DATA_PATH, nrows=SAMPLE_ROWS)

print(transactions_sample.shape)
print(transactions_sample.columns)
print(transactions_sample.head())

transactions_sample.info()

print(transactions_sample["isFraud"].value_counts())
print(transactions_sample["type"].value_counts())

ANALYSIS_COLUMNS=[
    'type',
    'amount',
    'isFraud'
]

transactions_eda = pd.read_csv(
    DATA_PATH,
    usecols=ANALYSIS_COLUMNS
)

print(transactions_eda.shape)


class_counts = transactions_eda["isFraud"].value_counts()
print(class_counts)
class_percentages = class_counts / len(transactions_eda) * 100
print(class_percentages)

grouped_amount = transactions_eda.groupby("isFraud")["amount"]
amount_statistics = grouped_amount.describe()

print(amount_statistics)

