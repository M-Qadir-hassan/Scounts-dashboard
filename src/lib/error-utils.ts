/**
 * Extracts a safe error string from an unknown caught value or API response json.
 * Centralizes the `typeof json === "object" && json && "error" in json...` checks that were duplicated everywhere.
 */
export function extractError(err: unknown, defaultMessage = "An error occurred"): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  
  if (typeof err === "object" && err !== null) {
    if ("error" in err && typeof (err as any).error === "string") {
      return (err as any).error;
    }
    if ("message" in err && typeof (err as any).message === "string") {
      return (err as any).message;
    }
  }
  
  return defaultMessage;
}
