export const WEB_EVENTS = {
  PAGE_VIEW: "page_view",
  PAGE_EXIT: "page_exit",
  CLICK_CTA: "click_cta",
  FORM_START: "form_start",
  FORM_SUBMIT: "form_submit",
  SCROLL_DEPTH: "scroll_depth",
  EXTERNAL_LINK_CLICK: "external_link_click",
  DOWNLOAD: "download",
  SEARCH_QUERY: "search_query",
} as const;

export const BUSINESS_EVENTS = {
  SIGNUP_STARTED: "signup_started",
  SIGNUP_COMPLETED: "signup_completed",
  ONBOARDING_COMPLETED: "onboarding_completed",
  BETA_APPLICATION_SUBMITTED: "beta_application_submitted",
  BETA_APPLICATION_ACCEPTED: "beta_application_accepted",
  STUDENT_VALIDATED: "student_validated",
  SUBSCRIPTION_CREATED: "subscription_created",
  SUBSCRIPTION_UPGRADED: "subscription_upgraded",
  SUBSCRIPTION_DOWNGRADED: "subscription_downgraded",
  SUBSCRIPTION_CANCELLED: "subscription_cancelled",
  SUBSCRIPTION_RENEWED: "subscription_renewed",
  PAYMENT_INITIATED: "payment_initiated",
  PAYMENT_COMPLETED: "payment_completed",
  PAYMENT_FAILED: "payment_failed",
  PACK_PURCHASED: "pack_purchased",
  AFFAIRE_CREATED: "affaire_created",
  DOCUMENT_CREATED: "document_created",
  DOCUMENT_VALIDATED: "document_validated",
  CR_CREATED: "cr_created",
  CR_FINALIZED: "cr_finalized",
} as const;

export const IA_EVENTS = {
  AI_CALL: "ai_call",
  AI_QUOTA_WARNING: "ai_quota_warning",
  AI_QUOTA_EXCEEDED: "ai_quota_exceeded",
  AI_PACK_PURCHASED: "ai_pack_purchased",
  SEARCH_RESULT_CLICKED: "search_result_clicked",
  SYNTHESIS_GENERATED: "synthesis_generated",
  CR_STRUCTURED_AI: "cr_structured_ai",
} as const;

export const AUTH_EVENTS = {
  LOGIN_ATTEMPTED: "login_attempted",
  LOGIN_SUCCEEDED: "login_succeeded",
  LOGIN_FAILED: "login_failed",
  LOGOUT: "logout",
  PASSWORD_RESET_REQUESTED: "password_reset_requested",
} as const;

export const ADMIN_EVENTS = {
  ADMIN_LOGIN: "admin_login",
  ADMIN_ACTION_PERFORMED: "admin_action_performed",
  PAYMENT_VALIDATED: "admin_payment_validated",
  SUBSCRIPTION_MODIFIED: "admin_subscription_modified",
} as const;

export type AnalyticsEventName =
  | (typeof WEB_EVENTS)[keyof typeof WEB_EVENTS]
  | (typeof BUSINESS_EVENTS)[keyof typeof BUSINESS_EVENTS]
  | (typeof IA_EVENTS)[keyof typeof IA_EVENTS]
  | (typeof AUTH_EVENTS)[keyof typeof AUTH_EVENTS]
  | (typeof ADMIN_EVENTS)[keyof typeof ADMIN_EVENTS]
  | string;

export type AnalyticsEventCategory =
  | "web"
  | "business"
  | "auth"
  | "ia"
  | "payment"
  | "admin";

const EVENT_CATEGORIES: Record<string, AnalyticsEventCategory> = {
  page_view: "web",
  page_exit: "web",
  click_cta: "web",
  form_start: "web",
  form_submit: "web",
  scroll_depth: "web",
  external_link_click: "web",
  download: "web",
  search_query: "web",
  login_attempted: "auth",
  login_succeeded: "auth",
  login_failed: "auth",
  logout: "auth",
  password_reset_requested: "auth",
  ai_call: "ia",
  ai_quota_warning: "ia",
  ai_quota_exceeded: "ia",
  ai_pack_purchased: "ia",
  search_result_clicked: "ia",
  synthesis_generated: "ia",
  cr_structured_ai: "ia",
  payment_initiated: "payment",
  payment_completed: "payment",
  payment_failed: "payment",
  pack_purchased: "payment",
  admin_login: "admin",
  admin_action_performed: "admin",
  admin_payment_validated: "admin",
  admin_subscription_modified: "admin",
};

export function categorizeEvent(eventName: string): AnalyticsEventCategory {
  if (EVENT_CATEGORIES[eventName]) return EVENT_CATEGORIES[eventName]!;
  if (eventName.startsWith("admin_")) return "admin";
  if (
    eventName.includes("payment") ||
    eventName.includes("subscription") ||
    eventName.includes("pack")
  ) {
    return eventName.includes("payment") ? "payment" : "business";
  }
  if (eventName.startsWith("ai_") || eventName.includes("synthesis")) return "ia";
  if (eventName.includes("login") || eventName.includes("signup")) {
    return eventName.includes("login") ? "auth" : "business";
  }
  return "business";
}

export const BUSINESS_CONVERSION_EVENTS = new Set<string>([
  BUSINESS_EVENTS.SIGNUP_COMPLETED,
  BUSINESS_EVENTS.SUBSCRIPTION_CREATED,
  BUSINESS_EVENTS.PAYMENT_COMPLETED,
  BUSINESS_EVENTS.BETA_APPLICATION_SUBMITTED,
]);
