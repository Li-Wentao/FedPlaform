import sys
import json
import numpy as np
import pandas as pd
from numpy.linalg import inv

#Read data from stdin
def getBeta():
    lines = sys.stdin.readlines()
    # Get gram matrix and inverse it
    gram = pd.DataFrame(json.loads(lines[0]))
    gram_inv = inv(gram)
    # Get the XY matrix
    XY = pd.DataFrame(json.loads(lines[1]))
    # Commpute the beta
    beta = gram_inv @ XY
    return beta.to_json()
def main():
    result = getBeta()
    print(result)
#start process
if __name__ == '__main__':
    main()