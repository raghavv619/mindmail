import fs from 'node:fs';
import path from 'node:path';
import {authenticate} from '@google-cloud/local-auth';
import {OAuth2Client} from 'google-auth-library';

export const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const TOKEN_PATH = path.join(process.cwd(), 'token.json');

function loadKeyfile(): {client_id: string; client_secret: string} {
  const raw = fs.readFileSync(CREDENTIALS_PATH, 'utf-8');
  const keyFile = JSON.parse(raw) as {
    installed?: {client_id: string; client_secret: string};
    web?: {client_id: string; client_secret: string};
  };
  const keys = keyFile.installed ?? keyFile.web;
  if (!keys?.client_id || !keys?.client_secret) {
    throw new Error('credentials.json must contain installed or web OAuth client id/secret.');
  }
  return {client_id: keys.client_id, client_secret: keys.client_secret};
}

function createOAuth2Client(): OAuth2Client {
  const {client_id, client_secret} = loadKeyfile();
  return new OAuth2Client({clientId: client_id, clientSecret: client_secret});
}

function persistCredentials(client: OAuth2Client) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(client.credentials));
}

function attachTokenPersistence(client: OAuth2Client) {
  client.on('tokens', () => {
    persistCredentials(client);
  });
}

/**
 * Returns an OAuth2 client: uses token.json when present and valid, otherwise
 * opens the browser once. Refreshed access tokens are written back to token.json.
 */
export async function getGoogleAuth(): Promise<OAuth2Client> {
  const client = createOAuth2Client();

  if (fs.existsSync(TOKEN_PATH)) {
    try {
      const saved = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8')) as Parameters<
        OAuth2Client['setCredentials']
      >[0];
      client.setCredentials(saved);
    } catch {
      // Corrupt token file — ignore and re-authenticate
    }
  }

  attachTokenPersistence(client);

  try {
    await client.getAccessToken();
    persistCredentials(client);
    return client;
  } catch {
    // No / unusable token — full OAuth in the browser
  }

  const authed = await authenticate({
    scopes: GMAIL_SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  attachTokenPersistence(authed);
  persistCredentials(authed);
  return authed;
}
