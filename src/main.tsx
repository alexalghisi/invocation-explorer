import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { FakeRuntime } from "./runtime/FakeRuntime";
import "./styles.css";

const size = Number(import.meta.env.VITE_INVOCATIONS ?? 100_000);
const runtime = new FakeRuntime({
    size: Number.isFinite(size) && size > 0 ? size : 100_000,
    seed: 7,
    latencyMs: Number(import.meta.env.VITE_LATENCY_MS ?? 120),
    failureRate: Number(import.meta.env.VITE_FAILURE_RATE ?? 0.02),
});
setInterval(() => runtime.tick(), 1_000);

const root = document.getElementById("root");
if (!root) throw new Error("#root is missing from index.html");

createRoot(root).render(
    <StrictMode>
        <App api={runtime} />
    </StrictMode>,
);
