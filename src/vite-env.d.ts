/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_INVOCATIONS?: string;
    readonly VITE_LATENCY_MS?: string;
    readonly VITE_FAILURE_RATE?: string;
}
