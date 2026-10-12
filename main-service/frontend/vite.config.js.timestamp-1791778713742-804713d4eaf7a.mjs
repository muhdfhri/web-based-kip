// vite.config.js
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "file:///D:/PT%20PREMIER/Mewah%20Group/PT%20KIP/PC%20Server/PROGRAM/mewah-kip/main-service/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///D:/PT%20PREMIER/Mewah%20Group/PT%20KIP/PC%20Server/PROGRAM/mewah-kip/main-service/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
var __vite_injected_original_import_meta_url = "file:///D:/PT%20PREMIER/Mewah%20Group/PT%20KIP/PC%20Server/PROGRAM/mewah-kip/main-service/frontend/vite.config.js";
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@core": fileURLToPath(new URL("./src/core", __vite_injected_original_import_meta_url)),
      "@overview": fileURLToPath(new URL("./src/overview", __vite_injected_original_import_meta_url)),
      "@pages": fileURLToPath(new URL("./src/core/pages", __vite_injected_original_import_meta_url)),
      "@stations/security": fileURLToPath(
        new URL("../../stations/security/frontend", __vite_injected_original_import_meta_url)
      ),
      "@stations/weighbridge": fileURLToPath(
        new URL("../../stations/weighbridge/frontend/src", __vite_injected_original_import_meta_url)
      ),
      "@stations/grading-ramp": fileURLToPath(
        new URL("../../stations/grading-ramp/frontend/src", __vite_injected_original_import_meta_url)
      ),
      "@stations/loading-ramp": fileURLToPath(
        new URL("../../stations/loading-ramp/frontend/src", __vite_injected_original_import_meta_url)
      ),
      "@stations/sterilizer-station": fileURLToPath(
        new URL("../../stations/sterilizer/frontend", __vite_injected_original_import_meta_url)
      ),
      "@stations/threshing-station": fileURLToPath(
        new URL("../../stations/threshing/frontend", __vite_injected_original_import_meta_url)
      ),
      "@stations/efb-plant": fileURLToPath(
        new URL("../../stations/efb-plant/frontend", __vite_injected_original_import_meta_url)
      ),
      "@stations/press-station": fileURLToPath(
        new URL("../../stations/press/frontend", __vite_injected_original_import_meta_url)
      ),
      "@stations/kernel-plant": fileURLToPath(
        new URL("../../stations/kernel-plant/frontend", __vite_injected_original_import_meta_url)
      ),
      "@stations/oil-clarification": fileURLToPath(
        new URL("../../stations/oil-clarification/frontend", __vite_injected_original_import_meta_url)
      ),
      "@stations/boiler-house": fileURLToPath(
        new URL("../../stations/boiler-house/frontend/src", __vite_injected_original_import_meta_url)
      ),
      "@stations/engine-room": fileURLToPath(
        new URL("../../stations/engine-room/frontend/src", __vite_injected_original_import_meta_url)
      ),
      "@stations/raw-water": fileURLToPath(
        new URL(
          "../../stations/raw-water-treatment/frontend/src",
          __vite_injected_original_import_meta_url
        )
      ),
      "@stations/daf-osr": fileURLToPath(
        new URL("../../stations/daf-osr/frontend/src", __vite_injected_original_import_meta_url)
      ),
      "@stations/cmrs": fileURLToPath(
        new URL("../../stations/cmrs/frontend/src", __vite_injected_original_import_meta_url)
      ),
      "@stations/effluent-treatment": fileURLToPath(
        new URL(
          "../../stations/effluent-treatment/frontend/src",
          __vite_injected_original_import_meta_url
        )
      ),
      "@stations": fileURLToPath(new URL("./src/stations", __vite_injected_original_import_meta_url)),
      "@reports": fileURLToPath(
        new URL("./src/reports-logsheet", __vite_injected_original_import_meta_url)
      ),
      "@alarm": fileURLToPath(
        new URL("../../alarm/frontend/src", __vite_injected_original_import_meta_url)
      ),
      "@maintenance": fileURLToPath(
        new URL("../../maintenance/frontend/src", __vite_injected_original_import_meta_url)
      ),
      "@setting": fileURLToPath(new URL("./src/setting", __vite_injected_original_import_meta_url)),
      "@contact": fileURLToPath(
        new URL("../../contacts/frontend/src", __vite_injected_original_import_meta_url)
      ),
      "@home": fileURLToPath(new URL("./src/home", __vite_injected_original_import_meta_url)),
      react: fileURLToPath(new URL("./node_modules/react", __vite_injected_original_import_meta_url)),
      "react-dom": fileURLToPath(
        new URL("./node_modules/react-dom", __vite_injected_original_import_meta_url)
      ),
      "socket.io-client": fileURLToPath(
        new URL("./node_modules/socket.io-client", __vite_injected_original_import_meta_url)
      ),
      "react-icons": fileURLToPath(
        new URL("./node_modules/react-icons", __vite_injected_original_import_meta_url)
      ),
      "qrcode.react": fileURLToPath(
        new URL("./node_modules/qrcode.react", __vite_injected_original_import_meta_url)
      ),
      "html-to-image": fileURLToPath(
        new URL("./node_modules/html-to-image", __vite_injected_original_import_meta_url)
      ),
      "xlsx": fileURLToPath(
        new URL("./node_modules/xlsx", __vite_injected_original_import_meta_url)
      ),
      "xlsx-js-style": fileURLToPath(
        new URL("./node_modules/xlsx-js-style", __vite_injected_original_import_meta_url)
      ),
      "leaflet": fileURLToPath(
        new URL("./node_modules/leaflet", __vite_injected_original_import_meta_url)
      ),
      "react-leaflet": fileURLToPath(
        new URL("./node_modules/react-leaflet", __vite_injected_original_import_meta_url)
      ),
      "leaflet-rotate": fileURLToPath(
        new URL("./node_modules/leaflet-rotate", __vite_injected_original_import_meta_url)
      )
    }
  },
  assetsInclude: ["**/*.glb", "**/*.gltf"],
  server: {
    allowedHosts: true,
    host: "0.0.0.0",
    fs: {
      allow: ["../.."]
    },
    port: 5173,
    proxy: {
      "/auth": "http://localhost:3009",
      "/api/admin": "http://localhost:3009",
      "/api/activity": "http://localhost:3009",
      "/api/config": "http://localhost:3009",
      "/socket.io": { target: "http://localhost:3002", ws: true },
      "/api/station": "http://localhost:3003",
      "/api/settings": "http://localhost:3003",
      "/api/logsheet": "http://localhost:3003",
      "/api/maintenance": "http://localhost:3200",
      "/api/logsheet-form": "http://localhost:3005",
      "/api/grading": "http://localhost:3006",
      "/api/reports": "http://localhost:3007",
      "/api/security": "http://localhost:3101",
      "/uploads": "http://localhost:3101",
      "/api/weighbridge": "http://localhost:3102",
      "/api/grading-ramp": "http://localhost:3103",
      "/api/loading-ramp": "http://localhost:3104",
      "/api/sterilizer": "http://localhost:3105",
      "/api/threshing": "http://localhost:3106",
      "/api/efb-plant": "http://localhost:3107",
      "/api/press": "http://localhost:3108",
      "/api/kernel-plant": "http://localhost:3109",
      "/api/oil-clarification": "http://localhost:3110",
      "/api/boiler-house": "http://localhost:3111",
      "/api/engine-room": "http://localhost:3112",
      "/api/raw-water-treatment": "http://localhost:3113",
      "/api/daf-osr": "http://localhost:3114",
      "/api/cmrs": "http://localhost:3115",
      "/api/effluent-treatment": "http://localhost:3116",
      "/api/alarm": "http://localhost:3300",
      "/api/contacts": "http://localhost:3400"
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxQVCBQUkVNSUVSXFxcXE1ld2FoIEdyb3VwXFxcXFBUIEtJUFxcXFxQQyBTZXJ2ZXJcXFxcUFJPR1JBTVxcXFxtZXdhaC1raXBcXFxcbWFpbi1zZXJ2aWNlXFxcXGZyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxQVCBQUkVNSUVSXFxcXE1ld2FoIEdyb3VwXFxcXFBUIEtJUFxcXFxQQyBTZXJ2ZXJcXFxcUFJPR1JBTVxcXFxtZXdhaC1raXBcXFxcbWFpbi1zZXJ2aWNlXFxcXGZyb250ZW5kXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9QVCUyMFBSRU1JRVIvTWV3YWglMjBHcm91cC9QVCUyMEtJUC9QQyUyMFNlcnZlci9QUk9HUkFNL21ld2FoLWtpcC9tYWluLXNlcnZpY2UvZnJvbnRlbmQvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBmaWxlVVJMVG9QYXRoLCBVUkwgfSBmcm9tIFwibm9kZTp1cmxcIjtcclxuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbcmVhY3QoKV0sXHJcbiAgcmVzb2x2ZToge1xyXG4gICAgYWxpYXM6IHtcclxuICAgICAgXCJAY29yZVwiOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoXCIuL3NyYy9jb3JlXCIsIGltcG9ydC5tZXRhLnVybCkpLFxyXG4gICAgICBcIkBvdmVydmlld1wiOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoXCIuL3NyYy9vdmVydmlld1wiLCBpbXBvcnQubWV0YS51cmwpKSxcclxuICAgICAgXCJAcGFnZXNcIjogZmlsZVVSTFRvUGF0aChuZXcgVVJMKFwiLi9zcmMvY29yZS9wYWdlc1wiLCBpbXBvcnQubWV0YS51cmwpKSxcclxuICAgICAgXCJAc3RhdGlvbnMvc2VjdXJpdHlcIjogZmlsZVVSTFRvUGF0aChcclxuICAgICAgICBuZXcgVVJMKFwiLi4vLi4vc3RhdGlvbnMvc2VjdXJpdHkvZnJvbnRlbmRcIiwgaW1wb3J0Lm1ldGEudXJsKSxcclxuICAgICAgKSxcclxuICAgICAgXCJAc3RhdGlvbnMvd2VpZ2hicmlkZ2VcIjogZmlsZVVSTFRvUGF0aChcclxuICAgICAgICBuZXcgVVJMKFwiLi4vLi4vc3RhdGlvbnMvd2VpZ2hicmlkZ2UvZnJvbnRlbmQvc3JjXCIsIGltcG9ydC5tZXRhLnVybCksXHJcbiAgICAgICksXHJcbiAgICAgIFwiQHN0YXRpb25zL2dyYWRpbmctcmFtcFwiOiBmaWxlVVJMVG9QYXRoKFxyXG4gICAgICAgIG5ldyBVUkwoXCIuLi8uLi9zdGF0aW9ucy9ncmFkaW5nLXJhbXAvZnJvbnRlbmQvc3JjXCIsIGltcG9ydC5tZXRhLnVybCksXHJcbiAgICAgICksXHJcbiAgICAgIFwiQHN0YXRpb25zL2xvYWRpbmctcmFtcFwiOiBmaWxlVVJMVG9QYXRoKFxyXG4gICAgICAgIG5ldyBVUkwoXCIuLi8uLi9zdGF0aW9ucy9sb2FkaW5nLXJhbXAvZnJvbnRlbmQvc3JjXCIsIGltcG9ydC5tZXRhLnVybCksXHJcbiAgICAgICksXHJcbiAgICAgIFwiQHN0YXRpb25zL3N0ZXJpbGl6ZXItc3RhdGlvblwiOiBmaWxlVVJMVG9QYXRoKFxyXG4gICAgICAgIG5ldyBVUkwoXCIuLi8uLi9zdGF0aW9ucy9zdGVyaWxpemVyL2Zyb250ZW5kXCIsIGltcG9ydC5tZXRhLnVybCksXHJcbiAgICAgICksXHJcbiAgICAgIFwiQHN0YXRpb25zL3RocmVzaGluZy1zdGF0aW9uXCI6IGZpbGVVUkxUb1BhdGgoXHJcbiAgICAgICAgbmV3IFVSTChcIi4uLy4uL3N0YXRpb25zL3RocmVzaGluZy9mcm9udGVuZFwiLCBpbXBvcnQubWV0YS51cmwpLFxyXG4gICAgICApLFxyXG4gICAgICBcIkBzdGF0aW9ucy9lZmItcGxhbnRcIjogZmlsZVVSTFRvUGF0aChcclxuICAgICAgICBuZXcgVVJMKFwiLi4vLi4vc3RhdGlvbnMvZWZiLXBsYW50L2Zyb250ZW5kXCIsIGltcG9ydC5tZXRhLnVybCksXHJcbiAgICAgICksXHJcbiAgICAgIFwiQHN0YXRpb25zL3ByZXNzLXN0YXRpb25cIjogZmlsZVVSTFRvUGF0aChcclxuICAgICAgICBuZXcgVVJMKFwiLi4vLi4vc3RhdGlvbnMvcHJlc3MvZnJvbnRlbmRcIiwgaW1wb3J0Lm1ldGEudXJsKSxcclxuICAgICAgKSxcclxuICAgICAgXCJAc3RhdGlvbnMva2VybmVsLXBsYW50XCI6IGZpbGVVUkxUb1BhdGgoXHJcbiAgICAgICAgbmV3IFVSTChcIi4uLy4uL3N0YXRpb25zL2tlcm5lbC1wbGFudC9mcm9udGVuZFwiLCBpbXBvcnQubWV0YS51cmwpLFxyXG4gICAgICApLFxyXG4gICAgICBcIkBzdGF0aW9ucy9vaWwtY2xhcmlmaWNhdGlvblwiOiBmaWxlVVJMVG9QYXRoKFxyXG4gICAgICAgIG5ldyBVUkwoXCIuLi8uLi9zdGF0aW9ucy9vaWwtY2xhcmlmaWNhdGlvbi9mcm9udGVuZFwiLCBpbXBvcnQubWV0YS51cmwpLFxyXG4gICAgICApLFxyXG4gICAgICBcIkBzdGF0aW9ucy9ib2lsZXItaG91c2VcIjogZmlsZVVSTFRvUGF0aChcclxuICAgICAgICBuZXcgVVJMKFwiLi4vLi4vc3RhdGlvbnMvYm9pbGVyLWhvdXNlL2Zyb250ZW5kL3NyY1wiLCBpbXBvcnQubWV0YS51cmwpLFxyXG4gICAgICApLFxyXG4gICAgICBcIkBzdGF0aW9ucy9lbmdpbmUtcm9vbVwiOiBmaWxlVVJMVG9QYXRoKFxyXG4gICAgICAgIG5ldyBVUkwoXCIuLi8uLi9zdGF0aW9ucy9lbmdpbmUtcm9vbS9mcm9udGVuZC9zcmNcIiwgaW1wb3J0Lm1ldGEudXJsKSxcclxuICAgICAgKSxcclxuICAgICAgXCJAc3RhdGlvbnMvcmF3LXdhdGVyXCI6IGZpbGVVUkxUb1BhdGgoXHJcbiAgICAgICAgbmV3IFVSTChcclxuICAgICAgICAgIFwiLi4vLi4vc3RhdGlvbnMvcmF3LXdhdGVyLXRyZWF0bWVudC9mcm9udGVuZC9zcmNcIixcclxuICAgICAgICAgIGltcG9ydC5tZXRhLnVybCxcclxuICAgICAgICApLFxyXG4gICAgICApLFxyXG4gICAgICBcIkBzdGF0aW9ucy9kYWYtb3NyXCI6IGZpbGVVUkxUb1BhdGgoXHJcbiAgICAgICAgbmV3IFVSTChcIi4uLy4uL3N0YXRpb25zL2RhZi1vc3IvZnJvbnRlbmQvc3JjXCIsIGltcG9ydC5tZXRhLnVybCksXHJcbiAgICAgICksXHJcbiAgICAgIFwiQHN0YXRpb25zL2NtcnNcIjogZmlsZVVSTFRvUGF0aChcclxuICAgICAgICBuZXcgVVJMKFwiLi4vLi4vc3RhdGlvbnMvY21ycy9mcm9udGVuZC9zcmNcIiwgaW1wb3J0Lm1ldGEudXJsKSxcclxuICAgICAgKSxcclxuICAgICAgXCJAc3RhdGlvbnMvZWZmbHVlbnQtdHJlYXRtZW50XCI6IGZpbGVVUkxUb1BhdGgoXHJcbiAgICAgICAgbmV3IFVSTChcclxuICAgICAgICAgIFwiLi4vLi4vc3RhdGlvbnMvZWZmbHVlbnQtdHJlYXRtZW50L2Zyb250ZW5kL3NyY1wiLFxyXG4gICAgICAgICAgaW1wb3J0Lm1ldGEudXJsLFxyXG4gICAgICAgICksXHJcbiAgICAgICksXHJcbiAgICAgIFwiQHN0YXRpb25zXCI6IGZpbGVVUkxUb1BhdGgobmV3IFVSTChcIi4vc3JjL3N0YXRpb25zXCIsIGltcG9ydC5tZXRhLnVybCkpLFxyXG4gICAgICBcIkByZXBvcnRzXCI6IGZpbGVVUkxUb1BhdGgoXHJcbiAgICAgICAgbmV3IFVSTChcIi4vc3JjL3JlcG9ydHMtbG9nc2hlZXRcIiwgaW1wb3J0Lm1ldGEudXJsKSxcclxuICAgICAgKSxcclxuICAgICAgXCJAYWxhcm1cIjogZmlsZVVSTFRvUGF0aChcclxuICAgICAgICBuZXcgVVJMKFwiLi4vLi4vYWxhcm0vZnJvbnRlbmQvc3JjXCIsIGltcG9ydC5tZXRhLnVybCksXHJcbiAgICAgICksXHJcbiAgICAgIFwiQG1haW50ZW5hbmNlXCI6IGZpbGVVUkxUb1BhdGgoXHJcbiAgICAgICAgbmV3IFVSTChcIi4uLy4uL21haW50ZW5hbmNlL2Zyb250ZW5kL3NyY1wiLCBpbXBvcnQubWV0YS51cmwpLFxyXG4gICAgICApLFxyXG4gICAgICBcIkBzZXR0aW5nXCI6IGZpbGVVUkxUb1BhdGgobmV3IFVSTChcIi4vc3JjL3NldHRpbmdcIiwgaW1wb3J0Lm1ldGEudXJsKSksXHJcbiAgICAgIFwiQGNvbnRhY3RcIjogZmlsZVVSTFRvUGF0aChcclxuICAgICAgICBuZXcgVVJMKFwiLi4vLi4vY29udGFjdHMvZnJvbnRlbmQvc3JjXCIsIGltcG9ydC5tZXRhLnVybCksXHJcbiAgICAgICksXHJcbiAgICAgIFwiQGhvbWVcIjogZmlsZVVSTFRvUGF0aChuZXcgVVJMKFwiLi9zcmMvaG9tZVwiLCBpbXBvcnQubWV0YS51cmwpKSxcclxuICAgICAgcmVhY3Q6IGZpbGVVUkxUb1BhdGgobmV3IFVSTChcIi4vbm9kZV9tb2R1bGVzL3JlYWN0XCIsIGltcG9ydC5tZXRhLnVybCkpLFxyXG4gICAgICBcInJlYWN0LWRvbVwiOiBmaWxlVVJMVG9QYXRoKFxyXG4gICAgICAgIG5ldyBVUkwoXCIuL25vZGVfbW9kdWxlcy9yZWFjdC1kb21cIiwgaW1wb3J0Lm1ldGEudXJsKSxcclxuICAgICAgKSxcclxuICAgICAgXCJzb2NrZXQuaW8tY2xpZW50XCI6IGZpbGVVUkxUb1BhdGgoXHJcbiAgICAgICAgbmV3IFVSTChcIi4vbm9kZV9tb2R1bGVzL3NvY2tldC5pby1jbGllbnRcIiwgaW1wb3J0Lm1ldGEudXJsKSxcclxuICAgICAgKSxcclxuICAgICAgXCJyZWFjdC1pY29uc1wiOiBmaWxlVVJMVG9QYXRoKFxyXG4gICAgICAgIG5ldyBVUkwoXCIuL25vZGVfbW9kdWxlcy9yZWFjdC1pY29uc1wiLCBpbXBvcnQubWV0YS51cmwpLFxyXG4gICAgICApLFxyXG4gICAgICBcInFyY29kZS5yZWFjdFwiOiBmaWxlVVJMVG9QYXRoKFxyXG4gICAgICAgIG5ldyBVUkwoXCIuL25vZGVfbW9kdWxlcy9xcmNvZGUucmVhY3RcIiwgaW1wb3J0Lm1ldGEudXJsKSxcclxuICAgICAgKSxcclxuICAgICAgXCJodG1sLXRvLWltYWdlXCI6IGZpbGVVUkxUb1BhdGgoXHJcbiAgICAgICAgbmV3IFVSTChcIi4vbm9kZV9tb2R1bGVzL2h0bWwtdG8taW1hZ2VcIiwgaW1wb3J0Lm1ldGEudXJsKSxcclxuICAgICAgKSxcclxuICAgICAgXCJ4bHN4XCI6IGZpbGVVUkxUb1BhdGgoXHJcbiAgICAgICAgbmV3IFVSTChcIi4vbm9kZV9tb2R1bGVzL3hsc3hcIiwgaW1wb3J0Lm1ldGEudXJsKSxcclxuICAgICAgKSxcclxuICAgICAgXCJ4bHN4LWpzLXN0eWxlXCI6IGZpbGVVUkxUb1BhdGgoXHJcbiAgICAgICAgbmV3IFVSTChcIi4vbm9kZV9tb2R1bGVzL3hsc3gtanMtc3R5bGVcIiwgaW1wb3J0Lm1ldGEudXJsKSxcclxuICAgICAgKSxcclxuICAgICAgXCJsZWFmbGV0XCI6IGZpbGVVUkxUb1BhdGgoXHJcbiAgICAgICAgbmV3IFVSTChcIi4vbm9kZV9tb2R1bGVzL2xlYWZsZXRcIiwgaW1wb3J0Lm1ldGEudXJsKSxcclxuICAgICAgKSxcclxuICAgICAgXCJyZWFjdC1sZWFmbGV0XCI6IGZpbGVVUkxUb1BhdGgoXHJcbiAgICAgICAgbmV3IFVSTChcIi4vbm9kZV9tb2R1bGVzL3JlYWN0LWxlYWZsZXRcIiwgaW1wb3J0Lm1ldGEudXJsKSxcclxuICAgICAgKSxcclxuICAgICAgXCJsZWFmbGV0LXJvdGF0ZVwiOiBmaWxlVVJMVG9QYXRoKFxyXG4gICAgICAgIG5ldyBVUkwoXCIuL25vZGVfbW9kdWxlcy9sZWFmbGV0LXJvdGF0ZVwiLCBpbXBvcnQubWV0YS51cmwpLFxyXG4gICAgICApLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIGFzc2V0c0luY2x1ZGU6IFtcIioqLyouZ2xiXCIsIFwiKiovKi5nbHRmXCJdLFxyXG4gIHNlcnZlcjoge1xyXG4gICAgYWxsb3dlZEhvc3RzOiB0cnVlLFxyXG4gICAgaG9zdDogJzAuMC4wLjAnLFxyXG4gICAgZnM6IHtcclxuICAgICAgYWxsb3c6IFtcIi4uLy4uXCJdLFxyXG4gICAgfSxcclxuICAgIHBvcnQ6IDUxNzMsXHJcbiAgICBwcm94eToge1xyXG4gICAgICBcIi9hdXRoXCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMDA5XCIsXHJcbiAgICAgIFwiL2FwaS9hZG1pblwiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzAwOVwiLFxyXG4gICAgICBcIi9hcGkvYWN0aXZpdHlcIjogXCJodHRwOi8vbG9jYWxob3N0OjMwMDlcIixcclxuICAgICAgXCIvYXBpL2NvbmZpZ1wiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzAwOVwiLFxyXG4gICAgICBcIi9zb2NrZXQuaW9cIjogeyB0YXJnZXQ6IFwiaHR0cDovL2xvY2FsaG9zdDozMDAyXCIsIHdzOiB0cnVlIH0sXHJcbiAgICAgIFwiL2FwaS9zdGF0aW9uXCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMDAzXCIsXHJcbiAgICAgIFwiL2FwaS9zZXR0aW5nc1wiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzAwM1wiLFxyXG4gICAgICBcIi9hcGkvbG9nc2hlZXRcIjogXCJodHRwOi8vbG9jYWxob3N0OjMwMDNcIixcclxuICAgICAgXCIvYXBpL21haW50ZW5hbmNlXCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMjAwXCIsXHJcbiAgICAgIFwiL2FwaS9sb2dzaGVldC1mb3JtXCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMDA1XCIsXHJcbiAgICAgIFwiL2FwaS9ncmFkaW5nXCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMDA2XCIsXHJcbiAgICAgIFwiL2FwaS9yZXBvcnRzXCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMDA3XCIsXHJcbiAgICAgIFwiL2FwaS9zZWN1cml0eVwiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzEwMVwiLFxyXG4gICAgICBcIi91cGxvYWRzXCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMTAxXCIsXHJcbiAgICAgIFwiL2FwaS93ZWlnaGJyaWRnZVwiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzEwMlwiLFxyXG4gICAgICBcIi9hcGkvZ3JhZGluZy1yYW1wXCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMTAzXCIsXHJcbiAgICAgIFwiL2FwaS9sb2FkaW5nLXJhbXBcIjogXCJodHRwOi8vbG9jYWxob3N0OjMxMDRcIixcclxuICAgICAgXCIvYXBpL3N0ZXJpbGl6ZXJcIjogXCJodHRwOi8vbG9jYWxob3N0OjMxMDVcIixcclxuICAgICAgXCIvYXBpL3RocmVzaGluZ1wiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzEwNlwiLFxyXG4gICAgICBcIi9hcGkvZWZiLXBsYW50XCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMTA3XCIsXHJcbiAgICAgIFwiL2FwaS9wcmVzc1wiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzEwOFwiLFxyXG4gICAgICBcIi9hcGkva2VybmVsLXBsYW50XCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMTA5XCIsXHJcbiAgICAgIFwiL2FwaS9vaWwtY2xhcmlmaWNhdGlvblwiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzExMFwiLFxyXG4gICAgICBcIi9hcGkvYm9pbGVyLWhvdXNlXCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMTExXCIsXHJcbiAgICAgIFwiL2FwaS9lbmdpbmUtcm9vbVwiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzExMlwiLFxyXG4gICAgICBcIi9hcGkvcmF3LXdhdGVyLXRyZWF0bWVudFwiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzExM1wiLFxyXG4gICAgICBcIi9hcGkvZGFmLW9zclwiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzExNFwiLFxyXG4gICAgICBcIi9hcGkvY21yc1wiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzExNVwiLFxyXG4gICAgICBcIi9hcGkvZWZmbHVlbnQtdHJlYXRtZW50XCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMTE2XCIsXHJcbiAgICAgIFwiL2FwaS9hbGFybVwiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzMwMFwiLFxyXG4gICAgICBcIi9hcGkvY29udGFjdHNcIjogXCJodHRwOi8vbG9jYWxob3N0OjM0MDBcIixcclxuICAgIH0sXHJcbiAgfSxcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBa2MsU0FBUyxlQUFlLFdBQVc7QUFDcmUsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxXQUFXO0FBRjJRLElBQU0sMkNBQTJDO0FBSTlVLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxTQUFTLGNBQWMsSUFBSSxJQUFJLGNBQWMsd0NBQWUsQ0FBQztBQUFBLE1BQzdELGFBQWEsY0FBYyxJQUFJLElBQUksa0JBQWtCLHdDQUFlLENBQUM7QUFBQSxNQUNyRSxVQUFVLGNBQWMsSUFBSSxJQUFJLG9CQUFvQix3Q0FBZSxDQUFDO0FBQUEsTUFDcEUsc0JBQXNCO0FBQUEsUUFDcEIsSUFBSSxJQUFJLG9DQUFvQyx3Q0FBZTtBQUFBLE1BQzdEO0FBQUEsTUFDQSx5QkFBeUI7QUFBQSxRQUN2QixJQUFJLElBQUksMkNBQTJDLHdDQUFlO0FBQUEsTUFDcEU7QUFBQSxNQUNBLDBCQUEwQjtBQUFBLFFBQ3hCLElBQUksSUFBSSw0Q0FBNEMsd0NBQWU7QUFBQSxNQUNyRTtBQUFBLE1BQ0EsMEJBQTBCO0FBQUEsUUFDeEIsSUFBSSxJQUFJLDRDQUE0Qyx3Q0FBZTtBQUFBLE1BQ3JFO0FBQUEsTUFDQSxnQ0FBZ0M7QUFBQSxRQUM5QixJQUFJLElBQUksc0NBQXNDLHdDQUFlO0FBQUEsTUFDL0Q7QUFBQSxNQUNBLCtCQUErQjtBQUFBLFFBQzdCLElBQUksSUFBSSxxQ0FBcUMsd0NBQWU7QUFBQSxNQUM5RDtBQUFBLE1BQ0EsdUJBQXVCO0FBQUEsUUFDckIsSUFBSSxJQUFJLHFDQUFxQyx3Q0FBZTtBQUFBLE1BQzlEO0FBQUEsTUFDQSwyQkFBMkI7QUFBQSxRQUN6QixJQUFJLElBQUksaUNBQWlDLHdDQUFlO0FBQUEsTUFDMUQ7QUFBQSxNQUNBLDBCQUEwQjtBQUFBLFFBQ3hCLElBQUksSUFBSSx3Q0FBd0Msd0NBQWU7QUFBQSxNQUNqRTtBQUFBLE1BQ0EsK0JBQStCO0FBQUEsUUFDN0IsSUFBSSxJQUFJLDZDQUE2Qyx3Q0FBZTtBQUFBLE1BQ3RFO0FBQUEsTUFDQSwwQkFBMEI7QUFBQSxRQUN4QixJQUFJLElBQUksNENBQTRDLHdDQUFlO0FBQUEsTUFDckU7QUFBQSxNQUNBLHlCQUF5QjtBQUFBLFFBQ3ZCLElBQUksSUFBSSwyQ0FBMkMsd0NBQWU7QUFBQSxNQUNwRTtBQUFBLE1BQ0EsdUJBQXVCO0FBQUEsUUFDckIsSUFBSTtBQUFBLFVBQ0Y7QUFBQSxVQUNBO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxNQUNBLHFCQUFxQjtBQUFBLFFBQ25CLElBQUksSUFBSSx1Q0FBdUMsd0NBQWU7QUFBQSxNQUNoRTtBQUFBLE1BQ0Esa0JBQWtCO0FBQUEsUUFDaEIsSUFBSSxJQUFJLG9DQUFvQyx3Q0FBZTtBQUFBLE1BQzdEO0FBQUEsTUFDQSxnQ0FBZ0M7QUFBQSxRQUM5QixJQUFJO0FBQUEsVUFDRjtBQUFBLFVBQ0E7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLE1BQ0EsYUFBYSxjQUFjLElBQUksSUFBSSxrQkFBa0Isd0NBQWUsQ0FBQztBQUFBLE1BQ3JFLFlBQVk7QUFBQSxRQUNWLElBQUksSUFBSSwwQkFBMEIsd0NBQWU7QUFBQSxNQUNuRDtBQUFBLE1BQ0EsVUFBVTtBQUFBLFFBQ1IsSUFBSSxJQUFJLDRCQUE0Qix3Q0FBZTtBQUFBLE1BQ3JEO0FBQUEsTUFDQSxnQkFBZ0I7QUFBQSxRQUNkLElBQUksSUFBSSxrQ0FBa0Msd0NBQWU7QUFBQSxNQUMzRDtBQUFBLE1BQ0EsWUFBWSxjQUFjLElBQUksSUFBSSxpQkFBaUIsd0NBQWUsQ0FBQztBQUFBLE1BQ25FLFlBQVk7QUFBQSxRQUNWLElBQUksSUFBSSwrQkFBK0Isd0NBQWU7QUFBQSxNQUN4RDtBQUFBLE1BQ0EsU0FBUyxjQUFjLElBQUksSUFBSSxjQUFjLHdDQUFlLENBQUM7QUFBQSxNQUM3RCxPQUFPLGNBQWMsSUFBSSxJQUFJLHdCQUF3Qix3Q0FBZSxDQUFDO0FBQUEsTUFDckUsYUFBYTtBQUFBLFFBQ1gsSUFBSSxJQUFJLDRCQUE0Qix3Q0FBZTtBQUFBLE1BQ3JEO0FBQUEsTUFDQSxvQkFBb0I7QUFBQSxRQUNsQixJQUFJLElBQUksbUNBQW1DLHdDQUFlO0FBQUEsTUFDNUQ7QUFBQSxNQUNBLGVBQWU7QUFBQSxRQUNiLElBQUksSUFBSSw4QkFBOEIsd0NBQWU7QUFBQSxNQUN2RDtBQUFBLE1BQ0EsZ0JBQWdCO0FBQUEsUUFDZCxJQUFJLElBQUksK0JBQStCLHdDQUFlO0FBQUEsTUFDeEQ7QUFBQSxNQUNBLGlCQUFpQjtBQUFBLFFBQ2YsSUFBSSxJQUFJLGdDQUFnQyx3Q0FBZTtBQUFBLE1BQ3pEO0FBQUEsTUFDQSxRQUFRO0FBQUEsUUFDTixJQUFJLElBQUksdUJBQXVCLHdDQUFlO0FBQUEsTUFDaEQ7QUFBQSxNQUNBLGlCQUFpQjtBQUFBLFFBQ2YsSUFBSSxJQUFJLGdDQUFnQyx3Q0FBZTtBQUFBLE1BQ3pEO0FBQUEsTUFDQSxXQUFXO0FBQUEsUUFDVCxJQUFJLElBQUksMEJBQTBCLHdDQUFlO0FBQUEsTUFDbkQ7QUFBQSxNQUNBLGlCQUFpQjtBQUFBLFFBQ2YsSUFBSSxJQUFJLGdDQUFnQyx3Q0FBZTtBQUFBLE1BQ3pEO0FBQUEsTUFDQSxrQkFBa0I7QUFBQSxRQUNoQixJQUFJLElBQUksaUNBQWlDLHdDQUFlO0FBQUEsTUFDMUQ7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0EsZUFBZSxDQUFDLFlBQVksV0FBVztBQUFBLEVBQ3ZDLFFBQVE7QUFBQSxJQUNOLGNBQWM7QUFBQSxJQUNkLE1BQU07QUFBQSxJQUNOLElBQUk7QUFBQSxNQUNGLE9BQU8sQ0FBQyxPQUFPO0FBQUEsSUFDakI7QUFBQSxJQUNBLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQSxNQUNMLFNBQVM7QUFBQSxNQUNULGNBQWM7QUFBQSxNQUNkLGlCQUFpQjtBQUFBLE1BQ2pCLGVBQWU7QUFBQSxNQUNmLGNBQWMsRUFBRSxRQUFRLHlCQUF5QixJQUFJLEtBQUs7QUFBQSxNQUMxRCxnQkFBZ0I7QUFBQSxNQUNoQixpQkFBaUI7QUFBQSxNQUNqQixpQkFBaUI7QUFBQSxNQUNqQixvQkFBb0I7QUFBQSxNQUNwQixzQkFBc0I7QUFBQSxNQUN0QixnQkFBZ0I7QUFBQSxNQUNoQixnQkFBZ0I7QUFBQSxNQUNoQixpQkFBaUI7QUFBQSxNQUNqQixZQUFZO0FBQUEsTUFDWixvQkFBb0I7QUFBQSxNQUNwQixxQkFBcUI7QUFBQSxNQUNyQixxQkFBcUI7QUFBQSxNQUNyQixtQkFBbUI7QUFBQSxNQUNuQixrQkFBa0I7QUFBQSxNQUNsQixrQkFBa0I7QUFBQSxNQUNsQixjQUFjO0FBQUEsTUFDZCxxQkFBcUI7QUFBQSxNQUNyQiwwQkFBMEI7QUFBQSxNQUMxQixxQkFBcUI7QUFBQSxNQUNyQixvQkFBb0I7QUFBQSxNQUNwQiw0QkFBNEI7QUFBQSxNQUM1QixnQkFBZ0I7QUFBQSxNQUNoQixhQUFhO0FBQUEsTUFDYiwyQkFBMkI7QUFBQSxNQUMzQixjQUFjO0FBQUEsTUFDZCxpQkFBaUI7QUFBQSxJQUNuQjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
