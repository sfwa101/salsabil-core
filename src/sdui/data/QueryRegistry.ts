import { z } from 'zod';

export interface RegisteredQuery<TParams = unknown, TResult = unknown> {
  id: string;
  paramSchema: z.ZodType<TParams>;
  resultSchema: z.ZodType<TResult>; // Used for strict hydration/validation
}

export class QueryRegistry {
  private queries = new Map<string, RegisteredQuery<unknown, unknown>>();

  register<TParams, TResult>(query: RegisteredQuery<TParams, TResult>) {
    this.queries.set(query.id, query as unknown as RegisteredQuery<unknown, unknown>);
  }

  getQuery(id: string): RegisteredQuery<unknown, unknown> | undefined {
    return this.queries.get(id);
  }

  has(id: string): boolean {
    return this.queries.has(id);
  }
}
