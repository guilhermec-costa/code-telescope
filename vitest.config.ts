export default (async function () {
  const { defineConfig } = await import("vitest/config");

  return defineConfig({
    test: {
      globals: true,
      coverage: {
        provider: "v8",
        reporter: ["text", "html"],
        reportsDirectory: "./coverage",
      },

      projects: [
        {
          test: {
            name: "backend",
            environment: "node",
            include: ["backend/**/*.test.ts"],
            setupFiles: ["backend/tests/setup/vitest.setup.ts"],
          },
          resolve: {
            alias: {
              "@backend": "/backend",
              "@shared": "/shared",
            },
          },
        },
        {
          test: {
            name: "ui",
            environment: "jsdom",
            include: ["ui/**/*.test.ts"],
          },
          resolve: {
            alias: {
              "@ui": "/ui",
              "@shared": "/shared",
            },
          },
        },
      ],
    },
  });
})();
