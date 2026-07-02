/**
 * src/instrumentation.ts
 * ----------------------
 * Purpose: Server startup hook — logs safe env diagnostics once per Node process.
 * Security notes: never logs secret values (see env-diagnostics).
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { logEnvStartupDiagnostics } = await import("@/lib/env-diagnostics");
    logEnvStartupDiagnostics();
  }
}
