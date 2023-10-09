import { Construct } from 'constructs';

import * as cdk from 'aws-cdk-lib';

import { LibStackProps } from '@/interfaces/context';
import { Bastion } from '@/lib/resource/bastion';
import { Vpc } from '@/lib/resource/vpc';

/**
 * VPCネットワーク作成
 */
export class NetworkStack extends cdk.Stack {
  /**
   * VPCネットワーク作成
   * @param {Construct} scope コンストラクト
   * @param {string} id スタック名
   * @param {cdk.StackProps} props 設定
   */
  constructor(scope: Construct, id: string, props: LibStackProps) {
    super(scope, id, props);

    // VPC
    const vpc = new Vpc(this, id, props);

    // Bastion
    new Bastion(this, id, { ...props, vpc: vpc.vpc });
  }
}
