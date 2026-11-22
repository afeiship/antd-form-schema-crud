import type {
  CrudQueryPlugin,
  CrudQueryPluginDefinition,
} from './types';

/** Wraps an external or built-in plugin definition into a slot factory. */
export function defineQueryPlugin<
  TValues extends Record<string, any>,
  TConfig = void
>(
  definition: CrudQueryPluginDefinition<TValues, TConfig>
): CrudQueryPlugin<TValues, TConfig> {
  if (!definition || typeof definition.name !== 'string' || !definition.name.trim()) {
    throw new TypeError('[SchemaCrudList] query plugin name is required.');
  }
  if (typeof definition.create !== 'function') {
    throw new TypeError(
      `[SchemaCrudList] query plugin "${definition.name}" requires a create function.`
    );
  }

  return ((config: TConfig) =>
    definition.create(config)) as CrudQueryPlugin<TValues, TConfig>;
}
