import 'dotenv/config';
import {google} from 'googleapis';
import {getGoogleAuth} from './services/googleAuth.js';
import {getMessage, listUnreadMessageIds} from './services/gmail.js';
import { convert} from 'html-to-text';
import { getAIAnalysis } from './services/gemini.js';
import * as types from './types.js';

function htmlToText(html: string): string{
    return convert(html, {
        wordwrap: 130,
    });
}

async function main() {
  const auth = await getGoogleAuth();

  const gmail = google.gmail({version: 'v1', auth});

  function getHeader(headers: any[], name: string): string | undefined {
    return headers.find(h => h.name === name)?.value;
  }

  

  const unreadIds = await listUnreadMessageIds(gmail);
  //console.log(`Unread message IDs (${unreadIds.length}):`, unreadIds);

  if (unreadIds.length === 0) {
    console.log('No unread messages.');
    return;
  }

  const firstId = unreadIds[0];
  function getBody(payload: any): string | null {
    if (!payload) return null;
  
    // Case 1: direct body
    if (payload.body?.data) {
      return payload.body.data;
    }
  
    // Case 2: multipart
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          return part.body.data;
        }
      }
  
      // fallback to html if plain not found
      for (const part of payload.parts) {
        if (part.mimeType === 'text/html' && part.body?.data) {
          return part.body.data;
        }
      }
    }
  
    return null;
  }

  function decodeBase64(data: string): string {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf-8');
  }
  const message = await getMessage(gmail, firstId);

  const headers = message.payload?.headers ?? [];

  const from = getHeader(headers, 'From');
  const subject = getHeader(headers, 'Subject');
  const rawBody = getBody(message.payload);
  const decoded = rawBody ? decodeBase64(rawBody) : null;
  let finalBody = decoded;

  if (decoded && decoded.includes('<html')) {
    finalBody = htmlToText(decoded); // or stripHtml(decoded)
    finalBody = finalBody.replace(/\r\n/g, '\n')
  }

  // console.log('----- EMAIL -----');
  // console.log('From:', from);
  // console.log('Subject:', subject);  
  // console.log('Body:', finalBody);
  const cleanedEmail: types.CleanedEmail = {
    subject: subject?.trim() ?? '',
    sender: from?.trim() ?? '',
    body: finalBody?.trim() ?? '',
  };
  console.log('Cleaned Email:', cleanedEmail);
  const aiAnalysis = await getAIAnalysis(cleanedEmail);
  console.log('AI Analysis:', aiAnalysis);
}

await main();
