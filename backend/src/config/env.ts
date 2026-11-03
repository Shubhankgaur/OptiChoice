const port = Number(process.env.PORT ?? 3001);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be a valid TCP port between 1 and 65535.");
}

export const env = {
  port,
  databaseUrl: process.env.DATABASE_URL,
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:8081",
  databasePath: process.env.DATABASE_PATH ?? "./data/optichoice.sqlite",
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:8081",
  resendApiKey: process.env.RESEND_API_KEY,
  resendFrom: process.env.RESEND_FROM,
  serpApiKey: process.env.SERPAPI_API_KEY,
  productSearchCountry: process.env.PRODUCT_SEARCH_COUNTRY ?? "in",
  productSearchLanguage: process.env.PRODUCT_SEARCH_LANGUAGE ?? "en",
  isProduction: process.env.NODE_ENV === "production",
};
