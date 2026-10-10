#!/bin/sh
# local preview with seeking: http://localhost:8812
cd "$(dirname "$0")" && exec python3 serve.py 8812
