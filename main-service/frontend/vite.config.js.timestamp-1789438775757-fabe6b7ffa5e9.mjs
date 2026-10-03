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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxQVCBQUkVNSUVSXFxcXE1ld2FoIEdyb3VwXFxcXFBUIEtJUFxcXFxQQyBTZXJ2ZXJcXFxcUFJPR1JBTVxcXFxtZXdhaC1raXBcXFxcbWFpbi1zZXJ2aWNlXFxcXGZyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxQVCBQUkVNSUVSXFxcXE1ld2FoIEdyb3VwXFxcXFBUIEtJUFxcXFxQQyBTZXJ2ZXJcXFxcUFJPR1JBTVxcXFxtZXdhaC1raXBcXFxcbWFpbi1zZXJ2aWNlXFxcXGZyb250ZW5kXFxcXHZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9QVCUyMFBSRU1JRVIvTWV3YWglMjBHcm91cC9QVCUyMEtJUC9QQyUyMFNlcnZlci9QUk9HUkFNL21ld2FoLWtpcC9tYWluLXNlcnZpY2UvZnJvbnRlbmQvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBmaWxlVVJMVG9QYXRoLCBVUkwgfSBmcm9tIFwibm9kZTp1cmxcIjtcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gXCJ2aXRlXCI7XG5pbXBvcnQgcmVhY3QgZnJvbSBcIkB2aXRlanMvcGx1Z2luLXJlYWN0XCI7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICBcIkBjb3JlXCI6IGZpbGVVUkxUb1BhdGgobmV3IFVSTChcIi4vc3JjL2NvcmVcIiwgaW1wb3J0Lm1ldGEudXJsKSksXG4gICAgICBcIkBvdmVydmlld1wiOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoXCIuL3NyYy9vdmVydmlld1wiLCBpbXBvcnQubWV0YS51cmwpKSxcbiAgICAgIFwiQHBhZ2VzXCI6IGZpbGVVUkxUb1BhdGgobmV3IFVSTChcIi4vc3JjL2NvcmUvcGFnZXNcIiwgaW1wb3J0Lm1ldGEudXJsKSksXG4gICAgICBcIkBzdGF0aW9ucy9zZWN1cml0eVwiOiBmaWxlVVJMVG9QYXRoKFxuICAgICAgICBuZXcgVVJMKFwiLi4vLi4vc3RhdGlvbnMvc2VjdXJpdHkvZnJvbnRlbmRcIiwgaW1wb3J0Lm1ldGEudXJsKSxcbiAgICAgICksXG4gICAgICBcIkBzdGF0aW9ucy93ZWlnaGJyaWRnZVwiOiBmaWxlVVJMVG9QYXRoKFxuICAgICAgICBuZXcgVVJMKFwiLi4vLi4vc3RhdGlvbnMvd2VpZ2hicmlkZ2UvZnJvbnRlbmQvc3JjXCIsIGltcG9ydC5tZXRhLnVybCksXG4gICAgICApLFxuICAgICAgXCJAc3RhdGlvbnMvZ3JhZGluZy1yYW1wXCI6IGZpbGVVUkxUb1BhdGgoXG4gICAgICAgIG5ldyBVUkwoXCIuLi8uLi9zdGF0aW9ucy9ncmFkaW5nLXJhbXAvZnJvbnRlbmQvc3JjXCIsIGltcG9ydC5tZXRhLnVybCksXG4gICAgICApLFxuICAgICAgXCJAc3RhdGlvbnMvbG9hZGluZy1yYW1wXCI6IGZpbGVVUkxUb1BhdGgoXG4gICAgICAgIG5ldyBVUkwoXCIuLi8uLi9zdGF0aW9ucy9sb2FkaW5nLXJhbXAvZnJvbnRlbmQvc3JjXCIsIGltcG9ydC5tZXRhLnVybCksXG4gICAgICApLFxuICAgICAgXCJAc3RhdGlvbnMvc3RlcmlsaXplci1zdGF0aW9uXCI6IGZpbGVVUkxUb1BhdGgoXG4gICAgICAgIG5ldyBVUkwoXCIuLi8uLi9zdGF0aW9ucy9zdGVyaWxpemVyL2Zyb250ZW5kXCIsIGltcG9ydC5tZXRhLnVybCksXG4gICAgICApLFxuICAgICAgXCJAc3RhdGlvbnMvdGhyZXNoaW5nLXN0YXRpb25cIjogZmlsZVVSTFRvUGF0aChcbiAgICAgICAgbmV3IFVSTChcIi4uLy4uL3N0YXRpb25zL3RocmVzaGluZy9mcm9udGVuZFwiLCBpbXBvcnQubWV0YS51cmwpLFxuICAgICAgKSxcbiAgICAgIFwiQHN0YXRpb25zL2VmYi1wbGFudFwiOiBmaWxlVVJMVG9QYXRoKFxuICAgICAgICBuZXcgVVJMKFwiLi4vLi4vc3RhdGlvbnMvZWZiLXBsYW50L2Zyb250ZW5kXCIsIGltcG9ydC5tZXRhLnVybCksXG4gICAgICApLFxuICAgICAgXCJAc3RhdGlvbnMvcHJlc3Mtc3RhdGlvblwiOiBmaWxlVVJMVG9QYXRoKFxuICAgICAgICBuZXcgVVJMKFwiLi4vLi4vc3RhdGlvbnMvcHJlc3MvZnJvbnRlbmRcIiwgaW1wb3J0Lm1ldGEudXJsKSxcbiAgICAgICksXG4gICAgICBcIkBzdGF0aW9ucy9rZXJuZWwtcGxhbnRcIjogZmlsZVVSTFRvUGF0aChcbiAgICAgICAgbmV3IFVSTChcIi4uLy4uL3N0YXRpb25zL2tlcm5lbC1wbGFudC9mcm9udGVuZFwiLCBpbXBvcnQubWV0YS51cmwpLFxuICAgICAgKSxcbiAgICAgIFwiQHN0YXRpb25zL29pbC1jbGFyaWZpY2F0aW9uXCI6IGZpbGVVUkxUb1BhdGgoXG4gICAgICAgIG5ldyBVUkwoXCIuLi8uLi9zdGF0aW9ucy9vaWwtY2xhcmlmaWNhdGlvbi9mcm9udGVuZFwiLCBpbXBvcnQubWV0YS51cmwpLFxuICAgICAgKSxcbiAgICAgIFwiQHN0YXRpb25zL2JvaWxlci1ob3VzZVwiOiBmaWxlVVJMVG9QYXRoKFxuICAgICAgICBuZXcgVVJMKFwiLi4vLi4vc3RhdGlvbnMvYm9pbGVyLWhvdXNlL2Zyb250ZW5kL3NyY1wiLCBpbXBvcnQubWV0YS51cmwpLFxuICAgICAgKSxcbiAgICAgIFwiQHN0YXRpb25zL2VuZ2luZS1yb29tXCI6IGZpbGVVUkxUb1BhdGgoXG4gICAgICAgIG5ldyBVUkwoXCIuLi8uLi9zdGF0aW9ucy9lbmdpbmUtcm9vbS9mcm9udGVuZC9zcmNcIiwgaW1wb3J0Lm1ldGEudXJsKSxcbiAgICAgICksXG4gICAgICBcIkBzdGF0aW9ucy9yYXctd2F0ZXJcIjogZmlsZVVSTFRvUGF0aChcbiAgICAgICAgbmV3IFVSTChcbiAgICAgICAgICBcIi4uLy4uL3N0YXRpb25zL3Jhdy13YXRlci10cmVhdG1lbnQvZnJvbnRlbmQvc3JjXCIsXG4gICAgICAgICAgaW1wb3J0Lm1ldGEudXJsLFxuICAgICAgICApLFxuICAgICAgKSxcbiAgICAgIFwiQHN0YXRpb25zL2RhZi1vc3JcIjogZmlsZVVSTFRvUGF0aChcbiAgICAgICAgbmV3IFVSTChcIi4uLy4uL3N0YXRpb25zL2RhZi1vc3IvZnJvbnRlbmQvc3JjXCIsIGltcG9ydC5tZXRhLnVybCksXG4gICAgICApLFxuICAgICAgXCJAc3RhdGlvbnMvY21yc1wiOiBmaWxlVVJMVG9QYXRoKFxuICAgICAgICBuZXcgVVJMKFwiLi4vLi4vc3RhdGlvbnMvY21ycy9mcm9udGVuZC9zcmNcIiwgaW1wb3J0Lm1ldGEudXJsKSxcbiAgICAgICksXG4gICAgICBcIkBzdGF0aW9ucy9lZmZsdWVudC10cmVhdG1lbnRcIjogZmlsZVVSTFRvUGF0aChcbiAgICAgICAgbmV3IFVSTChcbiAgICAgICAgICBcIi4uLy4uL3N0YXRpb25zL2VmZmx1ZW50LXRyZWF0bWVudC9mcm9udGVuZC9zcmNcIixcbiAgICAgICAgICBpbXBvcnQubWV0YS51cmwsXG4gICAgICAgICksXG4gICAgICApLFxuICAgICAgXCJAc3RhdGlvbnNcIjogZmlsZVVSTFRvUGF0aChuZXcgVVJMKFwiLi9zcmMvc3RhdGlvbnNcIiwgaW1wb3J0Lm1ldGEudXJsKSksXG4gICAgICBcIkByZXBvcnRzXCI6IGZpbGVVUkxUb1BhdGgoXG4gICAgICAgIG5ldyBVUkwoXCIuL3NyYy9yZXBvcnRzLWxvZ3NoZWV0XCIsIGltcG9ydC5tZXRhLnVybCksXG4gICAgICApLFxuICAgICAgXCJAYWxhcm1cIjogZmlsZVVSTFRvUGF0aChcbiAgICAgICAgbmV3IFVSTChcIi4uLy4uL2FsYXJtL2Zyb250ZW5kL3NyY1wiLCBpbXBvcnQubWV0YS51cmwpLFxuICAgICAgKSxcbiAgICAgIFwiQG1haW50ZW5hbmNlXCI6IGZpbGVVUkxUb1BhdGgoXG4gICAgICAgIG5ldyBVUkwoXCIuLi8uLi9tYWludGVuYW5jZS9mcm9udGVuZC9zcmNcIiwgaW1wb3J0Lm1ldGEudXJsKSxcbiAgICAgICksXG4gICAgICBcIkBzZXR0aW5nXCI6IGZpbGVVUkxUb1BhdGgobmV3IFVSTChcIi4vc3JjL3NldHRpbmdcIiwgaW1wb3J0Lm1ldGEudXJsKSksXG4gICAgICBcIkBjb250YWN0XCI6IGZpbGVVUkxUb1BhdGgoXG4gICAgICAgIG5ldyBVUkwoXCIuLi8uLi9jb250YWN0cy9mcm9udGVuZC9zcmNcIiwgaW1wb3J0Lm1ldGEudXJsKSxcbiAgICAgICksXG4gICAgICBcIkBob21lXCI6IGZpbGVVUkxUb1BhdGgobmV3IFVSTChcIi4vc3JjL2hvbWVcIiwgaW1wb3J0Lm1ldGEudXJsKSksXG4gICAgICByZWFjdDogZmlsZVVSTFRvUGF0aChuZXcgVVJMKFwiLi9ub2RlX21vZHVsZXMvcmVhY3RcIiwgaW1wb3J0Lm1ldGEudXJsKSksXG4gICAgICBcInJlYWN0LWRvbVwiOiBmaWxlVVJMVG9QYXRoKFxuICAgICAgICBuZXcgVVJMKFwiLi9ub2RlX21vZHVsZXMvcmVhY3QtZG9tXCIsIGltcG9ydC5tZXRhLnVybCksXG4gICAgICApLFxuICAgICAgXCJyZWFjdC1pY29uc1wiOiBmaWxlVVJMVG9QYXRoKFxuICAgICAgICBuZXcgVVJMKFwiLi9ub2RlX21vZHVsZXMvcmVhY3QtaWNvbnNcIiwgaW1wb3J0Lm1ldGEudXJsKSxcbiAgICAgICksXG4gICAgICBcInFyY29kZS5yZWFjdFwiOiBmaWxlVVJMVG9QYXRoKFxuICAgICAgICBuZXcgVVJMKFwiLi9ub2RlX21vZHVsZXMvcXJjb2RlLnJlYWN0XCIsIGltcG9ydC5tZXRhLnVybCksXG4gICAgICApLFxuICAgICAgXCJodG1sLXRvLWltYWdlXCI6IGZpbGVVUkxUb1BhdGgoXG4gICAgICAgIG5ldyBVUkwoXCIuL25vZGVfbW9kdWxlcy9odG1sLXRvLWltYWdlXCIsIGltcG9ydC5tZXRhLnVybCksXG4gICAgICApLFxuICAgICAgXCJ4bHN4XCI6IGZpbGVVUkxUb1BhdGgoXG4gICAgICAgIG5ldyBVUkwoXCIuL25vZGVfbW9kdWxlcy94bHN4XCIsIGltcG9ydC5tZXRhLnVybCksXG4gICAgICApLFxuICAgICAgXCJ4bHN4LWpzLXN0eWxlXCI6IGZpbGVVUkxUb1BhdGgoXG4gICAgICAgIG5ldyBVUkwoXCIuL25vZGVfbW9kdWxlcy94bHN4LWpzLXN0eWxlXCIsIGltcG9ydC5tZXRhLnVybCksXG4gICAgICApLFxuICAgICAgXCJsZWFmbGV0XCI6IGZpbGVVUkxUb1BhdGgoXG4gICAgICAgIG5ldyBVUkwoXCIuL25vZGVfbW9kdWxlcy9sZWFmbGV0XCIsIGltcG9ydC5tZXRhLnVybCksXG4gICAgICApLFxuICAgICAgXCJyZWFjdC1sZWFmbGV0XCI6IGZpbGVVUkxUb1BhdGgoXG4gICAgICAgIG5ldyBVUkwoXCIuL25vZGVfbW9kdWxlcy9yZWFjdC1sZWFmbGV0XCIsIGltcG9ydC5tZXRhLnVybCksXG4gICAgICApLFxuICAgICAgXCJsZWFmbGV0LXJvdGF0ZVwiOiBmaWxlVVJMVG9QYXRoKFxuICAgICAgICBuZXcgVVJMKFwiLi9ub2RlX21vZHVsZXMvbGVhZmxldC1yb3RhdGVcIiwgaW1wb3J0Lm1ldGEudXJsKSxcbiAgICAgICksXG4gICAgfSxcbiAgfSxcbiAgYXNzZXRzSW5jbHVkZTogW1wiKiovKi5nbGJcIiwgXCIqKi8qLmdsdGZcIl0sXG4gIHNlcnZlcjoge1xuICAgIGFsbG93ZWRIb3N0czogdHJ1ZSxcbiAgICBob3N0OiAnMC4wLjAuMCcsXG4gICAgZnM6IHtcbiAgICAgIGFsbG93OiBbXCIuLi8uLlwiXSxcbiAgICB9LFxuICAgIHBvcnQ6IDUxNzMsXG4gICAgcHJveHk6IHtcbiAgICAgIFwiL2F1dGhcIjogXCJodHRwOi8vbG9jYWxob3N0OjMwMDlcIixcbiAgICAgIFwiL2FwaS9hZG1pblwiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzAwOVwiLFxuICAgICAgXCIvYXBpL2FjdGl2aXR5XCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMDA5XCIsXG4gICAgICBcIi9hcGkvY29uZmlnXCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMDA5XCIsXG4gICAgICBcIi9zb2NrZXQuaW9cIjogeyB0YXJnZXQ6IFwiaHR0cDovL2xvY2FsaG9zdDozMDAyXCIsIHdzOiB0cnVlIH0sXG4gICAgICBcIi9hcGkvc3RhdGlvblwiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzAwM1wiLFxuICAgICAgXCIvYXBpL3NldHRpbmdzXCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMDAzXCIsXG4gICAgICBcIi9hcGkvbG9nc2hlZXRcIjogXCJodHRwOi8vbG9jYWxob3N0OjMwMDNcIixcbiAgICAgIFwiL2FwaS9tYWludGVuYW5jZVwiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzIwMFwiLFxuICAgICAgXCIvYXBpL2xvZ3NoZWV0LWZvcm1cIjogXCJodHRwOi8vbG9jYWxob3N0OjMwMDVcIixcbiAgICAgIFwiL2FwaS9ncmFkaW5nXCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMDA2XCIsXG4gICAgICBcIi9hcGkvcmVwb3J0c1wiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzAwN1wiLFxuICAgICAgXCIvYXBpL3NlY3VyaXR5XCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMTAxXCIsXG4gICAgICBcIi91cGxvYWRzXCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMTAxXCIsXG4gICAgICBcIi9hcGkvd2VpZ2hicmlkZ2VcIjogXCJodHRwOi8vbG9jYWxob3N0OjMxMDJcIixcbiAgICAgIFwiL2FwaS9ncmFkaW5nLXJhbXBcIjogXCJodHRwOi8vbG9jYWxob3N0OjMxMDNcIixcbiAgICAgIFwiL2FwaS9sb2FkaW5nLXJhbXBcIjogXCJodHRwOi8vbG9jYWxob3N0OjMxMDRcIixcbiAgICAgIFwiL2FwaS9zdGVyaWxpemVyXCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMTA1XCIsXG4gICAgICBcIi9hcGkvdGhyZXNoaW5nXCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMTA2XCIsXG4gICAgICBcIi9hcGkvZWZiLXBsYW50XCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMTA3XCIsXG4gICAgICBcIi9hcGkvcHJlc3NcIjogXCJodHRwOi8vbG9jYWxob3N0OjMxMDhcIixcbiAgICAgIFwiL2FwaS9rZXJuZWwtcGxhbnRcIjogXCJodHRwOi8vbG9jYWxob3N0OjMxMDlcIixcbiAgICAgIFwiL2FwaS9vaWwtY2xhcmlmaWNhdGlvblwiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzExMFwiLFxuICAgICAgXCIvYXBpL2JvaWxlci1ob3VzZVwiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzExMVwiLFxuICAgICAgXCIvYXBpL2VuZ2luZS1yb29tXCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMTEyXCIsXG4gICAgICBcIi9hcGkvcmF3LXdhdGVyLXRyZWF0bWVudFwiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzExM1wiLFxuICAgICAgXCIvYXBpL2RhZi1vc3JcIjogXCJodHRwOi8vbG9jYWxob3N0OjMxMTRcIixcbiAgICAgIFwiL2FwaS9jbXJzXCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMTE1XCIsXG4gICAgICBcIi9hcGkvZWZmbHVlbnQtdHJlYXRtZW50XCI6IFwiaHR0cDovL2xvY2FsaG9zdDozMTE2XCIsXG4gICAgICBcIi9hcGkvYWxhcm1cIjogXCJodHRwOi8vbG9jYWxob3N0OjMzMDBcIixcbiAgICAgIFwiL2FwaS9jb250YWN0c1wiOiBcImh0dHA6Ly9sb2NhbGhvc3Q6MzQwMFwiLFxuICAgIH0sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBa2MsU0FBUyxlQUFlLFdBQVc7QUFDcmUsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxXQUFXO0FBRjJRLElBQU0sMkNBQTJDO0FBSTlVLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixTQUFTO0FBQUEsSUFDUCxPQUFP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QUksSUFBSSxnQ0FBZ0Msd0NBQWU7QUFBQSxNQUN6RDtBQUFBLE1BQ0EsUUFBUTtBQUFBLFFBQ04sSUFBSSxJQUFJLHVCQUF1Qix3Q0FBZTtBQUFBLE1BQ2hEO0FBQUEsTUFDQSxpQkFBaUI7QUFBQSxRQUNmLElBQUksSUFBSSxnQ0FBZ0Msd0NBQWU7QUFBQSxNQUN6RDtBQUFBLE1BQ0EsV0FBVztBQUFBLFFBQ1QsSUFBSSxJQUFJLDBCQUEwQix3Q0FBZTtBQUFBLE1BQ25EO0FBQUEsTUFDQSxpQkFBaUI7QUFBQSxRQUNmLElBQUksSUFBSSxnQ0FBZ0Msd0NBQWU7QUFBQSxNQUN6RDtBQUFBLE1BQ0Esa0JBQWtCO0FBQUEsUUFDaEIsSUFBSSxJQUFJLGlDQUFpQyx3Q0FBZTtBQUFBLE1BQzFEO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLGVBQWUsQ0FBQyxZQUFZLFdBQVc7QUFBQSxFQUN2QyxRQUFRO0FBQUEsSUFDTixjQUFjO0FBQUEsSUFDZCxNQUFNO0FBQUEsSUFDTixJQUFJO0FBQUEsTUFDRixPQUFPLENBQUMsT0FBTztBQUFBLElBQ2pCO0FBQUEsSUFDQSxNQUFNO0FBQUEsSUFDTixPQUFPO0FBQUEsTUFDTCxTQUFTO0FBQUEsTUFDVCxjQUFjO0FBQUEsTUFDZCxpQkFBaUI7QUFBQSxNQUNqQixlQUFlO0FBQUEsTUFDZixjQUFjLEVBQUUsUUFBUSx5QkFBeUIsSUFBSSxLQUFLO0FBQUEsTUFDMUQsZ0JBQWdCO0FBQUEsTUFDaEIsaUJBQWlCO0FBQUEsTUFDakIsaUJBQWlCO0FBQUEsTUFDakIsb0JBQW9CO0FBQUEsTUFDcEIsc0JBQXNCO0FBQUEsTUFDdEIsZ0JBQWdCO0FBQUEsTUFDaEIsZ0JBQWdCO0FBQUEsTUFDaEIsaUJBQWlCO0FBQUEsTUFDakIsWUFBWTtBQUFBLE1BQ1osb0JBQW9CO0FBQUEsTUFDcEIscUJBQXFCO0FBQUEsTUFDckIscUJBQXFCO0FBQUEsTUFDckIsbUJBQW1CO0FBQUEsTUFDbkIsa0JBQWtCO0FBQUEsTUFDbEIsa0JBQWtCO0FBQUEsTUFDbEIsY0FBYztBQUFBLE1BQ2QscUJBQXFCO0FBQUEsTUFDckIsMEJBQTBCO0FBQUEsTUFDMUIscUJBQXFCO0FBQUEsTUFDckIsb0JBQW9CO0FBQUEsTUFDcEIsNEJBQTRCO0FBQUEsTUFDNUIsZ0JBQWdCO0FBQUEsTUFDaEIsYUFBYTtBQUFBLE1BQ2IsMkJBQTJCO0FBQUEsTUFDM0IsY0FBYztBQUFBLE1BQ2QsaUJBQWlCO0FBQUEsSUFDbkI7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
