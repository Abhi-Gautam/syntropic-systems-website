import assert from 'node:assert/strict';
import test from 'node:test';
import { markdownToHtml } from 'satteri';

async function mediaPlugin() {
  try {
    return (await import('../src/plugins/satteri-media.mjs')).default;
  } catch (error) {
    assert.fail(`native Sätteri media plugin must exist: ${error.message}`);
  }
}

test('SVG Markdown images become readable-width diagram figures', async () => {
  const plugin = await mediaPlugin();
  const { html } = await markdownToHtml(
    '![Architecture](./architecture.svg "One owner, several surfaces.")',
    { hastPlugins: [plugin] },
  );

  assert.match(html, /<figure class="media media--diagram">/);
  assert.match(html, /<div class="media__scroll" tabindex="0" aria-label="Scrollable diagram">/);
  assert.match(html, /<img[^>]+class="media__asset"/);
  assert.match(html, /<figcaption>One owner, several surfaces\.<\/figcaption>/);
});

test('raster Markdown images become fluid figures without a scroll container', async () => {
  const plugin = await mediaPlugin();
  const { html } = await markdownToHtml(
    '![Menu bar](./menu.png "The menu bar surface.")',
    { hastPlugins: [plugin] },
  );

  assert.match(html, /<figure class="media media--image">/);
  assert.doesNotMatch(html, /media__scroll/);
  assert.match(html, /<figcaption>The menu bar surface\.<\/figcaption>/);
});

test('media without useful alt text fails during native Markdown rendering', async () => {
  const plugin = await mediaPlugin();

  assert.throws(
    () => markdownToHtml('![](./architecture.svg)', { hastPlugins: [plugin] }),
    /alt text/i,
  );
});
