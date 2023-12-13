# Description

Responsible for reading stack output and metadata from deployed stacks and presenting it in a validated and typed format.
You could think of this package as our "database client" (but instead of a database, we have CloudFormation metadata and output).
It does not perform transformation of the data, it just understands how to read the data format.

This package is expected to be browser friendly.
