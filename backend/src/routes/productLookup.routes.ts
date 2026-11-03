import { Router } from "express";
import { env } from "../config/env.js";
import { createRateLimiter } from "../middleware/rateLimiter.js";

export const productLookupRoutes = Router();

const productSearchLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // 30 queries per 5 min
  message: "Too many product search requests. Please wait a moment before searching again.",
});

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : null;
}

function findSpecification(features: unknown, attributes: unknown, pattern: RegExp): string | null {
  const entries = [
    ...(Array.isArray(features) ? features : []),
    ...(Array.isArray(attributes) ? attributes : []),
  ];
  for (const entry of entries) {
    const item = asRecord(entry);
    const label = typeof item?.title === "string" ? item.title : typeof item?.name === "string" ? item.name : "";
    const value = typeof item?.value === "string" ? item.value : "";
    if (pattern.test(label) && value) return value;
  }
  return null;
}

function parseWeightKg(text: string | null): number | null {
  if (!text) return null;
  const match = text.match(/(\d+(?:\.\d+)?)\s*(kg|kilograms?|g|grams?|lb|lbs|pounds?)/i);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2]!.toLowerCase();
  const kg = unit.startsWith("g") ? value / 1000 : unit.startsWith("lb") || unit.startsWith("pound") ? value * 0.453592 : value;
  return Number.isFinite(kg) && kg > 0 && kg < 20 ? Math.round(kg * 100) / 100 : null;
}

function parseBatteryHours(text: string | null): number | null {
  if (!text || /wh|watt.?hour/i.test(text)) return null;
  const match = text.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h\b)/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 && value <= 100 ? value : null;
}

function findProcessor(features: unknown, attributes: unknown, title: string): string | null {
  const described = findSpecification(features, attributes, /processor|cpu|chipset|chip/i);
  const text = [described, title].filter(Boolean).join(" ");
  const patterns = [
    /\bApple\s+(?:M[1-9](?:\s+(?:Pro|Max|Ultra))?(?:\s+\d{1,2}-core)?)/i,
    /\b(?:Intel\s+)?(?:Core\s+)?Ultra\s+[579]\s+[\w-]+/i,
    /\b(?:Intel\s+)?(?:Core\s+)?i[3579]-?\s?[\w-]+/i,
    /\b(?:Intel\s+)?Core\s+[3579]\s+[\w-]+/i,
    /\b(?:AMD\s+)?Ryzen\s+[3579]\s+[\w-]+/i,
    /\b(?:AMD\s+)?Ryzen\s+AI\s+[3579]\s+[\w-]+/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[0]) return match[0].replace(/\s+/g, " ").trim();
  }
  return null;
}

async function findPerformanceScore(processor: string | null) {
  if (!processor || !env.serpApiKey) return { score: null, label: null, url: null };
  const params = new URLSearchParams({
    engine: "google",
    q: `site:nanoreview.net/en/cpu "${processor}" "Geekbench 6" "Multi-Core"`,
    gl: env.productSearchCountry,
    hl: env.productSearchLanguage,
    api_key: env.serpApiKey,
    num: "5",
  });
  try {
    const upstream = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(8_000) });
    if (!upstream.ok) return { score: null, label: null, url: null };
    const payload = asRecord(await upstream.json());
    const results = Array.isArray(payload?.organic_results) ? payload.organic_results : [];
    for (const result of results) {
      const item = asRecord(result);
      const link = typeof item?.link === "string" ? item.link : "";
      if (!/^https:\/\/nanoreview\.net\/en\/cpu\//i.test(link)) continue;
      const snippet = [item?.title, item?.snippet].filter((value): value is string => typeof value === "string").join(". ");
      const match = snippet.match(/Geekbench\s*6\s*\(?\s*Multi[- ]Core\s*\)?[^\d]{0,30}([\d,]{4,7})/i)
        ?? snippet.match(/([\d,]{4,7})[^.]{0,45}Geekbench\s*6\s*\(?\s*Multi[- ]Core/i);
      const score = match?.[1] ? Number(match[1].replace(/,/g, "")) : NaN;
      if (Number.isFinite(score) && score >= 1000 && score <= 50000) {
        return { score, label: "Geekbench 6 multi-core (CPU estimate)", url: link };
      }
    }
  } catch {
    // Optional lookup: an unavailable benchmark result should not block adding a product.
  }
  return { score: null, label: null, url: null };
}

function manufacturerDomain(title: string): string | null {
  const brand = title.match(/\b(apple|acer|lenovo|asus|dell|hp|hewlett.packard|microsoft|msi|samsung|lg)\b/i)?.[1]?.toLowerCase();
  if (!brand) return null;
  const domains: Record<string, string> = {
    apple: "apple.com", acer: "acer.com", lenovo: "lenovo.com", asus: "asus.com",
    dell: "dell.com", hp: "hp.com", "hewlett.packard": "hp.com", microsoft: "microsoft.com",
    msi: "msi.com", samsung: "samsung.com", lg: "lg.com",
  };
  return domains[brand] ?? null;
}

async function findManufacturerSpecs(title: string) {
  const domain = manufacturerDomain(title);
  if (!domain) return { batteryText: null, batteryUrl: null, weightText: null, weightUrl: null };
  const params = new URLSearchParams({
    engine: "google",
    q: `site:${domain} "${title.slice(0, 140)}" laptop specifications weight battery life`,
    gl: env.productSearchCountry,
    hl: env.productSearchLanguage,
    api_key: env.serpApiKey!,
    num: "8",
  });
  const upstream = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(12_000) });
  if (!upstream.ok) return { batteryText: null, batteryUrl: null, weightText: null, weightUrl: null };
  const payload = asRecord(await upstream.json());
  const results = Array.isArray(payload?.organic_results) ? payload.organic_results : [];
  let batteryText: string | null = null;
  let batteryUrl: string | null = null;
  let weightText: string | null = null;
  let weightUrl: string | null = null;
  for (const result of results) {
    const item = asRecord(result);
    const snippet = [item?.title, item?.snippet].filter((value): value is string => typeof value === "string").join(". ");
    const link = typeof item?.link === "string" && item.link.startsWith("https://") ? item.link : null;
    if (!link) continue;
    if (!batteryText) {
      const match = snippet.match(/(?:battery\s*(?:life|runtime|run time)?[^.]{0,35}?)(\d+(?:\.\d+)?\s*(?:hours?|hrs?|h\b))/i);
      if (match?.[1] && parseBatteryHours(match[1])) { batteryText = match[1]; batteryUrl = link; }
    }
    if (!weightText) {
      const match = snippet.match(/(?:weight|weighs?)[^.]{0,35}?(\d+(?:\.\d+)?\s*(?:kg|kilograms?|g|grams?|lb|lbs|pounds?))/i)
        ?? snippet.match(/(\d+(?:\.\d+)?\s*(?:kg|kilograms?|g|grams?|lb|lbs|pounds?))[^.]{0,25}?(?:weight|weighs?)/i);
      if (match?.[1] && parseWeightKg(match[1])) { weightText = match[1]; weightUrl = link; }
    }
    if (batteryText && weightText) break;
  }
  return { batteryText, batteryUrl, weightText, weightUrl };
}

productLookupRoutes.get("/products/:productId/specifications", productSearchLimiter, async (request, response) => {
  const productId = typeof request.params["productId"] === "string" ? request.params["productId"] : "";
  if (!/^[\w-]{1,180}$/.test(productId)) {
    response.status(400).json({ error: { code: "INVALID_PRODUCT", message: "This product cannot be looked up." } });
    return;
  }
  if (!env.serpApiKey) {
    response.status(503).json({ error: { code: "PRODUCT_SEARCH_NOT_CONFIGURED", message: "Product search is not set up yet. Add a SerpApi key to the backend environment." } });
    return;
  }

  const params = new URLSearchParams({
    engine: "google_product",
    product_id: productId,
    gl: env.productSearchCountry,
    hl: env.productSearchLanguage,
    api_key: env.serpApiKey,
  });
  try {
    const upstream = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(12_000) });
    const payload = await upstream.json() as Record<string, unknown>;
    if (!upstream.ok || payload.error) {
      response.status(502).json({ error: { code: "PRODUCT_DETAILS_FAILED", message: "Could not retrieve specifications for this listing." } });
      return;
    }
    const title = typeof request.query.title === "string" ? request.query.title.trim().slice(0, 180) : "";
    const product = asRecord(payload.product_results);
    const about = asRecord(product?.about_the_product);
    const features = about?.features;
    const attributes = product?.product_attributes;
    const processor = findProcessor(features, attributes, title);
    let batteryText = findSpecification(features, attributes, /battery\s*(life|runtime|run time)|maximum battery run time/i);
    let weightText = findSpecification(features, attributes, /weight|mass/i);
    let batteryUrl = typeof about?.link === "string" && /^https?:\/\//i.test(about.link) ? about.link : null;
    let weightUrl = batteryUrl;
    if ((!parseBatteryHours(batteryText) || !parseWeightKg(weightText)) && title) {
      const fallback = await findManufacturerSpecs(title);
      if (!parseBatteryHours(batteryText) && fallback.batteryText) { batteryText = fallback.batteryText; batteryUrl = fallback.batteryUrl; }
      if (!parseWeightKg(weightText) && fallback.weightText) { weightText = fallback.weightText; weightUrl = fallback.weightUrl; }
    }
    const performance = await findPerformanceScore(processor);
    response.json({
      batteryHours: parseBatteryHours(batteryText),
      batteryLabel: batteryText,
      batterySourceUrl: batteryUrl,
      weightKg: parseWeightKg(weightText),
      weightLabel: weightText,
      weightSourceUrl: weightUrl,
      performanceScore: performance.score,
      performanceLabel: performance.label,
      performanceSourceUrl: performance.url,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Product specification request failed:", error);
    response.status(502).json({ error: { code: "PRODUCT_DETAILS_UNAVAILABLE", message: "Specifications are temporarily unavailable." } });
  }
});

productLookupRoutes.get("/products/search", productSearchLimiter, async (request, response) => {
  const query = typeof request.query.q === "string" ? request.query.q.trim() : "";
  if (query.length < 2 || query.length > 120) {
    response.status(400).json({ error: { code: "INVALID_QUERY", message: "Enter a product search between 2 and 120 characters." } });
    return;
  }
  if (!env.serpApiKey) {
    response.status(503).json({ error: { code: "PRODUCT_SEARCH_NOT_CONFIGURED", message: "Product search is not set up yet. Add a SerpApi key to the backend environment." } });
    return;
  }

  const params = new URLSearchParams({
    engine: "google_shopping",
    q: query,
    gl: env.productSearchCountry,
    hl: env.productSearchLanguage,
    api_key: env.serpApiKey,
  });

  try {
    const upstream = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(12_000) });
    const payload: unknown = await upstream.json();
    if (!upstream.ok || !payload || typeof payload !== "object") {
      response.status(502).json({ error: { code: "PRODUCT_SEARCH_FAILED", message: "The product search provider could not complete this search. Try again shortly." } });
      return;
    }

    const body = payload as { error?: string; shopping_results?: unknown[] };
    if (body.error) {
      console.error("Product search provider error:", body.error);
      response.status(502).json({ error: { code: "PRODUCT_SEARCH_FAILED", message: "The product search provider rejected the request. Check the backend API key and try again." } });
      return;
    }

    const products = (body.shopping_results ?? []).flatMap((entry, index) => {
      if (!entry || typeof entry !== "object") return [];
      const item = entry as Record<string, unknown>;
      const title = typeof item.title === "string" ? item.title.trim() : "";
      const sourceUrl = typeof item.product_link === "string" ? item.product_link : "";
      if (!title || !/^https?:\/\//i.test(sourceUrl)) return [];
      const price = typeof item.extracted_price === "number" && Number.isFinite(item.extracted_price) ? item.extracted_price : null;
      return [{
        id: typeof item.product_id === "string" ? item.product_id : `${index}-${title.slice(0, 30)}`,
        productId: typeof item.product_id === "string" ? item.product_id : null,
        title,
        source: typeof item.source === "string" ? item.source : "Retailer",
        sourceUrl,
        price,
        priceLabel: typeof item.price === "string" ? item.price : null,
        imageUrl: typeof item.thumbnail === "string" ? item.thumbnail : null,
      }];
    }).slice(0, 8);

    response.json({ products, fetchedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Product search request failed:", error);
    response.status(502).json({ error: { code: "PRODUCT_SEARCH_UNAVAILABLE", message: "Product search is temporarily unavailable. Check your connection and try again." } });
  }
});
