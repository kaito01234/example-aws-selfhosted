/* eslint-disable no-console */
import * as crypto from 'crypto';

import { APIGatewayProxyEventHeaders } from 'aws-lambda';

/**
 * リクエストの署名を検証するために使用される関数
 * @param {string | null} body - リクエストボディの文字列、またはnull。
 * @param {APIGatewayProxyEventHeaders} headers - リクエストヘッダーオブジェクト。
 * @returns {boolean} リクエストが有効な署名を持っている場合はtrue、そうでない場合はfalseを返します。
 */
export const isValidSignature = (body: string | null = '', headers: APIGatewayProxyEventHeaders = {}): boolean => {
  const sigHeaderName = 'X-Hub-Signature-256';
  const sigHashAlg = 'sha256';
  const secret = process.env.GitHubWebhookSecret ?? '';

  if (!Object.prototype.hasOwnProperty.call(headers, sigHeaderName)) {
    return false;
  }

  try {
    const sig = Buffer.from(headers[sigHeaderName] || '', 'utf8');
    const data = body ?? '';
    const hmac = crypto.createHmac(sigHashAlg, secret);
    hmac.update(data);
    const digest = Buffer.from(`${sigHashAlg}=${hmac.digest('hex')}`, 'utf8');

    return crypto.timingSafeEqual(digest, sig);
  } catch (err) {
    console.error(err);
    return false;
  }
};
