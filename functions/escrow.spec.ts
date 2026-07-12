import { expect } from 'chai';
import 'mocha';
import { verifyPaystackSignature } from './src/escrow';
import * as crypto from 'crypto';

describe('escrow helpers', () => {
  describe('verifyPaystackSignature', () => {
    it('returns true for valid signature', () => {
      // Arrange
      const webhookSecret = 'test_secret_123';
      process.env.PAYSTACK_WEBHOOK_SECRET = webhookSecret;

      const body = { event: 'charge.success', data: { reference: 'ref_123' } };
      const raw = Buffer.from(JSON.stringify(body));
      const hmac = crypto.createHmac('sha512', webhookSecret).update(raw).digest('hex');

      const req: any = { rawBody: raw, headers: { 'x-paystack-signature': hmac }, body };

      // Act
      const ok = verifyPaystackSignature(req as any);

      // Assert
      expect(ok).to.be.true;
    });

    it('returns false for invalid signature', () => {
      process.env.PAYSTACK_WEBHOOK_SECRET = 'another_secret';
      const body = { event: 'charge.success', data: { reference: 'ref_123' } };
      const raw = Buffer.from(JSON.stringify(body));
      const invalid = 'deadbeef';
      const req: any = { rawBody: raw, headers: { 'x-paystack-signature': invalid }, body };

      const ok = verifyPaystackSignature(req as any);
      expect(ok).to.be.false;
    });
  });
});
