#!/usr/bin/env bash

ln -svf $(pwd)/src/script.ts ~/bin/script.js
ln -svf $(pwd)/src/ake/akectl.ts ~/bin/akectl

ln -svf $(pwd)/src/ake/ake.ts ~/bin/a

# skip r: ~/bin/ar would shadow Unix `ar`, which rbenv install needs
for suffix in {a..z}; do
  [[ $suffix == r ]] && continue
  akectl install-bin ~/bin/a $suffix
done
