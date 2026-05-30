import Script from "next/script";
import { Suspense } from "react";

import { GooglePageviews } from "@/components/analytics/google-pageviews";
import {
  getGoogleAnalyticsConfig,
  getGoogleTagManagerConfig,
  getSiteAnalyticsMode,
} from "@/lib/analytics/site-tracking";

/**
 * Google Tag Manager (prioritaire) ou Google Analytics 4 (gtag).
 *
 * - GTM : NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX — configurez GA4 dans le conteneur GTM
 * - GA4 direct : NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXX (si pas de GTM)
 *
 * /app, /admin, /api et /print sont exclus du suivi des pageviews SPA.
 */
export function SiteAnalytics() {
  const mode = getSiteAnalyticsMode();
  if (!mode) return null;

  if (mode === "gtm") {
    const gtm = getGoogleTagManagerConfig();
    if (!gtm) return null;

    return (
      <>
        <Script
          id="gtm-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtm.containerId}');`,
          }}
        />
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${gtm.containerId}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
            title="Google Tag Manager"
          />
        </noscript>
        <Suspense fallback={null}>
          <GooglePageviews mode="gtm" />
        </Suspense>
      </>
    );
  }

  const ga = getGoogleAnalyticsConfig();
  if (!ga) return null;

  return (
    <>
      <Script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${ga.measurementId}`}
        strategy="afterInteractive"
      />
      <Script
        id="ga4-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga.measurementId}',{send_page_view:true});`,
        }}
      />
      <Suspense fallback={null}>
        <GooglePageviews mode="ga4" measurementId={ga.measurementId} />
      </Suspense>
    </>
  );
}
