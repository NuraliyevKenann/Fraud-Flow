import pandas as pd
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler 
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

DATA_PATH='data/PS_20174392719_1491204439457_log.csv'
MODEL_COLUMNS=['step','type','amount','isFraud']

model_data = pd.read_csv(
    DATA_PATH,
    usecols=MODEL_COLUMNS
)

print(model_data.shape)
print(model_data.dtypes)

step = model_data['step']

print(step.max())
print(step.min())
print(step.nunique())

train_data=model_data.loc[(step >= 1) & (step <=520)]
validation_data=model_data.loc[(step >= 521) & (step <=631)]
test_data=model_data.loc[(step >= 632) & (step <=743)]

print(train_data.shape)
print(validation_data.shape)
print(test_data.shape)

X_train=train_data.drop(columns='isFraud')
y_train=train_data['isFraud']
X_validation=validation_data.drop(columns='isFraud')
y_validation=validation_data['isFraud']
X_test=test_data.drop(columns='isFraud')
y_test=test_data['isFraud']

print(X_train.shape)
print(y_train.shape)
print(X_validation.shape)
print(y_validation.shape)
print(X_test.shape)
print(y_test.shape)

print(y_train.value_counts())
print(y_validation.value_counts())
print(y_test.value_counts())

enc=OneHotEncoder(handle_unknown='ignore')
scaler=StandardScaler()

ct=ColumnTransformer([
    ('type.encoder',enc, ['type'])
,
  ('scale', scaler , ['step','amount'])]
)

clf=LogisticRegression(
    class_weight='balanced',
    max_iter=1000
)

model_pipeline=Pipeline([('preprocessor', ct),('classifier',clf)])
model_pipeline.fit(X_train,y_train)
print("Model training completed")

Validation_probabilities=model_pipeline.predict_proba(X_validation)
print(Validation_probabilities.shape)
fraud_probabilities = Validation_probabilities[:, 1]

print(fraud_probabilities.shape)
print(fraud_probabilities[:5])

threshold = 0.5
validation_predictions = (fraud_probabilities >= threshold).astype(int)
print(pd.Series(validation_predictions).value_counts())