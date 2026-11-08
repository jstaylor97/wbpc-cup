import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import crest from "../wbpc_cup_crest_simple.png"
import { App } from "./App"
import "./styles.css"

const icon = document.querySelector<HTMLLinkElement>("link[rel='icon']")
if (icon) icon.href = crest

const root = document.getElementById("root")
if (!root) throw new Error("Root element missing")

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
