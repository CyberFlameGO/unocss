import type { Plugin } from 'vite'
import type { UnocssPluginContext } from '@unocss/core'
import MagicString from 'magic-string'
import { IGNORE_COMMENT } from './integration'

export function initTransformerPlugins(ctx: UnocssPluginContext): Plugin[] {
  async function applyTransformers(code: string, id: string, enforce?: 'pre' | 'post') {
    if (code.includes(IGNORE_COMMENT))
      return
    const transformers = (ctx.uno.config.transformers || []).filter(i => i.enforce === enforce)
    if (!transformers.length)
      return

    const s = new MagicString(code)
    for (const t of transformers) {
      if (t.idFilter) {
        if (!t.idFilter(id))
          continue
      }
      else if (!ctx.filter(code, id)) {
        continue
      }
      await t.transform(s, id, ctx)
    }

    if (s.hasChanged()) {
      return {
        code: s.toString(),
        map: s.generateMap({ hires: true, source: id }),
      }
    }
  }

  return [
    {
      name: 'unocss:transformers:default',
      transform(code, id) {
        return applyTransformers(code, id)
      },
      transformIndexHtml(code) {
        return applyTransformers(code, 'index.html')
          .then(t => t?.code)
      },
    },
    {
      name: 'unocss:transformers:pre',
      enforce: 'pre',
      transform(code, id) {
        return applyTransformers(code, id, 'pre')
      },
      transformIndexHtml(code) {
        return applyTransformers(code, 'index.html', 'pre')
          .then(t => t?.code)
      },
    },
    {
      name: 'unocss:transformers:post',
      enforce: 'post',
      transform(code, id) {
        return applyTransformers(code, id, 'post')
      },
      transformIndexHtml(code) {
        applyTransformers(code, 'index.html', 'post')
          .then(t => t?.code)
      },
    },
  ]
}
