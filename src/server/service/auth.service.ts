import crypto from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import {
  Account,
  BASE_FEE,
  Keypair,
  Operation,
  StrKey,
  Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { db } from '@/server/db/client';
import { authNonces, sessions } from '@/server/db/schema';
import { env } from '@/server/config/env';
import { getNetworkPassphrase } from '@/server/config/stellar';
import { AppError } from '@/server/lib/http';

const AUTH_KEY = `${env.NEXT_PUBLIC_APP_NAME} auth`;

export const authService = {
  /**
   * SEP-10 style challenge: an unsubmittable transaction (sequence 0) carrying a
   * one-time nonce in a manageData op. The wallet signs it to prove key ownership.
   * Network is pinned to the app's testnet passphrase, NOT the wallet's active net.
   */
  async createChallenge(publicKey: string) {
    if (!StrKey.isValidEd25519PublicKey(publicKey)) {
      throw new AppError('INVALID_PUBLIC_KEY', 'INVALID_PUBLIC_KEY', 400);
    }
    const nonce = crypto.randomBytes(32).toString('base64');
    const expiresAt = new Date(Date.now() + env.NONCE_TTL_SECONDS * 1000);

    const account = new Account(publicKey, '0');
    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: getNetworkPassphrase(),
    })
      .addOperation(
        Operation.manageData({ name: AUTH_KEY, value: nonce, source: publicKey }),
      )
      .setTimeout(env.NONCE_TTL_SECONDS)
      .build();

    await db.insert(authNonces).values({ nonce, publicKey, expiresAt });

    return { xdr: tx.toXDR(), nonce, expiresAt };
  },

  async verifyAndCreateSession(publicKey: string, signedXdr: string) {
    if (!StrKey.isValidEd25519PublicKey(publicKey)) {
      throw new AppError('INVALID_PUBLIC_KEY', 'INVALID_PUBLIC_KEY', 400);
    }

    let tx: Transaction;
    try {
      tx = TransactionBuilder.fromXDR(signedXdr, getNetworkPassphrase()) as Transaction;
    } catch {
      throw new AppError('UNAUTHORIZED', 'Malformed signed transaction', 401);
    }

    if (tx.source !== publicKey) {
      throw new AppError('UNAUTHORIZED', 'Challenge source mismatch', 401);
    }

    // Extract the nonce from the manageData op.
    const op = tx.operations.find(
      (o): o is Extract<typeof o, { type: 'manageData' }> =>
        o.type === 'manageData' && o.name === AUTH_KEY,
    );
    if (!op || !op.value) {
      throw new AppError('UNAUTHORIZED', 'Challenge payload missing', 401);
    }
    const nonce = Buffer.from(op.value).toString('utf8');

    const [row] = await db
      .select()
      .from(authNonces)
      .where(
        and(
          eq(authNonces.nonce, nonce),
          eq(authNonces.publicKey, publicKey),
          isNull(authNonces.consumedAt),
        ),
      )
      .limit(1);

    if (!row) throw new AppError('UNAUTHORIZED', 'Invalid or used challenge', 401);
    if (row.expiresAt.getTime() < Date.now()) {
      throw new AppError('UNAUTHORIZED', 'Challenge expired', 401);
    }

    // Cryptographically verify the wallet signed THIS transaction.
    const kp = Keypair.fromPublicKey(publicKey);
    const hash = tx.hash();
    const signed = tx.signatures.some((sig) => {
      try {
        return kp.verify(hash, sig.signature());
      } catch {
        return false;
      }
    });
    if (!signed) {
      throw new AppError('UNAUTHORIZED', 'Signature does not match wallet', 401);
    }

    await db
      .update(authNonces)
      .set({ consumedAt: new Date() })
      .where(eq(authNonces.nonce, nonce));

    const expiresAt = new Date(Date.now() + env.SESSION_TTL_SECONDS * 1000);
    const [session] = await db
      .insert(sessions)
      .values({ publicKey, expiresAt })
      .returning();
    if (!session) throw new AppError('INTERNAL', 'Failed to create session', 500);

    return { sessionId: session.id };
  },

  async destroySession(sessionId: string) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  },
};
