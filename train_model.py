import pandas as pd

DATA_PATH='data/PS_20174392719_1491204439457_log.csv'
MODEL_COLUMNS=['step','type','amount','isFraud']

model_data = pd.read_csv(
    DATA_PATH,
    usecols=MODEL_COLUMNS
)

print(model_data.shape)
print(model_data.dtypes)

X = model_data.drop(columns=["isFraud"])
y = model_data["isFraud"]

print(X.shape)
print(y.shape)
print(X.head())
print(y.head())
