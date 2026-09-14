# Description

This package is the entry point to the Gen2 CLI. It constructs a yargs object to parse command line args and delegates to handlers.
This package should _only_ contain command line parsing and validation logic. Actual business logic should happen behind programmatic APIs in other packages.
