import * as fs from 'fs';

/**
 * package.jsonからdependenciesの一覧を取得する
 * @param {string} path ファイルパス
 * @returns {string[]} jsonオブジェクト
 */
export const loadDependencies = (path: string): string[] => {
  // package.jsonを読み込み
  const loadFile = fs.readFileSync(path, 'utf8');
  // JSONにparse
  const packageJson = JSON.parse(loadFile);
  // dependenciesの一覧を返却
  return Object.keys(packageJson.dependencies);
};
