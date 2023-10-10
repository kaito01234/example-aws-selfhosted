/* eslint-disable no-console */
import { CodeBuildClient, StartBuildCommand } from '@aws-sdk/client-codebuild';
import { ECSClient, RunTaskCommand } from '@aws-sdk/client-ecs';

const codebuild = new CodeBuildClient({ region: 'ap-northeast-1' });
const ecsClient = new ECSClient({ region: 'ap-northeast-1' });

// CodeBuildコンピューティングタイプの設定
const codeBuildType = (type: string) => {
  switch (type) {
    case '2XLARGE':
      return {
        computeTypeOverride: 'BUILD_GENERAL1_2XLARGE',
      };
    case 'LARGE':
      return {
        computeTypeOverride: 'BUILD_GENERAL1_LARGE',
      };
    case 'MEDIUM':
      return {
        computeTypeOverride: 'BUILD_GENERAL1_MEDIUM',
      };
    default:
      return {
        computeTypeOverride: 'BUILD_GENERAL1_SMALL',
      };
  }
};

// CodeBuildでself-hosted runnersを開始する
const startCodeBuild = async (htmlUrl: string, labels: string[], type: string): Promise<string> => {
  const buildParams = {
    projectName: 'GitHubSelfHostedRunner',
    environmentVariablesOverride: [
      {
        name: 'REPO_URL',
        value: htmlUrl,
        type: 'PLAINTEXT',
      },
      {
        name: 'LABELS',
        value: labels.join(','),
        type: 'PLAINTEXT',
      },
      {
        name: 'EPHEMERAL',
        value: '1',
        type: 'PLAINTEXT',
      },
      {
        name: 'DISABLE_AUTO_UPDATE',
        value: 'true',
      },
    ],
    ...codeBuildType(type),
  };

  const response = await codebuild.send(new StartBuildCommand(buildParams));
  console.log(`StartRunner: ${JSON.stringify(response)})`);
  return `Started CodeBuild project: ${response.build?.id}`;
};

// FargateのCPU/メモリの設定
const fargateType = (type: string) => {
  switch (type) {
    case 'LARGE':
      return {
        cpu: '2048',
        memory: '16384',
      };
    case 'MEDIUM':
      return {
        cpu: '1024',
        memory: '8192',
      };
    default:
      return {
        cpu: '512',
        memory: '4096',
      };
  }
};

// Fargate Spotでself-hosted runnersを開始する
const startFargateSpot = async (htmlUrl: string, labels: string[], type: string): Promise<string> => {
  const runTaskRequest = {
    cluster: 'GitHubSelfHostedRunner',
    taskDefinition: 'GitHubSelfHostedRunner',
    capacityProviderStrategy: [
      {
        capacityProvider: 'FARGATE_SPOT',
        weight: 1,
        base: 1,
      },
    ],
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets: process.env.FargateSubnet?.split(','),
        securityGroups: [process.env.FargateSecurityGroup ?? ''],
        assignPublicIp: 'DISABLED',
      },
    },
    overrides: {
      containerOverrides: [
        {
          name: 'SelfHostedRunnerContainer',
          environment: [
            {
              name: 'REPO_URL',
              value: htmlUrl,
            },
            {
              name: 'LABELS',
              value: labels.join(','),
            },
            {
              name: 'EPHEMERAL',
              value: '1',
            },
            {
              name: 'DISABLE_AUTO_UPDATE',
              value: 'true',
            },
          ],
        },
      ],
      ...fargateType(type),
    },
  };

  const response = await ecsClient.send(new RunTaskCommand(runTaskRequest));
  console.log(`StartRunner: ${JSON.stringify(response)})`);
  return `Started Fargate spot task: ${response.tasks?.[0]?.taskArn}`;
};

/**
 * self-hosted runnersを開始するための関数
 * @param {string} htmlUrl - レポジトリのURL
 * @param {string[]} labels - ワークフローのジョブラベル
 * @returns {Promise<string>} - 開始メッセージ
 */
export const startRunner = async (htmlUrl: string, labels: string[]): Promise<string> => {
  // ワークフローのジョブラベルから "runs-on" を取得する
  const runOn = labels.find((label) => label.includes('runs-on='))?.match(/runs-on=(.*)/)?.[1] ?? '';
  // ワークフローのジョブラベルから "type" を取得する
  const type = labels.find((label) => label.includes('type='))?.match(/type=(.*)/)?.[1] ?? 'SMALL';

  // run-onにより、self-hosted runnersを起動する場所
  if (runOn === 'CODEBUILD') {
    return startCodeBuild(htmlUrl, labels, type);
  }
  if (runOn === 'FARGATE_SPOT') {
    return startFargateSpot(htmlUrl, labels, type);
  }
  return 'Skipping self-hosted runner setup';
};
