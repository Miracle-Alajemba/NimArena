const { chromium } = require('playwright');
const fs = require('fs');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  console.log("Navigating to localhost...");
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');
  
  await page.click('text=Word Duel');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/home/miracle-alajemba/.gemini/antigravity-ide/brain/ee15d81a-b333-4e98-8ea9-03b5cd7c2158/artifacts/word_duel_lobby.png' });

  // Click Practice
  await page.locator('h3:has-text("PRACTICE ARENA")').click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/home/miracle-alajemba/.gemini/antigravity-ide/brain/ee15d81a-b333-4e98-8ea9-03b5cd7c2158/artifacts/word_duel_practice.png' });

  // Refresh to go home
  await page.goto('http://localhost:5173/');
  await page.waitForLoadState('networkidle');

  await page.click('text=Speed Trivia');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/home/miracle-alajemba/.gemini/antigravity-ide/brain/ee15d81a-b333-4e98-8ea9-03b5cd7c2158/artifacts/trivia_lobby.png' });

  // Click Practice
  await page.locator('h3:has-text("PRACTICE ARENA")').click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/home/miracle-alajemba/.gemini/antigravity-ide/brain/ee15d81a-b333-4e98-8ea9-03b5cd7c2158/artifacts/trivia_practice.png' });

  await browser.close();
  console.log("Done!");
}

run().catch(console.error);
