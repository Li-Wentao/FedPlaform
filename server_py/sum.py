## compute_input.py

import sys
import json
import numpy as np
import pandas as pd
# import torch

#Read data from stdin
def readNsum():
    lines = sys.stdin.readlines()
    df = 0
    for d in lines:
        df += pd.DataFrame(json.loads(d))
    return df.to_json()

def main():
    result = readNsum()
    print(result)
#start process
if __name__ == '__main__':
    main()