export interface DataSource {
  id: string;
  resolve(queryId: string, params: unknown): Promise<unknown>;
}
