import type {gmail_v1} from 'googleapis';

const UNREAD_QUERY = 'is:unread';

/**
 * Lists message IDs for the current user matching `is:unread`.
 */
export async function listUnreadMessageIds(
  gmail: gmail_v1.Gmail,
  options?: {maxResults?: number},
): Promise<string[]> {
  const res = await gmail.users.messages.list({
    userId: 'me',
    q: UNREAD_QUERY,
    maxResults: options?.maxResults ?? 100,
  });
  const messages = res.data.messages ?? [];
  return messages.map((m) => m.id).filter((id): id is string => Boolean(id));
}

/**
 * Fetches a single message by ID (default format: full).
 */
export async function getMessage(
  gmail: gmail_v1.Gmail,
  messageId: string,
  format: 'full' | 'metadata' | 'minimal' | 'raw' = 'full',
): Promise<gmail_v1.Schema$Message> {
  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format,
  });
  if (!res.data) {
    throw new Error(`No data for message ${messageId}`);
  }
  return res.data;
}
