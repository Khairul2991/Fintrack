import { registerHooks } from 'node:module'

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
      try {
        return nextResolve(specifier, context)
      } catch (error) {
        if (error && error.code === 'ERR_MODULE_NOT_FOUND') {
          return nextResolve(`${specifier}.js`, context)
        }
        throw error
      }
    }
    return nextResolve(specifier, context)
  },
})