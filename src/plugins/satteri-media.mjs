import { defineHastPlugin } from 'satteri';

function isDiagramSource(source) {
  const pathname = String(source ?? '').split(/[?#]/, 1)[0].toLowerCase();
  return pathname.endsWith('.svg');
}

function isVideoSource(source) {
  const pathname = String(source ?? '').split(/[?#]/, 1)[0].toLowerCase();
  return pathname.endsWith('.mp4') || pathname.endsWith('.webm');
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

      // A video is written like an image. It plays muted and loops, with
      // controls, and never autoplays sound. The alt text labels it. Its
      // poster is the .jpg beside it with the same name (floor.mp4 ->
      // floor.jpg), so the page shows a frame instead of an empty box.
      if (isVideoSource(sourceProperties.src)) {
        return {
          type: 'element',
          tagName: 'figure',
          properties: { className: ['media', 'media--image'] },
          children: [
            {
              type: 'element',
              tagName: 'video',
              properties: {
                src: sourceProperties.src,
                poster: String(sourceProperties.src).replace(/\.(mp4|webm)(?=$|[?#])/i, '.jpg'),
                ariaLabel: alt,
                className: ['media__asset'],
                controls: true,
                muted: true,
                loop: true,
                playsInline: true,
                preload: 'metadata',
              },
              children: [],
            },
            ...captionNode(caption),
          ],
        };
      }

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
