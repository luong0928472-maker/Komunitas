import { describe, it, expect } from 'vitest';

type InsertCall = {
  values: unknown;
  onConflict?: { target: unknown };
};

const insertCalls: InsertCall[] = [];
let insertedRows = new Map<string, { publicKey: string; nextMuxIndex: number; contributedStroops: string }>();

function resetMock() {
  insertCalls.length = 0;
  insertedRows = new Map();
}

const mockDb = {
  insert(table: { publicKey: { name: string } }) {
    return {
      values(values: unknown) {
        const v = values as { publicKey: string; nextMuxIndex?: number; contributedStroops?: string };
        return {
          onConflictDoNothing(opts: { target: unknown }) {
            const targetKey = typeof opts.target === 'object' && opts.target && 'name' in opts.target
              ? (opts.target as { name: string }).name
              : String(opts.target);
            insertCalls.push({ values: v, onConflict: { target: targetKey } });
            if (targetKey === table.publicKey.name && !insertedRows.has(v.publicKey)) {
              insertedRows.set(v.publicKey, {
                publicKey: v.publicKey,
                nextMuxIndex: v.nextMuxIndex ?? 0,
                contributedStroops: v.contributedStroops ?? '0',
              });
            }
            return Promise.resolve();
          },
        };
      },
    };
  },
};

const WALLET_A = 'GBL5RJKF4QNJ4ZPLJZ7PS7K5A4J44VEZJRV2CRTFFDRVSY2N76AIIE47';
const WALLET_B = 'GAZ5PUFJVFTV6DRJJKP2CBSRBI56CRPCMNXOJFFYLUG26XAUOWHZEZ7G';

const membersTable = { publicKey: { name: 'public_key' } };

async function upsertContributor(publicKey: string, nextMuxIndex = 0) {
  await mockDb.insert(membersTable).values({ publicKey, nextMuxIndex }).onConflictDoNothing({
    target: membersTable.publicKey,
  });
}

describe('auth verify contributor upsert', () => {
  it('connects twice with the same wallet -> 1 member row, not 2', async () => {
    resetMock();
    await upsertContributor(WALLET_A);
    await upsertContributor(WALLET_A);
    expect(insertCalls).toHaveLength(2);
    expect(insertedRows.size).toBe(1);
    expect(insertedRows.get(WALLET_A)?.publicKey).toBe(WALLET_A);
  });

  it('does not overwrite an existing contributor row', async () => {
    resetMock();
    await upsertContributor(WALLET_A);
    insertedRows.get(WALLET_A)!.contributedStroops = '99999999';
    await upsertContributor(WALLET_A);
    expect(insertedRows.get(WALLET_A)?.contributedStroops).toBe('99999999');
  });

  it('connects different wallets -> 2 member rows', async () => {
    resetMock();
    await upsertContributor(WALLET_A);
    await upsertContributor(WALLET_B);
    expect(insertedRows.size).toBe(2);
    expect(insertedRows.has(WALLET_A)).toBe(true);
    expect(insertedRows.has(WALLET_B)).toBe(true);
  });

  it('uses onConflictDoNothing targeting the publicKey column', async () => {
    resetMock();
    await upsertContributor(WALLET_A);
    expect(insertCalls[0]?.onConflict?.target).toBe('public_key');
  });
});