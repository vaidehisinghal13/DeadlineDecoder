import {
  DecodeError,
  type DecodeErrorBody,
  type DecodeRequest,
  type DecodeResponse,
} from '../types';
import { validateDecodeResponse } from './validate';

/**
 * Call the serverless decode endpoint. Resolves to a validated DecodeResponse,
 * or throws a typed DecodeError the UI can present and recover from.
 */
export async function decodeAssignment(input: DecodeRequest): Promise<DecodeResponse> {
  let res: Response;
  try {
    res = await fetch('/api/decode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    throw new DecodeError(
      'network_error',
      'Could not reach the server. Check your connection, or load the sample assignment.',
    );
  }

  if (!res.ok) {
    let body: Partial<DecodeErrorBody> = {};
    try {
      body = (await res.json()) as Partial<DecodeErrorBody>;
    } catch {
      // Non-JSON error body — fall through to a generic message.
    }
    const code = body.error ?? 'upstream_error';
    const message =
      body.message ?? 'Something went wrong while decoding. Please try again or load the sample.';
    throw new DecodeError(code, message);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new DecodeError('invalid_ai_response', 'The server returned an unreadable response.');
  }

  try {
    return validateDecodeResponse(data);
  } catch {
    throw new DecodeError(
      'invalid_ai_response',
      'The decoded result was not in the expected format.',
    );
  }
}
