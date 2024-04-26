#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

import { Context } from '@/interfaces/context';
import { SelfHostedRunnerStack } from '@/lib/self-hosted-runner-stack';

const app = new cdk.App();

// コンテキスト取得
const gitHubWebhookSecret: string = process.env.GITHUB_WEBHOOK_SECRET ?? '';
const contextname: string = process.env.CONTEXT ?? 'development';
const context: Context = app.node.tryGetContext(contextname);

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'ap-northeast-1',
};

new SelfHostedRunnerStack(app, 'SelfHostedRunnerStack', {
  env,
  context,
  gitHubWebhookSecret,
});
