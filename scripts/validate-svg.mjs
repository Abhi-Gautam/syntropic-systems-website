import path from 'node:path';

export function validateAssetPath(assetPath) {
  const extension = path.extname(assetPath).toLowerCase();
  if (extension === '.d2' || extension === '.dot') {
    throw new Error(`${assetPath}: diagram source languages are not supported; commit the final static SVG.`);
  }
}

export function validateSvg(source, name = 'SVG') {
  const root = source.match(/<svg\b[^>]*>/i)?.[0];
  if (!root) throw new Error(`${name}: missing root SVG element.`);
  if (!/\sviewBox="[^"]+"/i.test(root)) {
    throw new Error(`${name}: root SVG requires a viewBox.`);
  }
  if (/\s(?:width|height)="[^"]*"/i.test(root)) {
    throw new Error(`${name}: root width or height is forbidden; the page owns responsive sizing.`);
  }

  const accessible = /\srole="img"/i.test(root)
    && /\saria-labelledby="[^"]+"/i.test(root)
    && /<title\b[^>]*>[^<]+<\/title>/i.test(source)
    && /<desc\b[^>]*>[^<]+<\/desc>/i.test(source);
  if (!accessible) {
    throw new Error(`${name}: SVG requires role="img", title, desc, and aria-labelledby semantics.`);
  }
}
