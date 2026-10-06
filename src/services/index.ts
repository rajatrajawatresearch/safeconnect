import type { Services } from "./contracts";
import { createHttpServices } from "./http";
import { API_MODE } from "./http/config";
import { createMockServices } from "./mock";

/**
 * The single place the app picks its backend.
 *
 *  - With `NEXT_PUBLIC_API_URL` or `NEXT_PUBLIC_API_PORT` set (as `npm run dev:full` does), every
 *    command goes to the API server and the store is filled from its live stream.
 *  - With neither, the app is the stand-alone demo: the same commands run in the browser.
 *
 * Screens import `services` and never know which one they got.
 */
export const services: Services = API_MODE
  ? createHttpServices()
  : createMockServices();

export * from "./contracts";
export { API_MODE } from "./http/config";
export { citizenLocation } from "@/domain/queries";
