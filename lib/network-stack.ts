import { Construct } from 'constructs';

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

/**
 * VPCネットワーク作成
 */
export class NetworkStack extends cdk.Stack {
  /**
   *
   * @param {Construct} scope コンストラクト
   * @param {string} id スタック名
   * @param {cdk.StackProps} props 設定
   */
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'VPC', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
    });
  }
}
