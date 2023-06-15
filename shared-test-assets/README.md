## Intent

This directory contains expected test values that are used in tests across multiple packages.
Think very carefully before adding stuff to this directory. Most data / contracts that are shared between packages should be codified in TypeScript interfaces and tests should be written against those interfaces in each package.
Stuff should only be added to this directory if there is some implicit contract between packages
