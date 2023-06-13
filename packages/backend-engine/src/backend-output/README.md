## Intent

This directory encapsulates the reading and writing of backend output to/from stacks.
It also encapsulates setting and locating the SSM parameter that identifies the main stack for a given project environment.

Currently, all the writing logic is initialized in `backend` and all the reading logic is initialized in this package (`backend-engine`)
The reading logic happens during client config generation which may be pulled into its own package in the future.
If that happens, this directory also needs to become its own package so it can be shared between `backend` and the client config generation package.
