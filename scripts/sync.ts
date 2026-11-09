import { bootstrap } from '../src/app/bootstrap';

function arg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = process.argv.find((value) => value.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  if (index >= 0) return process.argv[index + 1];
  return undefined;
}

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function main(): Promise<void> {
  const workspaceRoot = process.cwd();
  const container = await bootstrap({ workspaceRoot, version: '0.1.0' });

  const singleProject = arg('project');
  if (singleProject) {
    console.log(`→ Sincronizando detalles del expediente ${singleProject}…`);
    const result = await container.syncProjectDetails.execute(singleProject, (progress) => {
      console.log(`  [${progress.phase}] ${progress.message}`);
    });
    console.log(result);
    return;
  }

  const region = arg('region') ?? container.config.seia.defaultRegionIds[0] ?? '5';
  const sector = arg('sector') ?? container.config.seia.defaultSectorIds[0] ?? '7';
  const status = arg('status') ?? container.config.seia.defaultStatusIds[0] ?? '3';
  const limit = Number(arg('limit') ?? 50);

  console.log(
    `→ Sincronizando SEIA (región ${region}, sector ${sector}, estado ${status}, límite ${limit})…`,
  );

  const result = await container.syncProjects.execute(
    {
      regionIds: [region],
      sectorIds: [sector],
      statusIds: [status],
      limit,
      offset: 1,
      orderColumn: 'FECHA_PRESENTACION',
      orderDir: 'desc',
    },
    (progress) => {
      console.log(`  [${progress.phase}] ${progress.message}`);
    },
  );

  console.log(result);

  if (flag('details')) {
    const projects = await container.projects.list({ limit: 50 });
    for (const project of projects) {
      console.log(`→ Detalles de ${project.id} · ${project.name}`);
      try {
        const details = await container.syncProjectDetails.execute(project.id, (progress) => {
          if (progress.current && progress.total) {
            process.stdout.write(`\r  ${progress.current}/${progress.total} ${progress.message.slice(0, 90)}`);
          }
        });
        process.stdout.write('\n');
        console.log(details);
      } catch (error) {
        console.error(`  Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
