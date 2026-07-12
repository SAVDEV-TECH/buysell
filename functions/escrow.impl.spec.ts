import { expect } from 'chai';
import 'mocha';
import { performPaystackTransfer, listFailedAutoReleasesImpl } from './src/escrow';

describe('escrow impls', () => {
  describe('performPaystackTransfer', () => {
    it('throws if PAYSTACK_SECRET_KEY not configured', async () => {
      delete process.env.PAYSTACK_SECRET_KEY;
      let err: any = null;
      try {
        await performPaystackTransfer('escrow1', { manufacturerId: 'm1' } as any);
      } catch (e) { err = e; }
      expect(err).to.exist;
      expect(err.message).to.match(/PAYSTACK_SECRET_KEY not configured/);
    });

    it('throws if escrow missing manufacturerId', async () => {
      process.env.PAYSTACK_SECRET_KEY = 'sk_test_dummy';
      let err: any = null;
      try {
        await performPaystackTransfer('escrow2', { } as any);
      } catch (e) { err = e; }
      expect(err).to.exist;
      expect(err.message).to.match(/missing manufacturerId/);
    });
  });

  describe('listFailedAutoReleasesImpl', () => {
    it('rejects non-admin callers', async () => {
      let err: any = null;
      try {
        await listFailedAutoReleasesImpl({}, { auth: null } as any);
      } catch (e) { err = e; }
      expect(err).to.exist;
      expect(err.code).to.equal('permission-denied');
    });

    it('rejects callers without admin claim', async () => {
      let err: any = null;
      try {
        await listFailedAutoReleasesImpl({}, { auth: { token: { admin: false }}} as any);
      } catch (e) { err = e; }
      expect(err).to.exist;
      expect(err.code).to.equal('permission-denied');
    });
  });
});
