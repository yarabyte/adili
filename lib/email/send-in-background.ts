/**
 * Lance un envoi email sans bloquer la réponse HTTP (best-effort).
 */
export function sendEmailInBackground(
  label: string,
  task: () => Promise<void>
): void {
  void task().catch((err) => {
    console.error(`[email:background] ${label}`, err);
  });
}
