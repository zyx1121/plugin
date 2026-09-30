import { calendarTools } from "./calendar/index.ts";
import { capabilitiesTools } from "./capabilities/index.ts";
import { gmapsTools } from "./gmaps/index.ts";
import { mailTools } from "./mail/index.ts";
import { md2slideTools } from "./md2slide/index.ts";
import { pdfTools } from "./pdf/index.ts";
import { remindersTools } from "./reminders/index.ts";
import { safariTools } from "./safari/index.ts";
import { screenshotTools } from "./screenshot/index.ts";
import { ubereatsTools } from "./ubereats/index.ts";

export const allTools = [
  ...calendarTools,
  ...capabilitiesTools,
  ...gmapsTools,
  ...mailTools,
  ...md2slideTools,
  ...pdfTools,
  ...remindersTools,
  ...safariTools,
  ...screenshotTools,
  ...ubereatsTools,
];
