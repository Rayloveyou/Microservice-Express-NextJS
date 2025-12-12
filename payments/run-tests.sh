#!/bin/bash
# Clean dist folder to avoid duplicate mock warnings
rm -rf dist/

# Run tests
npm test -- --testPathPatterns="__test__" --no-watch --runInBand --forceExit
