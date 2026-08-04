/**
 * BuySell B2B Analytics & Conversion Funnel Event Tracker
 */

export type ConversionEvent =
  | "view_product"
  | "search_marketplace"
  | "initiate_rfq"
  | "send_message"
  | "start_escrow"
  | "submit_feedback"
  | "select_currency"
  | "change_language";

export interface EventPayload {
  category?: string;
  label?: string;
  value?: number;
  [key: string]: unknown;
}

/**
 * Tracks custom product and funnel conversion events
 */
export function trackEvent(event: ConversionEvent, payload?: EventPayload) {
  if (typeof window === "undefined") return;

  const eventData = {
    event,
    timestamp: new Date().toISOString(),
    path: window.location.pathname,
    ...payload,
  };

  // 1. Console logging in development mode
  if (process.env.NODE_ENV === "development") {
    console.log("[BuySell Analytics]", eventData);
  }

  // 2. Push to window.dataLayer if Google Tag Manager / GA4 is present
  if (Array.isArray((window as unknown as { dataLayer: unknown[] }).dataLayer)) {
    (window as unknown as { dataLayer: unknown[] }).dataLayer.push(eventData);
  }

  // 3. Dispatch local browser custom event for in-app tracking
  window.dispatchEvent(new CustomEvent("buysell_analytics_event", { detail: eventData }));
}
