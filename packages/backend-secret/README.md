# Description

Abstraction around [AWS Systems Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/what-is-systems-manager.html) (SSM) for CRUDL options on SSM SecureString values. This package should be used whenever we want to read/write secrets to SSM. It is responsible for normalizing SSM path names based on a BackendIdentifier
