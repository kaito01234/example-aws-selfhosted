#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';

import { Context } from '@/interfaces/context';
import { NetworkStack } from '@/lib/network-stack';

const app = new cdk.App();

// コンテキスト取得
const contextname: string = process.env.CONTEXT ?? 'development';
const context: Context = app.node.tryGetContext(contextname);

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: 'ap-northeast-1',
};

new NetworkStack(app, 'NetworkStack', {
  env,
  context,
});
