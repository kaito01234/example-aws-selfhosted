/* eslint-disable no-console */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

import { isValidSignature } from './auth';
import { startRunner } from './start-runnner';

/**
 * GitHub ActionsのSelf-hosted Runnerを構築するためのLambda関数
 * @param {APIGatewayProxyEvent} event API Gatewayのイベントオブジェクト
 * @returns {Promise<APIGatewayProxyResult>} Lambda関数のレスポンス
 * @throws {Error} 認証に失敗した場合、またはCodeBuild/Fargate Spotの起動に失敗した場合に例外が発生する可能性があります
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // 認証
  if (process.env.GitHubWebhookSecret !== '') {
    if (!isValidSignature(event.body, event.headers)) {
      const message = 'signature is invalid';
      console.error(message);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
        }),
      };
    }
    console.log('signature is valid');
  }

  // labelsとrun_idを取得
  const body = JSON.parse(event.body ?? '{}');
  const workflowJob = body?.workflow_job ?? {};
  const labels: string[] = workflowJob?.labels ?? [];
  const runId: string = workflowJob?.run_id ?? '';

  // queuedイベント以外は処理しない
  const action = body?.action;
  if (action !== 'queued') {
    const message = `Skip because it is not a \`queued\` event: ${runId}`;
    console.log(message);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
      }),
    };
  }

  // レポジトリのURLを取得
  const htmlUrl = body?.repository.html_url ?? '';

  // ワークフローのジョブラベルに "self-hosted" が存在するか確認する
  const isSelfHosted = labels.includes('self-hosted');
  if (!isSelfHosted) {
    const message = `Skip because it is not a \`self-hosted\` event: ${runId}`;
    console.log(message);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    };
  }

  try {
    // self-hosted runnersを起動
    const message = await startRunner(htmlUrl, labels);
    console.log(message);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    const message = `Failed to start: ${err.message}`;
    console.error(message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
      }),
    };
  }
};
