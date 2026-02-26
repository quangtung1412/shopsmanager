import crypto from 'crypto';

/**
 * Verify Etsy webhook signature (HMAC-SHA256)
 * Headers: webhook-id, webhook-timestamp, webhook-signature
 * Signing key: remove 'whsec_' prefix, base64-decode
 */
export function verifyEtsyWebhookSignature(
    payload: string,
    headers: {
        'webhook-id': string;
        'webhook-timestamp': string;
        'webhook-signature': string;
    },
    signingSecret: string
): boolean {
    const msgId = headers['webhook-id'];
    const timestamp = headers['webhook-timestamp'];
    const signatures = headers['webhook-signature'];

    // Build signed content
    const signedContent = `${msgId}.${timestamp}.${payload}`;

    // Decode signing secret (remove whsec_ prefix)
    const secret = signingSecret.startsWith('whsec_')
        ? signingSecret.slice(6)
        : signingSecret;
    const secretBytes = Buffer.from(secret, 'base64');

    // Compute HMAC
    const computedSignature = crypto
        .createHmac('sha256', secretBytes)
        .update(signedContent)
        .digest('base64');

    // Compare with provided signatures (comma-separated)
    const expectedSignature = `v1,${computedSignature}`;
    return signatures
        .split(' ')
        .some((sig) => sig === expectedSignature);
}
