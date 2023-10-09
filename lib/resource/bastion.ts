import { Construct } from 'constructs';

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as logs from 'aws-cdk-lib/aws-logs';

import { LibStackProps } from '@/interfaces/context';

/**
 * ResourceProps
 */
interface ResourceProps extends LibStackProps {
  /**
   * @property {ec2.Vpc} vpc VPC
   */
  vpc: ec2.Vpc;
}

/**
 * Bastion作成
 */
export class Bastion extends cdk.Stack {
  /**
   * Bastion作成
   * @param {Construct} scope コンストラクト
   * @param {string} id スタック名
   * @param {ResourceProps} props 設定
   */
  constructor(scope: Construct, id: string, props: ResourceProps) {
    super(scope, id, props);

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'BastionCluster', {
      clusterName: 'Bastion',
      vpc: props.vpc,
      enableFargateCapacityProviders: true,
    });

    // タスク定義
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'BastionTaskDef', {
      family: 'Bastion',
      cpu: 256,
      memoryLimitMiB: 512,
    });

    // ECR
    const repo = new ecr.Repository(this, 'BastionRepository', {
      repositoryName: 'bastion',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteImages: true,
      lifecycleRules: [
        {
          description: 'Delete one or more tagged images',
          tagStatus: ecr.TagStatus.TAGGED,
          maxImageCount: 1,
        },
        {
          description: 'Delete untagged images',
          tagStatus: ecr.TagStatus.UNTAGGED,
          maxImageCount: 0,
        },
      ],
    });

    // ロググループ
    const logGroup = new logs.LogGroup(this, 'BastionLogGroup', {
      logGroupName: taskDefinition.family,
      retention: logs.RetentionDays.ONE_DAY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // コンテナ定義
    taskDefinition.addContainer('BastionContainer', {
      image: ecs.ContainerImage.fromEcrRepository(repo),
      logging: ecs.LogDrivers.awsLogs({
        logGroup,
        streamPrefix: 'ecs',
      }),
    });

    // セキュリティグループの作成
    const securityGroup = new ec2.SecurityGroup(this, 'BastionSecurityGroup', {
      securityGroupName: 'BastionSecurityGroup',
      vpc: props.vpc,
    });

    // CloudFormationエクスポート
    new cdk.CfnOutput(this, 'OutputBastionClusterName', {
      exportName: `${id}:BastionClusterName`,
      value: cluster.clusterName,
    });
    new cdk.CfnOutput(this, 'OutputBastionTaskDefFamily', {
      exportName: `${id}:BastionTaskDefFamily`,
      value: taskDefinition.family,
    });
    new cdk.CfnOutput(this, 'OutputBastionSecurityGroupId', {
      exportName: `${id}:BastionSecurityGroupId`,
      value: securityGroup.securityGroupId,
    });
  }
}
