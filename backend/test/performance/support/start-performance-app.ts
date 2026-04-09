import { createIntegrationApp } from '../../integration/support/test-app';

async function main() {
  const port = Number(process.env.PERFORMANCE_PORT ?? '3180');
  const host = process.env.PERFORMANCE_HOST ?? '127.0.0.1';
  const { app } = await createIntegrationApp();

  await app.listen(port, host);

  console.log(
    `Performance test app is listening on http://${host}:${port}/api`,
  );
}

void main().catch((error) => {
  console.error('Failed to start performance app:', error);
  process.exit(1);
});
