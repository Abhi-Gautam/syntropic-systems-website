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

    for (const route of ['/', '/writing/animesh/', '/writing/animesh-desktop/', '/writing/orchestration/']) {
      await page.goto(route);
      await expect(page.locator('main')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    }

    expect(consoleErrors).toEqual([]);
  });
}

test('homepage exposes the chronological article list', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Software systems, built and explained.');
  await expect(page.locator('.article-entry')).toHaveCount(4);
  await page.locator('.article-entry[href="/writing/animesh-desktop/"]').click();
  await expect(page).toHaveURL(/\/writing\/animesh-desktop\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Animesh now has a desktop app');
});

test('article metadata drives canonical, social card, and feed discovery', async ({ page, request }) => {
  const title = 'Temporal is working. Now define what your job means.';
  await page.goto('/writing/orchestration/');

  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://syntropicsystems.dev/writing/orchestration/',
  );
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    'content',
    `${title} — Syntropic Systems`,
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://syntropicsystems.dev/og/orchestration.png',
  );
  await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute(
    'href',
    'https://syntropicsystems.dev/rss.xml',
  );

  const feed = await request.get('/rss.xml');
  expect(feed.ok()).toBe(true);
  const feedText = await feed.text();
  expect(feedText).toContain(title);
  expect(feedText).toContain('/writing/orchestration/');
  expect(feedText).not.toContain('We rebuilt Temporal in Postgres. Here is how it failed.');

  const card = await request.get('/og/orchestration.png');
  expect(card.ok()).toBe(true);
  expect(card.headers()['content-type']).toContain('image/png');
  const png = await card.body();
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
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

for (const diagram of ['document-workflow', 'execution-contracts', 'artifact-publication', 'bounded-execution']) {
  test(`${diagram}: orchestration diagram geometry is collision-free`, async ({ page }) => {
    await page.goto(`/media/orchestration/${diagram}.svg`);

    const collisions = await page.locator('svg').evaluate((svg) => {
      const viewBox = svg.viewBox.baseVal;
      const texts = [...svg.querySelectorAll('text')].map((element) => ({
        label: element.textContent.trim(),
        box: element.getBBox(),
      }));
      const routes = [...svg.querySelectorAll(':scope > path, :scope > line')];
      const failures = [];

      for (const { label, box } of texts) {
        if (
          box.x < viewBox.x
          || box.y < viewBox.y
          || box.x + box.width > viewBox.x + viewBox.width
          || box.y + box.height > viewBox.y + viewBox.height
        ) failures.push(`${label}: outside viewBox`);

        for (const route of routes) {
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
}

test('execution-contract diagram preserves the Activity side-effect boundary', async ({ page }) => {
  await page.goto('/media/orchestration/execution-contracts.svg');

  await expect(page.locator('#product-to-workflow')).toHaveCount(1);
  await expect(page.locator('#workflow-to-activities')).toHaveCount(1);
  await expect(page.locator('#activity-to-database')).toHaveCount(1);
  await expect(page.locator('#activity-to-storage')).toHaveCount(1);
  await expect(page.getByText('Activities', { exact: true })).toBeVisible();
  await expect(page.getByText('side-effect boundary', { exact: true })).toBeVisible();

  await expect(page.locator('#workflow-to-database, #workflow-to-storage')).toHaveCount(0);
});

test('orchestration diagrams load before the reader scrolls to them', async ({ page }) => {
  await page.goto('/writing/orchestration/');
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  const images = page.locator('.media--diagram img');
  await expect(images).toHaveCount(2);
  for (let index = 0; index < 2; index += 1) {
    const image = images.nth(index);
    await expect(image).toHaveAttribute('loading', 'eager');
    await expect.poll(
      () => image.evaluate((element) => element.complete && element.naturalWidth > 0),
    ).toBe(true);
  }
});

for (const diagram of ['document-workflow', 'execution-contracts', 'artifact-publication', 'bounded-execution']) {
  test(`${diagram}: labels stay inside their component nodes`, async ({ page }) => {
    await page.goto(`/media/orchestration/${diagram}.svg`);

    const overflows = await page.locator('svg').evaluate((svg) => {
      const containers = [...svg.querySelectorAll('rect.box, rect.soft, rect.model, rect.contract, rect.run, rect.danger')]
        .map((element) => ({ element, box: element.getBBox() }));
      const failures = [];

      for (const text of svg.querySelectorAll('text')) {
        const textBox = text.getBBox();
        const center = {
          x: textBox.x + (textBox.width / 2),
          y: textBox.y + (textBox.height / 2),
        };
        const candidates = containers
          .filter(({ box }) => (
            center.x >= box.x
            && center.x <= box.x + box.width
            && center.y >= box.y
            && center.y <= box.y + box.height
          ))
          .sort((left, right) => (
            (left.box.width * left.box.height) - (right.box.width * right.box.height)
          ));

        if (candidates.length === 0) continue;
        const container = candidates[0].box;
        const contained = textBox.x >= container.x
          && textBox.y >= container.y
          && textBox.x + textBox.width <= container.x + container.width
          && textBox.y + textBox.height <= container.y + container.height;
        if (!contained) failures.push(text.textContent.trim());
      }

      return failures;
    });

    expect(overflows).toEqual([]);
  });
}

test('orchestration diagrams start at their left edge inside mobile scroll containers', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/writing/orchestration/');

  const scrollers = page.locator('.media--diagram .media__scroll');
  await expect(scrollers).toHaveCount(2);

  for (let index = 0; index < 2; index += 1) {
    const dimensions = await scrollers.nth(index).evaluate((element) => ({
      scrollLeft: element.scrollLeft,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      left: element.getBoundingClientRect().left,
      right: element.getBoundingClientRect().right,
    }));
    expect(dimensions.scrollLeft).toBe(0);
    expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);
    expect(dimensions.left).toBeGreaterThanOrEqual(0);
    expect(dimensions.right).toBeLessThanOrEqual(390);
  }
});
