/// <reference types="node" />

import { defaultPlugins, defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  input:
    process.env.OPENAPI_INPUT ??
    "http://localhost:3003/swagger/v1/swagger.json",
  output: {
    path: "src/quantli/generated",
  },
  plugins: [
    {
      name: "@hey-api/client-fetch",
      //runtimeConfigPath: "../quantli/config.js",
    },
    ...defaultPlugins,
  ],
});
