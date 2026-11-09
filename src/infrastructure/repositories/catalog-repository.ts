import { join } from 'node:path';
import type { Catalog } from '../../domain/common/catalog';
import type { WorkspacePaths } from '../../app/config';
import { nowIso, TomlStore } from './toml-store';
import { CatalogTomlSchema, fromCatalogToml, toCatalogToml } from './toml-mappers';

export const EMPTY_CATALOG: Catalog = {
  schemaVersion: 1,
  updatedAt: new Date(0).toISOString(),
  regions: [],
  communes: [],
  sectors: [],
  statuses: [],
  reasons: [],
  expedienteTypes: [],
};

export class CatalogRepository {
  constructor(
    private readonly paths: WorkspacePaths,
    private readonly store: TomlStore,
  ) {}

  private catalogPath(): string {
    return join(this.paths.catalogs, 'catalogs.toml');
  }

  async get(): Promise<Catalog> {
    const toml = await this.store.read(this.catalogPath(), CatalogTomlSchema);
    return toml ? fromCatalogToml(toml) : EMPTY_CATALOG;
  }

  async save(catalog: Catalog): Promise<Catalog> {
    const next: Catalog = { ...catalog, updatedAt: nowIso() };
    await this.store.write(this.catalogPath(), CatalogTomlSchema, toCatalogToml(next));
    return next;
  }
}
