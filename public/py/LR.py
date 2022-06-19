import pandas as pd
from numpy.linalg import inv

df = pd.DataFrame(data)
y = df
X = df.drop(out, axis=1)

# Add intercept
X['intercept'] = 1

# Information to be sent
gram = pd.DataFrame(inv(X.T @ X)).to_json()
xy = (X.T @ y).to_json()