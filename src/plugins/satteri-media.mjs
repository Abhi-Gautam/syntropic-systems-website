import { defineHastPlugin } from 'satteri';

function isDiagramSource(source) {
  const pathname = String(source ?? '').split(/[?#]/, 1)[0].toLowerCase();
  return pathname.endsWith('.svg');
}

function captionNode(caption) {
  if (!caption) return [];
  return [
    {
      type: 'element',
      tagName: 'figcaption',
      properties: {},
      children: [{ type: 'text', value: caption }],
    },
  ];
}

export default defineHastPlugin({
  name: 'syntropic-media',
  element: {
    filter: ['p'],
    visit(node) {
      if (node.children?.length !== 1) return;

      const sourceImage = node.children[0];
      if (sourceImage?.type !== 'element' || sourceImage.tagName !== 'img') return;

      const sourceProperties = sourceImage.properties ?? {};
      const alt = typeof sourceProperties.alt === 'string' ? sourceProperties.alt.trim() : '';
      if (!alt) {
        throw new Error(`Media requires useful alt text: ${sourceProperties.src ?? '<unknown source>'}`);
      }

      const diagram = isDiagramSource(sourceProperties.src);
      const caption = typeof sourceProperties.title === 'string' ? sourceProperties.title.trim() : '';
      const { title: _title, ...rest } = sourceProperties;
      const image = {
        type: 'element',
        tagName: 'img',
        properties: {
          ...rest,
          className: ['media__asset'],
          loading: diagram ? 'eager' : 'lazy',
          decoding: 'async',
        },
        children: [],
      };

      const media = diagram
        ? {
            type: 'element',
            tagName: 'div',
            properties: {
              className: ['media__scroll'],
              tabIndex: 0,
              ariaLabel: 'Scrollable diagram',
            },
            children: [image],
          }
        : image;

      return {
        type: 'element',
        tagName: 'figure',
        properties: {
          className: ['media', diagram ? 'media--diagram' : 'media--image'],
        },
        children: [media, ...captionNode(caption)],
      };
    },
  },
});
