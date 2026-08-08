import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Unit tests for the pure logic only.
//
// Deliberately not browser or end-to-end tests. Every bug this project has actually shipped
// lived in a pure function: a funnel that double counted, a refund that computed negative, a
// fee rate that disagreed between client and server, a query whose error was read as "no
// results". None of those needed a browser to catch, and all of them reached production.
//
// What a browser test would add here is coverage of the parts a human checks anyway (did the
// email arrive, did Stripe redirect) at a maintenance cost an organisation running three
// camps a year should not carry.

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Tests sit beside the code they cover. A separate tree makes it easy to move a file and
    // silently orphan its tests.
    passWithNoTests: false,
  },
});
