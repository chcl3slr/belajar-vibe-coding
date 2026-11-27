import { app, startServer } from "./src/index";

if (import.meta.main) {
  startServer();
}

export default app;
export { app, startServer };
