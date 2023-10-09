import { Construct } from 'constructs';

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

import { LibStackProps } from '@/interfaces/context';

/**
 * VPC作成
 */
export class Vpc extends cdk.Stack {
  /**
   * 作成したVPC
   */
  public vpc: ec2.Vpc;

  /**
   * VPC作成
   * @param {Construct} scope コンストラクト
   * @param {string} id スタック名
   * @param {cdk.StackProps} props 設定
   */
  constructor(scope: Construct, id: string, props: LibStackProps) {
    super(scope, id, props);

    // VPC
    this.vpc = new ec2.Vpc(this, 'VPC', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      vpcName: 'sample-vpc',
      maxAzs: 3,
      natGateways: props.context.production ? 3 : 1,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'public-subnet',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'private-subnet',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        {
          cidrMask: 24,
          name: 'isolated-subnet',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
      gatewayEndpoints: {
        S3: {
          service: ec2.GatewayVpcEndpointAwsService.S3,
          subnets: [
            {
              subnets: this.vpc.privateSubnets,
            },
          ],
        },
      },
      // flowLogs: {
      //   FlowLog: {
      //     destination: ec2.FlowLogDestination.toS3(s3.Bucket.fromBucketArn(this, 'FlowLogsBucket', 'arn:aws:s3:::')),
      //   },
      // },
    });
  }
}
