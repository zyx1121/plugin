import { capabilitiesTools } from "./capabilities/index.ts";
import { gmapsTools } from "./gmaps/index.ts";
import { pdfTools } from "./pdf/index.ts";

export const allTools = [
  ...capabilitiesTools,
  ...gmapsTools,
  ...pdfTools,
];
