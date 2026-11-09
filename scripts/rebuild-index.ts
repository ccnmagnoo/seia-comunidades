import { bootstrap } from '../src/app/bootstrap';

async function main(): Promise<void> {
  const container = await bootstrap({ workspaceRoot: process.cwd(), version: '0.1.0' });
  const index = await container.projects.rebuildIndex();
  await container.search.rebuild();
  console.log(`✓ Índice reconstruido con ${index.projects.length} proyectos.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
