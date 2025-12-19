export default (async function () {
  const { defineConfig } = await import("vitest/config");
  return defineConfig({
    test: {
      environment: "node",
      globals: true,
      include: ["./backend/**/*.test.ts"],
      coverage: {
        reporter: ["text", "html"],
      },
      setupFiles: ["backend/tests/setup/vitest.setup.ts"],
    },
  });
})();
