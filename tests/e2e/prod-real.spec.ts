import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { type BrowserContext, chromium, expect, type Page, test } from '@playwright/test';
import {
  approveOnce,
  cleanup,
  FREIGHTER,
  getExtensionId,
  launchWithFreighter,
  onboardFreighter,
} from '../../../../../shared/freighter/freighter-fixture';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'https://komunitas-rho.vercel.app';
const PUB = FREIGHTER.deployerPublic;
const ADDR_HEAD = PUB.slice(0, 4);

const SHOTS = path.resolve(__dirname, '../../../screen-shot');
mkdirSync(SHOTS, { recursive: true });
const shot = (page: Page, name: string) =>
  page.screenshot({ path: path.join(SHOTS, name), type: 'jpeg', quality: 85 });

test.describe.configure({ mode: 'serial' });

let context: BrowserContext;
let userDataDir: string;

async function isOnWelcomeScreen(): Promise<boolean> {
  const probe = await context.newPage();
  await probe
    .goto(`chrome-extension://${getExtensionId(context)}/index.html#/`, {
      waitUntil: 'domcontentloaded',
    })
    .catch(() => {});
  await probe.waitForTimeout(2500);
  const welcome = await probe
    .getByRole('button', { name: /I already have a wallet/i })
    .isVisible()
    .catch(() => false);
  await probe.close().catch(() => {});
  return welcome;
}

async function ensureOnboarded(): Promise<void> {
  await isOnWelcomeScreen();
  for (let attempt = 0; attempt < 5; attempt++) {
    await onboardFreighter(context);
    if (!(await isOnWelcomeScreen())) return;
  }
  throw new Error('Freighter onboarding did not complete (still on welcome screen)');
}

test.beforeAll(async () => {
  const launched = await launchWithFreighter(chromium);
  context = launched.context;
  userDataDir = launched.userDataDir;
  await ensureOnboarded();
});

test.afterAll(async () => {
  if (context) await cleanup(context, userDataDir);
});

function walletAddress(page: Page) {
  return page.getByText(new RegExp(ADDR_HEAD)).first();
}

async function screenshotNextPopup(name: string): Promise<void> {
  const popup = await context.waitForEvent('page', { timeout: 60_000 });
  await popup.waitForLoadState('domcontentloaded').catch(() => {});
  await popup.waitForTimeout(1500);
  await popup
    .screenshot({ path: path.join(SHOTS, name), type: 'jpeg', quality: 85 })
    .catch(() => {});
}

async function clickConnect(page: Page): Promise<void> {
  const connectBtn = page.getByRole('button', { name: /connect wallet/i }).first();
  await expect(connectBtn).toBeVisible({ timeout: 20_000 });
  await connectBtn.click();
}

async function connectWithSep10(page: Page): Promise<void> {
  const grantPopup = screenshotNextPopup('02-connect-popup.jpg');
  await clickConnect(page);
  await grantPopup.catch(() => {});

  const challengePopup = screenshotNextPopup('03-sign-challenge-popup.jpg');
  await approveOnce(context, { timeout: 60_000 });
  await challengePopup.catch(() => {});
  await approveOnce(context, { timeout: 90_000 });
}

async function retryConnect(page: Page): Promise<void> {
  await clickConnect(page).catch(() => {});
  await approveOnce(context, { timeout: 30_000 }).catch(() => {});
  await approveOnce(context, { timeout: 30_000 }).catch(() => {});
}

async function connectUntilAddressShows(page: Page): Promise<void> {
  await connectWithSep10(page);
  for (let attempt = 0; attempt < 3; attempt++) {
    if (await walletAddress(page).isVisible({ timeout: 15_000 }).catch(() => false)) return;
    await retryConnect(page);
  }
  await expect(walletAddress(page)).toBeVisible({ timeout: 30_000 });
}

async function pickContribution(page: Page): Promise<void> {
  await page.getByRole('button', { name: '10', exact: true }).click();
  await shot(page, '05-contribute.jpg');
}

test('real Freighter: connect (SEP-10) + on-chain contribute -> real tx hash', async () => {
  test.setTimeout(360_000);
  const page = await context.newPage();

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /community actually steers/i })).toBeVisible({
    timeout: 30_000,
  });
  await shot(page, '01-landing.jpg');

  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /community treasury/i })).toBeVisible({
    timeout: 20_000,
  });
  await connectUntilAddressShows(page);
  await page.waitForTimeout(1500);
  await shot(page, '04-connected-dashboard.jpg');

  await page.goto(`${BASE_URL}/dashboard/contribute`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: /contribute/i }).first()).toBeVisible({
    timeout: 20_000,
  });
  await pickContribution(page);

  await page.getByRole('button', { name: /contribute 10 xlm/i }).click();
  await approveOnce(context, { timeout: 120_000 });

  await expect(page.getByRole('heading', { name: /contribution confirmed/i })).toBeVisible({
    timeout: 120_000,
  });
  await page.waitForTimeout(1000);
  await shot(page, '06-success.jpg');

  const txLink = page.locator('a[href*="stellar.expert"]').first();
  await expect(txLink).toBeVisible({ timeout: 30_000 });
  await txLink.scrollIntoViewIfNeeded().catch(() => {});
  const txHref = await txLink.getAttribute('href');
  expect(txHref).toMatch(/stellar\.expert\/explorer\/testnet\/tx\/[0-9a-f]{64}/);
  await page.waitForTimeout(800);
  await shot(page, '09-contract-tx.jpg');

  await page.goto(`${BASE_URL}/stats`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /live interaction stats/i })).toBeVisible({
    timeout: 20_000,
  });
  await shot(page, '07-stats.jpg');

  const txHash = (txHref ?? '').split('/tx/')[1];
  expect(txHash).toBeTruthy();
  console.log('CORE_FLOW_TX=' + txHash);
});

test('mobile landing renders', async () => {
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /community actually steers/i })).toBeVisible({
    timeout: 20_000,
  });
  await shot(page, '08-mobile.jpg');
});
