import { SDUIPage, SDUIDataBinding, DataBindingSchema } from '../schema/page.schema';
import { DataSource } from './DataSource';
import { QueryRegistry } from './QueryRegistry';

export class DataResolver {
  private sources = new Map<string, DataSource>();

  constructor(private queryRegistry: QueryRegistry) {}

  registerSource(source: DataSource) {
    this.sources.set(source.id, source);
  }

  // A helper to traverse and resolve bindings recursively within props
  private async resolveProps(props: Record<string, unknown>, sourceId: string): Promise<Record<string, unknown>> {
    const resolvedProps: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(props)) {
      if (value && typeof value === 'object' && '$bind' in value) {
        const parseResult = DataBindingSchema.safeParse(value);
        if (!parseResult.success) {
          console.warn(`[DataResolver] Invalid binding format for key: ${key}`);
          resolvedProps[key] = null;
          continue;
        }

        const binding = parseResult.data;
        const query = this.queryRegistry.getQuery(binding.$bind);
        
        if (!query) {
          console.error(`[DataResolver] Unregistered query: ${binding.$bind}`);
          resolvedProps[key] = null; // Safe default, do not execute
          continue;
        }

        const validParams = query.paramSchema.safeParse(binding.params || {});
        if (!validParams.success) {
          console.error(`[DataResolver] Invalid params for query: ${binding.$bind}`, validParams.error);
          resolvedProps[key] = null;
          continue;
        }

        const source = Array.from(this.sources.values())[0]; // For now, we use the first registered source. In a multi-source env, the registry would map queries to sources.
        if (!source) {
          console.error(`[DataResolver] No data source registered to handle query: ${binding.$bind}`);
          resolvedProps[key] = null;
          continue;
        }

        try {
          const rawResult = await source.resolve(binding.$bind, validParams.data);
          const validResult = query.resultSchema.safeParse(rawResult);
          
          if (!validResult.success) {
            console.error(`[DataResolver] Data from source failed validation for query: ${binding.$bind}`);
            resolvedProps[key] = null;
          } else {
            resolvedProps[key] = validResult.data;
          }
        } catch (err) {
          console.error(`[DataResolver] Error resolving query: ${binding.$bind}`, err);
          resolvedProps[key] = null;
        }
      } else {
        // Leave static props as is
        resolvedProps[key] = value;
      }
    }

    console.log(`[DataResolver] Resolved props for source ${sourceId}:`, resolvedProps);
    return resolvedProps;
  }

  async resolvePage(page: SDUIPage): Promise<SDUIPage> {
    const resolvedSections = await Promise.all(
      page.sections.map(async (section) => {
        const resolvedProps = await this.resolveProps(section.props, 'default');
        return {
          ...section,
          props: resolvedProps
        };
      })
    );

    return {
      ...page,
      sections: resolvedSections
    };
  }
}
