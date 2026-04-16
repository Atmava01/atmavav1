#!/bin/sh
export PATH="/opt/homebrew/Cellar/node/25.2.1/bin:/opt/homebrew/bin:$PATH"
cd "/Users/solomonjohnpaul/Desktop/Vynce/other brands/atmava"
exec node node_modules/.bin/next dev --port 3000
