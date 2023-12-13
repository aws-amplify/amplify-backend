# Description

Contains core logic that needs to be normalized across many packages in the repo.
This includes things like error classes, parsing stack name and BackendIdentifiers, and other cross-cutting concerns.
Over time, this package will probably have a tendency to turn into a "kitchen sink" utility package.
We should take steps to mitigate that by:

1. Be very careful about what gets added to this package. Consider if the thing you are adding can go in some other shared package.
2. Be open to splitting this package into multiple "core" packages when logical groupings emerge.
