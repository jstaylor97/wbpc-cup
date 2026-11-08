import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves this repo at /wbpc-cup/. Local dev stays at /.
  base: process.env.GITHUB_ACTIONS ? "/wbpc-cup/" : "/",
})
