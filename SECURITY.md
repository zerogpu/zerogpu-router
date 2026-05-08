# Security Policy

## Reporting a Vulnerability

Please do not open public issues for suspected credential leaks or plugin/skill vulnerabilities.

Email the maintainers at `hello@zerogpu.ai` with:

- A short description of the issue.
- Reproduction steps or a proof of concept.
- Affected versions, commits, deployments, or URLs if known.
- Whether credentials, logs, or user data may be exposed.

We will acknowledge reports within 72 hours and coordinate a fix before publishing details.

## Secrets and Credentials

Never commit real ZeroGPU API keys, project IDs, access tokens, or populated local config files.

The public examples in this repository use placeholders such as `<your-api-key>` and `<your-project-id>`. Runtime credentials should be supplied through local environment variables or private Claude MCP client configuration.

## Supported Versions

Security fixes are made against the latest released version and the default development branch.
