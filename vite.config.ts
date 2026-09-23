import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import basicSsl from "@vitejs/plugin-basic-ssl";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      tailwindcss(),
      // HTTPS local: o SDK da Meta (FB.login) só funciona em páginas https
      basicSsl(),
      VitePWA({
        // ensures the new service worker takes over immediately on deploy,
        // instead of waiting for every open tab to be closed
        registerType: "autoUpdate",
        includeAssets: ["favicon.svg", "icons/apple-touch-icon.png"],
        // generates 'manifest.webmanifest' file on build
        manifest: {
          name: "ZapMonitor Whatsapp CRM",
          short_name: "ZapMonitor",
          start_url: "/auth/select_client",
          background_color: "#ffffff",
          theme_color: "#000000",
          icons: [
            {
              src: "/icons/icon-192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/icons/icon-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any",
            },
            {
              src: "/icons/icon-maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          // defining cached files formats
          globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      // Com o front em https, chamar a API em http://localhost vira cross-site e o navegador
      // deixa de enviar os cookies de autenticação. O proxy mantém tudo na mesma origem.
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY_TARGET || "http://localhost:4444",
          changeOrigin: true,
          ws: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
  };
});
