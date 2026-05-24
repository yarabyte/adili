/** Messages d’erreur auth lisibles (Supabase renvoie parfois peu de détails). */
export function formatAuthError(error: {
  message?: string;
  code?: string;
}): string {
  const code = error.code ?? "";
  const msg = error.message?.trim() ?? "";

  if (
    code === "invalid_credentials" ||
    /invalid login credentials/i.test(msg)
  ) {
    return "Email ou mot de passe incorrect.";
  }
  if (code === "email_not_confirmed") {
    return "Confirmez votre adresse email avant de vous connecter (vérifiez votre boîte de réception).";
  }
  if (code === "too_many_requests") {
    return "Trop de tentatives. Patientez quelques minutes avant de réessayer.";
  }
  if (
    /database error saving new user/i.test(msg) ||
    code === "unexpected_failure"
  ) {
    return "Impossible de créer le compte (base de données). Si cet email a déjà été utilisé, connectez-vous ou réinitialisez le mot de passe. Sinon, contactez support@adili.cloud.";
  }
  if (/already registered|already been registered|user already exists/i.test(msg)) {
    return "Un compte existe déjà avec cet email. Connectez-vous ou utilisez « Mot de passe oublié ».";
  }
  if (msg) return msg;
  return "Connexion impossible. Réessayez dans un instant.";
}
