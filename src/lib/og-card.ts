import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';

const WIDTH = 1200;
const HEIGHT = 630;

/*
 * Resolved from the project root, not import.meta.url: this module is bundled
 * into dist/.prerender/ before it runs, so a source-relative URL no longer
 * points at the font. Cards are generated at build time only.
 */
const font = (weight: 400 | 700) =>
  readFileSync(path.join(process.cwd(), 'src/assets/og', `jetbrains-mono-${weight}.ttf`));

const FONTS = [
  { name: 'JetBrains Mono', data: font(400), weight: 400 as const, style: 'normal' as const },
  { name: 'JetBrains Mono', data: font(700), weight: 700 as const, style: 'normal' as const },
];

export interface CardInput {
  title: string;
  meta?: string;
}

/*
 * The card mirrors the site: black on white, monospace, one hairline rule, no
 * decoration. Satori supports a flexbox subset, so every container that holds
 * more than one child declares display: flex explicitly.
 */
function card({ title, meta }: CardInput) {
  // Long titles step down a size rather than overflowing the safe area.
  const titleSize = title.length > 62 ? 52 : title.length > 40 ? 62 : 72;

  return {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: '#ffffff',
        color: '#111111',
        fontFamily: 'JetBrains Mono',
        padding: '72px',
      },
      children: [
        {
          type: 'div',
          props: {
            style: { display: 'flex', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' },
            children: 'syntropic systems',
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: titleSize,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
              maxWidth: '960px',
            },
            children: title,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              justifyContent: 'space-between',
              borderTop: '1px solid #dedede',
              paddingTop: '24px',
              fontSize: 22,
              color: '#666666',
            },
            children: [
              { type: 'div', props: { style: { display: 'flex' }, children: meta ?? '' } },
              { type: 'div', props: { style: { display: 'flex' }, children: 'syntropicsystems.dev' } },
            ],
          },
        },
      ],
    },
  };
}

// ArrayBuffer rather than Buffer or Uint8Array: @types/node and lib.dom each
// declare a global Response, and ArrayBuffer is valid BodyInit under both, so
// the route needs no cast to hand this straight to a Response.
export async function renderCard(input: CardInput): Promise<ArrayBuffer> {
  const svg = await satori(card(input) as never, {
    width: WIDTH,
    height: HEIGHT,
    fonts: FONTS,
  });

  const png = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } }).render().asPng();
  return png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer;
}
