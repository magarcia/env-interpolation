import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ["esm", "cjs"],
  target: "node18",
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  minify: false,
  keepNames: true,
});
