import { capabilitiesTools } from "./capabilities/index.ts";
import { gmapsTools } from "./gmaps/index.ts";
import { md2slideTools } from "./md2slide/index.ts";
import { pdfTools } from "./pdf/index.ts";

export const allTools = [
  ...capabilitiesTools,
  ...gmapsTools,
  ...md2slideTools,
  ...pdfTools,
];
