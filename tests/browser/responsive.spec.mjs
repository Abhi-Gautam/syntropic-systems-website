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

test('architecture SVG text stays in bounds and clear of other text and routes', async ({ page }) => {
  await page.goto('/media/animesh/architecture.svg');

  const collisions = await page.locator('svg').evaluate((svg) => {
    const viewBox = svg.viewBox.baseVal;
    const texts = [...svg.querySelectorAll('text')].map((element) => ({
      label: element.textContent.trim(),
      box: element.getBBox(),
    }));
    const paths = [...svg.querySelectorAll(':scope > path')];
    const failures = [];

    for (const { label, box } of texts) {
      if (
        box.x < viewBox.x
        || box.y < viewBox.y
        || box.x + box.width > viewBox.x + viewBox.width
        || box.y + box.height > viewBox.y + viewBox.height
      ) {
        failures.push(`${label}: outside viewBox`);
      }

      for (const route of paths) {
        for (let x = box.x + 1; x < box.x + box.width; x += Math.max(2, box.width / 12)) {
          for (let y = box.y + 1; y < box.y + box.height; y += Math.max(2, box.height / 5)) {
            if (route.isPointInStroke(new DOMPoint(x, y))) {
              failures.push(`${label}: intersects route`);
              x = box.x + box.width;
              break;
            }
          }
        }
      }
    }

    for (let left = 0; left < texts.length; left += 1) {
      for (let right = left + 1; right < texts.length; right += 1) {
        const a = texts[left];
        const b = texts[right];
        const overlaps = a.box.x < b.box.x + b.box.width
          && a.box.x + a.box.width > b.box.x
          && a.box.y < b.box.y + b.box.height
          && a.box.y + a.box.height > b.box.y;
        if (overlaps) failures.push(`${a.label}: overlaps ${b.label}`);
      }
    }

    return [...new Set(failures)];
  });

  expect(collisions).toEqual([]);
});
