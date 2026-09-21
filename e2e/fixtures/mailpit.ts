import { request } from '@playwright/test';
import type { APIRequestContext } from '@playwright/test';

const MAILPIT_BASE_URL = 'http://localhost:8025';
const POLL_INTERVAL_MS = 500;
const POLL_TIMEOUT_MS = 15_000;
interface MailpitMessageSummary {
  readonly ID: string;
}
interface MailpitSearchResult {
  readonly messages: readonly MailpitMessageSummary[];
}
interface MailpitMessage {
  readonly HTML: string;
}
export async function waitForEmailLink(to: string, subject: string): Promise<string> {
  const context = await request.newContext();
  try {
    return await pollForLink(context, to, subject);
  } finally {
    await context.dispose();
  }
}
async function pollForLink(context: APIRequestContext, to: string, subject: string): Promise<string> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const messageId = await findLatestMessageId(context, to, subject);
    if (messageId !== null) {
      return await extractLink(context, messageId);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`Nenhum e-mail "${subject}" recebido para ${to} em ${POLL_TIMEOUT_MS}ms`);
}
async function findLatestMessageId(context: APIRequestContext, to: string, subject: string): Promise<string | null> {
  const query = `to:${to} subject:"${subject}"`;
  const response = await context.get(`${MAILPIT_BASE_URL}/api/v1/search`, { params: { query } });
  const body = (await response.json()) as MailpitSearchResult;
  return body.messages.at(0)?.ID ?? null;
}
async function extractLink(context: APIRequestContext, messageId: string): Promise<string> {
  const response = await context.get(`${MAILPIT_BASE_URL}/api/v1/message/${messageId}`);
  const body = (await response.json()) as MailpitMessage;
  const link = /href="([^"]+)"/.exec(body.HTML)?.[1];
  if (link === undefined) {
    throw new Error('Link não encontrado no corpo do e-mail');
  }
  return link;
}
