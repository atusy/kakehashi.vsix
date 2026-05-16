const esbuild = require("esbuild");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

const ctx = {
  entryPoints: ["src/extension.ts"],
  bundle: true,
  format: "cjs",
  platform: "node",
  target: "node18",
  external: ["vscode"],
  outfile: "dist/extension.js",
  sourcemap: !production,
  minify: production,
  logLevel: "info",
};

async function main() {
  if (watch) {
    const context = await esbuild.context(ctx);
    await context.watch();
  } else {
    await esbuild.build(ctx);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
