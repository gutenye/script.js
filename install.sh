#!/usr/bin/env bash

ln -svf $(pwd)/src/script.ts ~/bin/script.js
ln -svf $(pwd)/src/ake/akectl.ts ~/bin/akectl

ln -svf $(pwd)/src/ake/ake.ts ~/bin/a

for suffix in {a..z}; do
  akectl install-bin ~/bin/a $suffix
done
