import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 1000 },
];

for (const viewport of viewports) {
  test(`${viewport.name}: homepage and article never overflow the viewport`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const consoleErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });

    for (const route of ['/', '/writing/animesh/']) {
      await page.goto(route);
      await expect(page.locator('main')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    }

    expect(consoleErrors).toEqual([]);
  });
}

test('homepage exposes exactly one understandable article entry', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Software systems, built and explained.');
  await expect(page.locator('.article-entry')).toHaveCount(1);
  await page.locator('.article-entry').click();
  await expect(page).toHaveURL(/\/writing\/animesh\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('I just wanted to know when an episode dropped');
});

test('diagram loads and scrolls inside its own container on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/writing/animesh/');

  const diagram = page.locator('.media--diagram');
  const image = diagram.locator('img');
  const scroller = diagram.locator('.media__scroll');
  await expect(diagram).toBeVisible();
  await expect(image).toHaveAttribute('alt', /Animesh architecture/);
  await diagram.scrollIntoViewIfNeeded();

  await expect.poll(
    () => image.evaluate((element) => element.complete && element.naturalWidth > 0),
  ).toBe(true);

  const dimensions = await scroller.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    right: element.getBoundingClientRect().right,
  }));
  expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);
  expect(dimensions.right).toBeLessThanOrEqual(390);
});
