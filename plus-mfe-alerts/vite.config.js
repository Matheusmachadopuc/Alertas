import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import federation from "@originjs/vite-plugin-federation";

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: "mfe_alerts",
      filename: "remoteEntry.js",
      exposes: {
        "./AlertsPage": "./src/pages/AlertsPage",
      },
      shared: ["react", "react-dom"],
    }),
  ],
  build: {
    target: "esnext",
    minify: false,
  },
  server: {
    port: 4002,
    host: true,
    allowedHosts: true,
  },
  preview: {
    port: 4002,
    host: true,
    allowedHosts: true,
  },
});
