# GitHub Self-hosted Runner Sample

[![Open in Dev Containers](https://img.shields.io/static/v1?label=Dev%20Containers&message=Open&color=blue&logo=visualstudiocode)](https://vscode.dev/redirect?url=vscode://ms-vscode-remote.remote-containers/cloneInVolume?url=https://github.com/kaito01234/github-selfhosted-sample)

## Setup

- `npx cdk deploy SelfHostedRunnerStack`: Create VPC and hosted-runner
- `npx cdk deploy SelfHostedRunnerStack -c gitHubWebhookSecret=XXXXXXXXXX`: Validate webhook with secret

## WebHooksの設定

https://qiita.com/bigmac/items/63f1723db2c718307474#webhooksの設定

## Update modules

- `npm run ncu:update`: Minor version update
- `npm run ncu:update:latest`: Major version update
