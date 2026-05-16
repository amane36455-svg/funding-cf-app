import { appendFile } from 'node:fs/promises';

type JsonObject = Record<string, unknown>;

type RichTextItem = {
  plain_text?: string;
  text?: {
    content?: string;
  };
};

type NotionProperty = {
  id?: string;
  type?: string;
  title?: RichTextItem[];
  rich_text?: RichTextItem[];
  checkbox?: boolean;
  select?: { name?: string } | null;
  status?: { name?: string } | null;
  multi_select?: Array<{ name?: string }>;
  url?: string | null;
  email?: string | null;
  phone_number?: string | null;
  number?: number | null;
  formula?: {
    type?: string;
    string?: string | null;
    boolean?: boolean | null;
    number?: number | null;
  };
};

type NotionPage = {
  object: string;
  id: string;
  url?: string;
  properties: Record<string, NotionProperty>;
};

type NotionListResponse = {
  object: string;
  results: Array<NotionPage | JsonObject>;
  has_more: boolean;
  next_cursor: string | null;
};

type NotionDatabaseResponse = {
  id: string;
  data_sources?: Array<{ id?: string }>;
};

type QueryTarget =
  | { kind: 'data_source'; id: string }
  | { kind: 'database'; id: string };

type GitHubIssue = {
  html_url: string;
  number: number;
};

type GitHubSearchResponse = {
  items?: GitHubIssue[];
};

type PropertyMatch = {
  name: string;
  property: NotionProperty;
};

type Summary = {
  scanned: number;
  skipped: number;
  gated: number;
  created: number;
  linkedExisting: number;
  failed: number;
};

const NOTION_API_BASE = 'https://api.notion.com/v1';
const GITHUB_API_BASE = 'https://api.github.com';
const DEFAULT_NOTION_VERSION = '2026-03-11';
const TARGET_REPO_NAME = process.env.NOTION_TARGET_GITHUB_REPO ?? 'funding-cf-app';

const FIELD_ALIASES = {
  taskName: ['タスク名', 'Name', '名前'],
  business: ['事業区分'],
  assignedAi: ['担当AI'],
  role: ['役割'],
  instruction: ['指示本文'],
  nextAction: ['次アクション'],
  automationTarget: ['自動化対象'],
  externalStatus: ['外部連携ステータス'],
  githubRepo: ['GitHub Repo', 'GitHub Repository'],
  issueCreated: ['Issue作成済み'],
  dbImpact: ['DB影響'],
  secretImpact: ['secret影響', 'Secret影響'],
  productionImpact: ['本番影響'],
  aiConfirmation: ['アイさん確認'],
  humanConfirmationType: ['人間確認種別'],
  githubIssueUrl: ['GitHub Issue URL', 'GitHub Issue'],
  state: ['状態', 'Status'],
  automationLog: ['自動化ログ'],
} as const;

const REQUIRED_HUMAN_CONFIRMATION_TYPES = [
  '本番反映',
  'DB変更',
  'secret',
  '課金',
  '外注',
  '投稿',
  '仕様判断',
];

const ISSUE_CREATED_STATUS = 'Issue作成済み';
const ISSUE_WAITING_STATUS = 'Issue作成待ち';
const WORKING_STATE = '作業中';
const APPROVAL_WAITING_STATE = '承認待ち';
const GATED_LOG = 'アイさん確認が必要なため、GitHub Issue自動作成を停止しました。';
const ISSUE_CREATED_LOG = 'GitHub ActionsでIssue作成完了';
const REQUIRED_ISSUE_FIELDS = [
  FIELD_ALIASES.githubIssueUrl,
  FIELD_ALIASES.issueCreated,
  FIELD_ALIASES.externalStatus,
  FIELD_ALIASES.state,
  FIELD_ALIASES.automationTarget,
  FIELD_ALIASES.automationLog,
  FIELD_ALIASES.dbImpact,
  FIELD_ALIASES.secretImpact,
  FIELD_ALIASES.productionImpact,
  FIELD_ALIASES.aiConfirmation,
  FIELD_ALIASES.humanConfirmationType,
] as const;
const REQUIRED_WRITABLE_FIELDS = [
  { aliases: FIELD_ALIASES.githubIssueUrl, kind: 'text' },
  { aliases: FIELD_ALIASES.issueCreated, kind: 'checkbox' },
  { aliases: FIELD_ALIASES.externalStatus, kind: 'text' },
  { aliases: FIELD_ALIASES.state, kind: 'text' },
  { aliases: FIELD_ALIASES.automationTarget, kind: 'checkbox' },
  { aliases: FIELD_ALIASES.automationLog, kind: 'text' },
] as const;

class ApiError extends Error {
  constructor(
    public readonly service: 'Notion' | 'GitHub',
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value : undefined;
}

function getNotionToken(): string {
  return requiredEnv('NOTION_TOKEN');
}

function getGitHubToken(): string {
  return optionalEnv('GH_TOKEN') ?? requiredEnv('GITHUB_TOKEN');
}

function getGitHubRepository(): string {
  return requiredEnv('GITHUB_REPOSITORY');
}

function notionVersion(): string {
  return optionalEnv('NOTION_VERSION') ?? DEFAULT_NOTION_VERSION;
}

function shortPageId(pageId: string): string {
  return pageId.replaceAll('-', '').slice(0, 12);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson<T>(
  service: 'Notion' | 'GitHub',
  url: string,
  init: RequestInit,
): Promise<T> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const response = await fetch(url, init);
    const shouldRetry =
      attempt < maxAttempts &&
      (response.status === 429 || response.status === 502 || response.status === 503 || response.status === 504);

    if (shouldRetry) {
      const retryAfter = response.headers.get('retry-after');
      const retryAfterMs = retryAfter ? Number(retryAfter) * 1000 : attempt * 1000;
      await sleep(Number.isFinite(retryAfterMs) ? retryAfterMs : attempt * 1000);
      continue;
    }

    if (!response.ok) {
      throw new ApiError(
        service,
        response.status,
        `${service} API request failed with status ${response.status}`,
      );
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }

  throw new Error(`${service} API request failed after retries`);
}

async function notionRequest<T>(method: 'GET' | 'POST' | 'PATCH', path: string, body?: JsonObject): Promise<T> {
  return requestJson<T>('Notion', `${NOTION_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getNotionToken()}`,
      'Content-Type': 'application/json',
      'Notion-Version': notionVersion(),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function githubRequest<T>(method: 'GET' | 'POST', path: string, body?: JsonObject): Promise<T> {
  return requestJson<T>('GitHub', `${GITHUB_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${getGitHubToken()}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function resolveQueryTarget(): Promise<QueryTarget> {
  const dataSourceId = optionalEnv('NOTION_DATA_SOURCE_ID');
  if (dataSourceId) {
    return { kind: 'data_source', id: dataSourceId };
  }

  const databaseId = optionalEnv('NOTION_DATABASE_ID');
  if (!databaseId) {
    throw new Error('Set NOTION_DATA_SOURCE_ID or NOTION_DATABASE_ID.');
  }

  try {
    const database = await notionRequest<NotionDatabaseResponse>('GET', `/databases/${databaseId}`);
    const firstDataSourceId = database.data_sources?.find((dataSource) => dataSource.id)?.id;
    if (firstDataSourceId) {
      return { kind: 'data_source', id: firstDataSourceId };
    }
  } catch (error) {
    console.warn(`Could not resolve a data source from NOTION_DATABASE_ID (${safeErrorMessage(error)}).`);
  }

  return { kind: 'database', id: databaseId };
}

async function queryAllPages(target: QueryTarget): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let startCursor: string | undefined;

  do {
    const body: JsonObject = {
      page_size: 100,
      ...(startCursor ? { start_cursor: startCursor } : {}),
      ...(target.kind === 'data_source' ? { result_type: 'page' } : {}),
    };

    const path =
      target.kind === 'data_source'
        ? `/data_sources/${target.id}/query`
        : `/databases/${target.id}/query`;
    const response = await notionRequest<NotionListResponse>('POST', path, body);

    for (const result of response.results) {
      if (result.object === 'page' && 'properties' in result) {
        pages.push(result as NotionPage);
      }
    }

    startCursor = response.next_cursor ?? undefined;
    if (!response.has_more) {
      break;
    }
  } while (startCursor);

  return pages;
}

function getProperty(
  properties: Record<string, NotionProperty>,
  aliases: readonly string[],
): PropertyMatch | undefined {
  for (const alias of aliases) {
    const property = properties[alias];
    if (property) {
      return { name: alias, property };
    }
  }
  return undefined;
}

function hasProperty(page: NotionPage, aliases: readonly string[]): boolean {
  return Boolean(getProperty(page.properties, aliases));
}

function isWritableTextProperty(property: NotionProperty): boolean {
  return ['rich_text', 'title', 'url', 'select', 'status', 'email', 'phone_number'].includes(property.type ?? '');
}

function isWritableCheckboxProperty(property: NotionProperty): boolean {
  return property.type === 'checkbox';
}

function hasUnsupportedWritableField(page: NotionPage): boolean {
  return REQUIRED_WRITABLE_FIELDS.some(({ aliases, kind }) => {
    const property = getProperty(page.properties, aliases)?.property;
    if (!property) return true;
    return kind === 'text' ? !isWritableTextProperty(property) : !isWritableCheckboxProperty(property);
  });
}

function richTextToString(items: RichTextItem[] | undefined): string {
  return items?.map((item) => item.plain_text ?? item.text?.content ?? '').join('') ?? '';
}

function propertyToText(property: NotionProperty | undefined): string {
  if (!property) return '';

  switch (property.type) {
    case 'title':
      return richTextToString(property.title);
    case 'rich_text':
      return richTextToString(property.rich_text);
    case 'select':
      return property.select?.name ?? '';
    case 'status':
      return property.status?.name ?? '';
    case 'multi_select':
      return property.multi_select?.map((item) => item.name).filter(Boolean).join(', ') ?? '';
    case 'url':
      return property.url ?? '';
    case 'email':
      return property.email ?? '';
    case 'phone_number':
      return property.phone_number ?? '';
    case 'number':
      return property.number == null ? '' : String(property.number);
    case 'checkbox':
      return property.checkbox ? 'true' : 'false';
    case 'formula':
      return formulaToText(property);
    default:
      return '';
  }
}

function formulaToText(property: NotionProperty): string {
  if (!property.formula) return '';
  switch (property.formula.type) {
    case 'string':
      return property.formula.string ?? '';
    case 'boolean':
      return property.formula.boolean ? 'true' : 'false';
    case 'number':
      return property.formula.number == null ? '' : String(property.formula.number);
    default:
      return '';
  }
}

function propertyToCheckbox(property: NotionProperty | undefined): boolean {
  if (!property) return false;
  if (property.type === 'checkbox') return Boolean(property.checkbox);
  if (property.type === 'formula' && property.formula?.type === 'boolean') {
    return Boolean(property.formula.boolean);
  }
  return ['true', 'yes', '1', 'checked'].includes(propertyToText(property).trim().toLowerCase());
}

function propertyToMultiSelect(property: NotionProperty | undefined): string[] {
  if (!property) return [];
  if (property.type === 'multi_select') {
    return property.multi_select?.map((item) => item.name).filter((name): name is string => Boolean(name)) ?? [];
  }
  return propertyToText(property)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function textValue(page: NotionPage, aliases: readonly string[]): string {
  return propertyToText(getProperty(page.properties, aliases)?.property).trim();
}

function checkboxValue(page: NotionPage, aliases: readonly string[]): boolean {
  return propertyToCheckbox(getProperty(page.properties, aliases)?.property);
}

function multiSelectValue(page: NotionPage, aliases: readonly string[]): string[] {
  return propertyToMultiSelect(getProperty(page.properties, aliases)?.property);
}

function isTargetRepo(value: string): boolean {
  return value === TARGET_REPO_NAME || value.endsWith(`/${TARGET_REPO_NAME}`);
}

function hasIssueAlready(page: NotionPage): boolean {
  return (
    checkboxValue(page, FIELD_ALIASES.issueCreated) ||
    textValue(page, FIELD_ALIASES.githubIssueUrl).length > 0
  );
}

function humanConfirmationRequired(page: NotionPage): boolean {
  const requestedTypes = multiSelectValue(page, FIELD_ALIASES.humanConfirmationType);
  return requestedTypes.some((type) =>
    REQUIRED_HUMAN_CONFIRMATION_TYPES.some((required) => required.toLowerCase() === type.toLowerCase()),
  );
}

function sensitivePatternFound(...values: string[]): boolean {
  const combined = values.join('\n');
  const patterns = [
    /\b(?:api[_-]?key|token|secret|password|database[_-]?url|db[_ -]?url)\s*[:=]\s*["']?[^\s"']{8,}/i,
    /\b(?:sk|ghp|github_pat|ntn|secret)_[A-Za-z0-9_=-]{16,}/,
    /\b(?:postgres|postgresql|mysql|mongodb):\/\/[^:\s/]+:[^@\s]+@/i,
    /\bBearer\s+[A-Za-z0-9._=-]{16,}/i,
  ];

  return patterns.some((pattern) => pattern.test(combined));
}

function shouldConsider(page: NotionPage): boolean {
  const automationTarget = checkboxValue(page, FIELD_ALIASES.automationTarget);
  const externalStatus = textValue(page, FIELD_ALIASES.externalStatus);
  const repo = textValue(page, FIELD_ALIASES.githubRepo);

  return (
    automationTarget &&
    externalStatus === ISSUE_WAITING_STATUS &&
    isTargetRepo(repo) &&
    !hasIssueAlready(page)
  );
}

function gateReasons(page: NotionPage): string[] {
  const reasons: string[] = [];

  const hasMissingRequiredField = REQUIRED_ISSUE_FIELDS.some((aliases) => !hasProperty(page, aliases));
  if (hasMissingRequiredField) reasons.push('missing required Notion property');
  if (hasUnsupportedWritableField(page)) reasons.push('unsupported writable Notion property');

  if (checkboxValue(page, FIELD_ALIASES.dbImpact)) reasons.push('DB impact');
  if (checkboxValue(page, FIELD_ALIASES.secretImpact)) reasons.push('secret impact');
  if (checkboxValue(page, FIELD_ALIASES.productionImpact)) reasons.push('production impact');
  if (checkboxValue(page, FIELD_ALIASES.aiConfirmation)) reasons.push('Ai confirmation');
  if (humanConfirmationRequired(page)) reasons.push('human confirmation type');

  const taskContent = [
    textValue(page, FIELD_ALIASES.taskName),
    textValue(page, FIELD_ALIASES.business),
    textValue(page, FIELD_ALIASES.assignedAi),
    textValue(page, FIELD_ALIASES.role),
    textValue(page, FIELD_ALIASES.instruction),
    textValue(page, FIELD_ALIASES.nextAction),
  ];
  if (sensitivePatternFound(...taskContent)) {
    reasons.push('sensitive-looking text');
  }

  return reasons;
}

function redactForIssue(value: string): string {
  return value
    .replace(
      /\b(?:api[_-]?key|token|secret|password|database[_-]?url|db[_ -]?url)\s*[:=]\s*["']?[^\s"']{8,}/gi,
      '[REDACTED]',
    )
    .replace(/\b(?:sk|ghp|github_pat|ntn|secret)_[A-Za-z0-9_=-]{16,}/g, '[REDACTED]')
    .replace(/\b((?:postgres|postgresql|mysql|mongodb):\/\/[^:\s/]+):[^@\s]+@/gi, '$1:[REDACTED]@')
    .replace(/\bBearer\s+[A-Za-z0-9._=-]{16,}/gi, 'Bearer [REDACTED]');
}

function trimForIssue(value: string): string {
  const safeValue = redactForIssue(value.trim());
  const maxLength = 12000;
  if (safeValue.length <= maxLength) return safeValue || '未記入';
  return `${safeValue.slice(0, maxLength)}\n\n[長文のため自動連携時に省略]`;
}

function trimForNotionLog(value: string): string {
  const safeValue = redactForIssue(value.trim());
  const maxLength = 1900;
  if (safeValue.length <= maxLength) return safeValue;
  return `${safeValue.slice(0, maxLength)}...`;
}

function issueMarker(pageId: string): string {
  return `notion-page-id:${pageId}`;
}

function buildIssueTitle(page: NotionPage): string {
  const taskName = trimForIssue(textValue(page, FIELD_ALIASES.taskName));
  const title = `【AI自動連携タスク】${taskName}`;
  return title.length <= 240 ? title : `${title.slice(0, 237)}...`;
}

function buildIssueBody(page: NotionPage): string {
  return `【AI自動連携タスク】

## 対応目的
${trimForIssue(textValue(page, FIELD_ALIASES.taskName))}

## 事業区分
${trimForIssue(textValue(page, FIELD_ALIASES.business))}

## 担当AI
${trimForIssue(textValue(page, FIELD_ALIASES.assignedAi))}

## 役割
${trimForIssue(textValue(page, FIELD_ALIASES.role))}

## 指示本文
${trimForIssue(textValue(page, FIELD_ALIASES.instruction))}

## 次アクション
${trimForIssue(textValue(page, FIELD_ALIASES.nextAction))}

## 安全ルール
- 本番反映しない
- DB migrationを勝手に実行しない
- secret、APIキー、DB URL、トークン、個人情報を出力しない
- 目的不明な大規模変更をしない
- 作業開始前に、変更予定ファイル・影響範囲・実行予定テストを報告する
- companyIdスコープ、認証、権限、DB保存処理に関わる場合は必ずアイさん確認に回す

## 完了報告形式

【Codex開発報告】

1. 対応Issue
2. 作業目的
3. 変更ファイル
4. 実装内容
5. 実行した確認
   - typecheck:
   - build:
   - lint:
   - test:
6. 発生したエラー
7. 未解決事項
8. アイさん確認事項
9. 次に進める作業

<!-- ${issueMarker(page.id)} -->`;
}

async function findExistingIssue(page: NotionPage): Promise<GitHubIssue | undefined> {
  const repository = getGitHubRepository();
  const marker = issueMarker(page.id);
  const query = encodeURIComponent(`repo:${repository} type:issue in:body "${marker}"`);
  const response = await githubRequest<GitHubSearchResponse>('GET', `/search/issues?q=${query}&per_page=1`);
  return response.items?.[0];
}

async function createGitHubIssue(page: NotionPage): Promise<GitHubIssue> {
  const repository = getGitHubRepository();
  const repoName = repository.split('/').at(-1);
  if (repoName !== TARGET_REPO_NAME) {
    throw new Error(`GITHUB_REPOSITORY must target ${TARGET_REPO_NAME}.`);
  }

  return githubRequest<GitHubIssue>('POST', `/repos/${repository}/issues`, {
    title: buildIssueTitle(page),
    body: buildIssueBody(page),
  });
}

function richTextProperty(content: string): JsonObject {
  return {
    rich_text: [
      {
        type: 'text',
        text: {
          content: trimForNotionLog(content),
        },
      },
    ],
  };
}

function titleProperty(content: string): JsonObject {
  return {
    title: [
      {
        type: 'text',
        text: {
          content: trimForNotionLog(content),
        },
      },
    ],
  };
}

function buildTextUpdate(property: NotionProperty, content: string): JsonObject | undefined {
  switch (property.type) {
    case 'rich_text':
      return richTextProperty(content);
    case 'title':
      return titleProperty(content);
    case 'url':
      return { url: content || null };
    case 'select':
      return content ? { select: { name: content } } : { select: null };
    case 'status':
      return { status: { name: content } };
    case 'email':
      return { email: content || null };
    case 'phone_number':
      return { phone_number: content || null };
    default:
      return undefined;
  }
}

function buildCheckboxUpdate(property: NotionProperty, checked: boolean): JsonObject | undefined {
  return property.type === 'checkbox' ? { checkbox: checked } : undefined;
}

function addUpdate(
  page: NotionPage,
  properties: Record<string, JsonObject>,
  aliases: readonly string[],
  build: (property: NotionProperty) => JsonObject | undefined,
): void {
  const match = getProperty(page.properties, aliases);
  if (!match) {
    console.warn(`Notion property is missing on page ${shortPageId(page.id)}.`);
    return;
  }

  const update = build(match.property);
  if (!update) {
    console.warn(`Notion property type is unsupported on page ${shortPageId(page.id)}.`);
    return;
  }

  properties[match.name] = update;
}

async function patchNotionProperties(page: NotionPage, properties: Record<string, JsonObject>): Promise<void> {
  const entries = Object.entries(properties);
  if (entries.length === 0) {
    console.warn(`No writable Notion properties found for page ${shortPageId(page.id)}.`);
    return;
  }

  try {
    await notionRequest<JsonObject>('PATCH', `/pages/${page.id}`, { properties });
  } catch (error) {
    console.warn(`Bulk Notion update failed for page ${shortPageId(page.id)}; retrying fields individually.`);

    let failedFields = 0;
    for (const [name, value] of entries) {
      try {
        await notionRequest<JsonObject>('PATCH', `/pages/${page.id}`, {
          properties: {
            [name]: value,
          },
        });
      } catch {
        failedFields += 1;
        console.warn(`Notion field update failed for page ${shortPageId(page.id)}.`);
      }
    }

    if (failedFields > 0) {
      throw error;
    }
  }
}

async function markGated(page: NotionPage): Promise<void> {
  const properties: Record<string, JsonObject> = {};

  addUpdate(page, properties, FIELD_ALIASES.externalStatus, (property) =>
    buildTextUpdate(property, APPROVAL_WAITING_STATE),
  );
  addUpdate(page, properties, FIELD_ALIASES.state, (property) =>
    buildTextUpdate(property, APPROVAL_WAITING_STATE),
  );
  addUpdate(page, properties, FIELD_ALIASES.aiConfirmation, (property) =>
    buildCheckboxUpdate(property, true),
  );
  addUpdate(page, properties, FIELD_ALIASES.automationTarget, (property) =>
    buildCheckboxUpdate(property, false),
  );
  addUpdate(page, properties, FIELD_ALIASES.automationLog, (property) =>
    buildTextUpdate(property, GATED_LOG),
  );

  await patchNotionProperties(page, properties);
}

async function markIssueCreated(page: NotionPage, issueUrl: string): Promise<void> {
  const properties: Record<string, JsonObject> = {};

  addUpdate(page, properties, FIELD_ALIASES.githubIssueUrl, (property) =>
    buildTextUpdate(property, issueUrl),
  );
  addUpdate(page, properties, FIELD_ALIASES.issueCreated, (property) =>
    buildCheckboxUpdate(property, true),
  );
  addUpdate(page, properties, FIELD_ALIASES.externalStatus, (property) =>
    buildTextUpdate(property, ISSUE_CREATED_STATUS),
  );
  addUpdate(page, properties, FIELD_ALIASES.state, (property) =>
    buildTextUpdate(property, WORKING_STATE),
  );
  addUpdate(page, properties, FIELD_ALIASES.automationTarget, (property) =>
    buildCheckboxUpdate(property, false),
  );
  addUpdate(page, properties, FIELD_ALIASES.automationLog, (property) =>
    buildTextUpdate(property, ISSUE_CREATED_LOG),
  );

  await patchNotionProperties(page, properties);
}

async function writePageError(page: NotionPage, error: unknown): Promise<void> {
  const message = `GitHub ActionsでIssue作成に失敗しました: ${safeErrorMessage(error)}`;
  const properties: Record<string, JsonObject> = {};
  addUpdate(page, properties, FIELD_ALIASES.automationLog, (property) =>
    buildTextUpdate(property, message),
  );

  try {
    await patchNotionProperties(page, properties);
  } catch {
    console.warn(`Could not write error log to Notion page ${shortPageId(page.id)}.`);
  }
}

function safeErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return `${error.service} API status ${error.status}`;
  }
  if (error instanceof Error) {
    return redactForIssue(error.message);
  }
  return 'Unknown error';
}

async function writeStepSummary(summary: Summary): Promise<void> {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;

  const markdown = [
    '## Notion to GitHub Issue Sync',
    '',
    `- scanned: ${summary.scanned}`,
    `- created: ${summary.created}`,
    `- gated: ${summary.gated}`,
    `- linkedExisting: ${summary.linkedExisting}`,
    `- skipped: ${summary.skipped}`,
    `- failed: ${summary.failed}`,
    '',
  ].join('\n');

  try {
    await appendFile(summaryPath, markdown, 'utf8');
  } catch (error) {
    console.warn(`Could not write GitHub Step Summary: ${safeErrorMessage(error)}`);
  }
}

async function processPage(page: NotionPage, summary: Summary): Promise<void> {
  if (!shouldConsider(page)) {
    summary.skipped += 1;
    return;
  }

  const reasons = gateReasons(page);
  if (reasons.length > 0) {
    try {
      await markGated(page);
      summary.gated += 1;
      console.log(`Stopped page ${shortPageId(page.id)} for Ai confirmation.`);
    } catch (error) {
      summary.failed += 1;
      console.warn(`Failed to stop page ${shortPageId(page.id)} for Ai confirmation: ${safeErrorMessage(error)}`);
    }
    return;
  }

  try {
    const existingIssue = await findExistingIssue(page);
    if (existingIssue) {
      await markIssueCreated(page, existingIssue.html_url);
      summary.linkedExisting += 1;
      console.log(`Linked existing issue for page ${shortPageId(page.id)}.`);
      return;
    }

    const issue = await createGitHubIssue(page);
    await markIssueCreated(page, issue.html_url);
    summary.created += 1;
    console.log(`Created issue #${issue.number} for page ${shortPageId(page.id)}.`);
  } catch (error) {
    summary.failed += 1;
    console.warn(`Failed to process page ${shortPageId(page.id)}: ${safeErrorMessage(error)}`);
    await writePageError(page, error);
  }
}

async function main(): Promise<void> {
  const target = await resolveQueryTarget();
  const pages = await queryAllPages(target);
  const summary: Summary = {
    scanned: pages.length,
    skipped: 0,
    gated: 0,
    created: 0,
    linkedExisting: 0,
    failed: 0,
  };

  console.log(`Scanned ${pages.length} Notion pages.`);

  for (const page of pages) {
    await processPage(page, summary);
  }

  console.log(
    `Done: scanned=${summary.scanned}, skipped=${summary.skipped}, gated=${summary.gated}, created=${summary.created}, linkedExisting=${summary.linkedExisting}, failed=${summary.failed}`,
  );
  await writeStepSummary(summary);

  if (summary.failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(`Automation failed: ${safeErrorMessage(error)}`);
  process.exitCode = 1;
});

export {};
