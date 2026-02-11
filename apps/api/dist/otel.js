import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { config } from "./config";
let sdk = null;
export function startOtel() {
    if (!config.otelEndpoint)
        return;
    const exporter = new OTLPTraceExporter({ url: config.otelEndpoint });
    sdk = new NodeSDK({
        traceExporter: exporter,
        instrumentations: [getNodeAutoInstrumentations()]
    });
    sdk.start();
}
export async function shutdownOtel() {
    if (sdk) {
        await sdk.shutdown();
    }
}
