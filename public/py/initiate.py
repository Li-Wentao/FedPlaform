import pandas as pd

df = pd.DataFrame(data)
# make the the number as numeric
df_ = []
for col_name in df.columns:
    df_ += [pd.to_numeric(df[col_name], errors='ignore')]
df = pd.concat(df_, axis=1)
# dummifiy the catagorical data
df = pd.get_dummies(df, drop_first=True)
df = df.set_index(df.columns[0])
# detect null by rows
null_idx = df.index[df.isna().sum(axis=1)!=0].tolist()
df = df.dropna(axis=0)
var_names = df.columns.to_list()







# Output to javascript
df = df.to_json()