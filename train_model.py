import pandas as pd
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import StandardScaler 
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.metrics import confusion_matrix 
from sklearn.metrics import precision_score
from sklearn.metrics import recall_score 
from sklearn.metrics import f1_score 
from sklearn.metrics import precision_recall_curve
from sklearn.metrics import average_precision_score
import numpy as np

DATA_PATH='data/PS_20174392719_1491204439457_log.csv'
MODEL_COLUMNS=['step','type','amount','isFraud','oldbalanceOrg','newbalanceOrig','oldbalanceDest','newbalanceDest']

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
  ('scale', scaler , ['step','amount','oldbalanceOrg','newbalanceOrig','oldbalanceDest','newbalanceDest'])]
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

confusion_result=confusion_matrix(y_validation,validation_predictions)
precision_result=precision_score(y_validation,validation_predictions)
recall_result=recall_score(y_validation,validation_predictions)
f1_result=f1_score(y_validation,validation_predictions)

print(confusion_result)
print(precision_result)
print(recall_result)
print(f1_result)

precision,recall,thresholds=precision_recall_curve(y_validation,fraud_probabilities)
avp=average_precision_score(y_validation,fraud_probabilities)

print(precision.shape)
print(recall.shape)
print(thresholds.shape)
print(avp)

precision_for_thresholds = precision[:-1]
recall_for_thresholds = recall[:-1]
print(precision_for_thresholds.shape)
print(recall_for_thresholds.shape)
f1_scores = (
    2 * precision_for_thresholds * recall_for_thresholds
    / (precision_for_thresholds + recall_for_thresholds + 1e-10)
)
print(f1_scores.shape)

best_index = np.argmax(f1_scores)
best_threshold = thresholds[best_index]
best_precision = precision_for_thresholds[best_index]
best_recall = recall_for_thresholds[best_index]
best_f1 = f1_scores[best_index]

print("Best threshold:", best_threshold)
print("Best precision:", best_precision)
print("Best recall:", best_recall)
print("Best F1:", best_f1)

test_probabilities=model_pipeline.predict_proba(X_test)
print(test_probabilities.shape)

test_fraud_probabilities = test_probabilities[:, 1]
test_predictions = (test_fraud_probabilities >= best_threshold).astype(int)

test_confusion = confusion_matrix(y_test, test_predictions)
test_precision = precision_score(y_test, test_predictions)
test_recall = recall_score(y_test, test_predictions)
test_f1 = f1_score(y_test, test_predictions)
test_average_precision = average_precision_score(
    y_test,
    test_fraud_probabilities
)

print("Test confusion matrix:")
print(test_confusion)
print("Test precision:", test_precision)
print("Test recall:", test_recall)
print("Test F1:", test_f1)
print("Test average precision:", test_average_precision)
