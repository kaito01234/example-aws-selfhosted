import * as cdk from 'aws-cdk-lib';

/**
 * context
 */
export type Context = {
  /**
   * Production flag
   */
  production: boolean;
};

/**
 * stack props
 */
export interface LibStackProps extends cdk.StackProps {
  /**
   * @property {Context} context context
   */
  context: Context;
  /**
   * @property {string} gitHubWebhookSecret gitHubWebhookSecret
   */
  gitHubWebhookSecret: string;
}
