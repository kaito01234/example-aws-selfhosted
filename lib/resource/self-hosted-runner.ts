/* eslint-disable no-new */
import { Construct } from 'constructs';

import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as ssm from 'aws-cdk-lib/aws-ssm';

import { LibStackProps } from '@/interfaces/context';
import { loadDependencies } from '@/util/loadDependencies';
import { loadYamlToJson } from '@/util/loadYamlToJson';

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
 * GitHub Self hosted-runner作成
 */
export class SelfHostedRunner extends cdk.Stack {
  /**
   * GitHub Self hosted-runner作成
   * @param {Construct} scope コンストラクト
   * @param {string} id スタック名
   * @param {ResourceProps} props 設定
   */
  constructor(scope: Construct, id: string, props: ResourceProps) {
    super(scope, id, props);

    // ECR
    const runner = 'myoung34/github-runner:latest';

    // セキュリティグループ
    const securityGroup = new ec2.SecurityGroup(scope, 'SelfHostedRunnerSecurityGroup', {
      // securityGroupName: 'SelfHostedRunnerSecurityGroup',
      vpc: props.vpc,
    });

    // ロググループ
    const logGroup = new logs.LogGroup(scope, 'SelfHostedRunnerLogGroup', {
      logGroupName: 'GitHubSelfHostedRunner',
      retention: logs.RetentionDays.ONE_DAY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // GitHub PersonalAccessToken のパラメータ
    const pat = new ssm.StringParameter(scope, 'PersonalAccessTokenParameter', {
      parameterName: 'GitHubPersonalAccessToken',
      stringValue: 'your Personal access token.',
    });

    // *************** ECS *************** //
    // ECS Cluster
    new ecs.Cluster(scope, 'SelfHostedRunnerCluster', {
      clusterName: 'GitHubSelfHostedRunner',
      vpc: props.vpc,
      enableFargateCapacityProviders: true,
    });

    // タスクロール
    const taskRole = new iam.Role(scope, 'SelfHostedRunnerTaskRole', {
      // roleName: 'GitHubSelfHostedRunnerTaskRole',
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')],
    });

    // タスク定義
    const taskDefinition = new ecs.FargateTaskDefinition(scope, 'SelfHostedRunnerTaskDef', {
      family: 'GitHubSelfHostedRunner',
      cpu: 256,
      memoryLimitMiB: 512,
      taskRole,
    });

    // コンテナ定義
    taskDefinition.addContainer('SelfHostedRunnerContainer', {
      image: ecs.ContainerImage.fromRegistry(runner),
      logging: ecs.LogDrivers.awsLogs({
        logGroup,
        streamPrefix: 'ecs',
      }),
      secrets: {
        ACCESS_TOKEN: ecs.Secret.fromSsmParameter(pat),
      },
    });

    // *************** CodeBuild *************** //
    // CodeBuildロール
    const codebuildRole = new iam.Role(scope, 'SelfHostedRunnerCodeBuildRole', {
      roleName: 'GitHubSelfHostedRunnerCodeBuildRole',
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')],
    });

    // CodeBuild
    new codebuild.Project(scope, 'SelfHostedRunnerCodeBuild', {
      projectName: 'GitHubSelfHostedRunner',
      vpc: props.vpc,
      role: codebuildRole,
      securityGroups: [securityGroup],
      logging: { cloudWatch: { logGroup } },
      buildSpec: codebuild.BuildSpec.fromObjectToYaml(loadYamlToJson('./buildspec/startSelfHostedRunner.yml')),
      environment: {
        buildImage: codebuild.LinuxBuildImage.fromDockerRegistry(runner),
        computeType: codebuild.ComputeType.SMALL,
        privileged: true,
        environmentVariables: {
          ACCESS_TOKEN: {
            type: codebuild.BuildEnvironmentVariableType.PARAMETER_STORE,
            value: pat.parameterName,
          },
        },
      },
      cache: codebuild.Cache.local(codebuild.LocalCacheMode.DOCKER_LAYER),
    });

    // *************** GitHub Webhook *************** //
    // Lambda Function
    const webhookFunction = new nodejs.NodejsFunction(scope, 'WebhookFunction', {
      functionName: 'GitHubSelfHostedRunnerWebhook',
      entry: 'lambda/selfHostedRunner/webhook/index.ts',
      handler: 'handler',
      depsLockFilePath: 'lambda/selfHostedRunner/webhook/package-lock.json',
      bundling: {
        nodeModules: loadDependencies('./lambda/selfHostedRunner/webhook/package.json'),
      },
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(900),
      environment: {
        GitHubWebhookSecret: 'Replace here.',
        FargateSubnet: props.vpc.privateSubnets.map((subnet) => subnet.subnetId).join(','),
        FargateSecurityGroup: securityGroup.securityGroupId,
      },
    });
    webhookFunction.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['iam:PassRole', 'codebuild:*', 'ecs:*'],
        resources: ['*'],
      })
    );

    // APIGateway
    const api = new apigateway.LambdaRestApi(scope, 'WebhookFunctionAPI', {
      restApiName: 'GitHubSelfHostedRunnerWebhook',
      handler: webhookFunction,
      proxy: false,
      policy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            principals: [new iam.AnyPrincipal()],
            actions: ['execute-api:Invoke'],
            resources: ['execute-api:/*/*/*'],
          }),
          new iam.PolicyStatement({
            effect: iam.Effect.DENY,
            principals: [new iam.AnyPrincipal()],
            actions: ['execute-api:Invoke'],
            resources: ['execute-api:/*/*/*'],
            conditions: {
              NotIpAddress: {
                'aws:SourceIp': ['192.30.252.0/22', '185.199.108.0/22', '140.82.112.0/20', '143.55.64.0/20'],
              },
            },
          }),
        ],
      }),
    });
    api.root.addMethod('POST');
  }
}
