import dts from "bun-plugin-dts";

(async () => {
  const result = await Bun.build({
    entrypoints: ["./src/index.ts"],
    outdir: "./dist",
    plugins: [dts()],
  });

  console.log(result);
})();
