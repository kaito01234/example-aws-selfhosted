import { Construct } from 'constructs';

import * as cdk from 'aws-cdk-lib';

import { LibStackProps } from '@/interfaces/context';
import { SelfHostedRunner } from '@/lib/resource/self-hosted-runner';
import { Vpc } from '@/lib/resource/vpc';

/**
 * VPCネットワーク作成
 */
export class SelfHostedRunnerStack extends cdk.Stack {
  /**
   * VPCネットワーク作成
   * @param {Construct} scope コンストラクト
   * @param {string} id スタック名
   * @param {cdk.StackProps} props 設定
   */
  constructor(scope: Construct, id: string, props: LibStackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new Vpc(this, `${id}-VPC`, props);

    // SelfHostedRunner
    new SelfHostedRunner(this, `${id}-SelfHostedRunner`, { ...props, vpc: vpc.vpc });
  }
}
