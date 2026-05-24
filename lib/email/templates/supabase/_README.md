# Templates email Supabase Auth — design Adili

Ces fichiers HTML remplacent les emails par défaut envoyés par Supabase pour
les flux d'auth (confirmation d'inscription, mot de passe oublié, magic link,
changement d'email).

Ils utilisent les variables [Go template](https://supabase.com/docs/guides/auth/auth-email-templates)
exposées par Supabase. Les liens passent par **votre domaine** (`/auth/confirm`) et non
par `*.supabase.co` — l’app valide le `token_hash` côté serveur.

Variables clés : `{{ .SiteURL }}`, `{{ .TokenHash }}`, `{{ .Email }}`, `{{ .Data.full_name }}`.

## Où les coller dans Supabase

1. Dashboard Supabase → projet **adili** → **Authentication → Emails → Templates**.
2. Pour chaque type d'email, ouvrir l'onglet correspondant et **remplacer** :
   - Sujet (Subject)
   - Corps HTML (Message body — laisser `text/html`)
3. Cliquer **Save**.

| Fichier                       | Onglet Supabase           | Sujet recommandé                                 |
| ----------------------------- | ------------------------- | ------------------------------------------------ |
| `confirm-signup.html`         | **Confirm signup**        | `Confirmez votre adresse email — Adili`          |
| `magic-link.html`             | **Magic Link**            | `Votre lien de connexion Adili`                  |
| `reset-password.html`         | **Reset Password**        | `Réinitialiser votre mot de passe Adili`        |
| `change-email-address.html`   | **Change Email Address**  | `Confirmez votre nouvelle adresse email — Adili` |

> Adresse `From` : Supabase n'envoie que via le SMTP configuré dans
> **Authentication → SMTP Settings**. Pour que ces emails arrivent depuis
> `Adili <support@adili.cloud>`, configurer le SMTP PrivateEmail dans Supabase
> (mêmes valeurs que `.env.local`).

## Nom d'expéditeur (« Supabase Auth » → Adili)

Tant que le SMTP custom n'est pas activé, les mails partent avec l'expéditeur par défaut
**Supabase Auth**. Pour afficher **Adili Votre assistant Juridique** :

1. Dashboard Supabase → **Authentication** → [**SMTP Settings**](https://supabase.com/dashboard/project/_/auth/smtp)
2. Activer **Enable custom SMTP**
3. Renseigner (aligné sur `.env.local`) :
   - **Host** : `SMTP_HOST` (ex. `mail.privateemail.com`)
   - **Port** : `465` (ou `587` + TLS selon fournisseur)
   - **Username** / **Password** : `SMTP_USER` / `SMTP_PASS`
   - **Sender email** : `support@adili.cloud` (ou votre `SMTP_USER`)
   - **Sender name** : `Adili Votre assistant Juridique`
4. **Save**

Équivalent API Management (`smtp_sender_name`) :

```bash
curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "external_email_enabled": true,
    "smtp_admin_email": "support@adili.cloud",
    "smtp_host": "mail.privateemail.com",
    "smtp_port": 465,
    "smtp_user": "support@adili.cloud",
    "smtp_pass": "VOTRE_MOT_DE_PASSE",
    "smtp_sender_name": "Adili Votre assistant Juridique"
  }'
```

## Maintenir le design

- Les couleurs sont en hex inline (compatibilité Outlook). Si la charte
  brand-* évolue, mettre à jour les 9 hex en tête de chaque fichier.
- Le wordmark `ADILI` est en CSS pur (Georgia) → pas de dépendance image,
  donc rien à héberger.
- Le `preheader` (texte caché) sert d'aperçu Gmail/Outlook.

## Site URL (obligatoire)

Dashboard Supabase → **Authentication → URL Configuration** :

- **Site URL** : `http://localhost:3000` (dev) ou `https://votre-domaine.com` (prod)
- **Redirect URLs** : `http://localhost:3000/auth/callback`, `http://localhost:3000/auth/confirm`, et équivalents prod

Sans `Site URL` correct, `{{ .SiteURL }}` dans les emails sera faux.

## Variables Supabase utilisées

| Variable                | Présent dans            | Description                                  |
| ----------------------- | ----------------------- | -------------------------------------------- |
| `{{ .SiteURL }}`         | Tous                   | Origine Adili (bouton + texte de secours)    |
| `{{ .TokenHash }}`       | Tous                   | Jeton pour `/auth/confirm` (ne pas afficher en clair dans le corps) |
| `{{ .Email }}`           | Tous                   | Adresse email destinataire                   |
| `{{ .Data.full_name }}`  | Tous (si fourni)       | Nom passé à `supabase.auth.signUp` (options.data) |
| `{{ .NewEmail }}`        | `change-email-address` | Nouvelle adresse demandée                    |

> Ne plus utiliser `{{ .ConfirmationURL }}` : elle pointe vers `*.supabase.co`.

> Pour qu'`{{ .Data.full_name }}` ait une valeur lors de l'inscription depuis
> notre app, on l'envoie déjà via `options.data.full_name` dans `signUp` et
> `signUpFromInvitation`.
