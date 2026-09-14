# Description

This is a **types only** package that is used to facilitate dependency injection patterns across the codebase.
Components can declare that they need an instance of a certain type that comes from this package and another component can provide the implementation.
This allows us to depend on interfaces rather than implementations in many parts of the codebase.

Whenever two packages in this repo need to talk to each other, they should do so through an interface defined in this package.

This package may also need to be split at some point into different logical groupings.
