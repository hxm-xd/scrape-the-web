const cheerio = require('cheerio');

const TRACKING_PARAMS = new Set([
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
  'gclid', 'fbclid', 'mc_cid', 'mc_eid', 'ref', 'srsltid',
  'pr_prod_strat', 'pr_rec_id', 'pr_rec_pid', 'pr_ref_pid', 'pr_seq',
]);

const PAGE_PARAMS = new Set(['page', 'paged', 'p']);

const FILTER_PARAMS = new Set([
  'page', 'paged', 'p', 'brand', 'sort', 'sort_by', 'orderby', 'order', 'filter', 'q',
]);

function typeName(value) {
  return String(value || '').toLowerCase().split('/').pop();
}

function isProductUrl(value) {
  try {
    const url = new URL(value);
    return /\/products\/[^/]+|\/product\/[^/]+|\/item\/[^/]+|\/dp\/[^/]+|\/gp\/product\/[^/]+/i.test(url.pathname);
  } catch {
    return false;
  }
}

function isListingUrl(value) {
  try {
    const url = new URL(value);
    if (isProductUrl(url.href)) return false;
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (/\/collections(\/[^/]+)?$/i.test(path)) return true;
    if (/\/(category|categories|collection|catalog)(\/[^/]+)?$/i.test(path)) return true;
    if (/^\/(shop|store)$/i.test(path)) return true;
    if (path === '/') return false;
    const keys = [...url.searchParams.keys()].map((key) => key.toLowerCase());
    return keys.some((key) => FILTER_PARAMS.has(key) || key.startsWith('filter'));
  } catch {
    return false;
  }
}

function isPaginationUrl(value, currentUrl) {
  try {
    const next = new URL(value);
    const current = new URL(currentUrl);
    if (isProductUrl(next.href)) return false;
    const nextPath = (next.pathname.replace(/\/+$/, '') || '/').toLowerCase();
    const currentPath = (current.pathname.replace(/\/+$/, '') || '/').toLowerCase();
    if (nextPath !== currentPath) return false;

    const nextPage = [...PAGE_PARAMS].map((key) => next.searchParams.get(key)).find((page) => page && page !== '1');
    if (!nextPage) return false;

    const keys = new Set(
      [...next.searchParams.keys(), ...current.searchParams.keys()].map((key) => key.toLowerCase())
    );
    for (const key of keys) {
      if (PAGE_PARAMS.has(key)) continue;
      if ((next.searchParams.get(key) || '') !== (current.searchParams.get(key) || '')) return false;
    }
    return true;
  } catch {
    return false;
  }
}

function identityUrl(value) {
  const url = new URL(value);
  url.hash = '';
  let path = decodeURIComponent(url.pathname);
  const product = path.match(/\/products\/([^/]+)/i);
  if (product) {
    path = `/products/${product[1]}`;
    url.search = '';
  } else {
    for (const key of [...url.searchParams.keys()]) {
      const name = key.toLowerCase();
      if (TRACKING_PARAMS.has(name) || name.startsWith('utm_')) url.searchParams.delete(key);
      if (PAGE_PARAMS.has(name) && url.searchParams.get(key) === '1') url.searchParams.delete(key);
    }
    const entries = [...url.searchParams.entries()]
      .map(([key, item]) => [key.toLowerCase(), item])
      .sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]));
    url.search = '';
    entries.forEach(([key, item]) => url.searchParams.append(key, item));
  }
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return `${url.origin.toLowerCase()}${path.toLowerCase()}${url.search}`;
}

function inspectHtml(html) {
  const $ = cheerio.load(html || '');
  let productCount = 0;
  let listing = false;

  $('script[type="application/ld+json"]').each((_, el) => {
    let raw = $(el).text().trim().replace(/^<!--/, '').replace(/-->$/, '').trim();
    if (!raw) return;
    try {
      walk(JSON.parse(raw));
    } catch {
      // Ignore malformed structured data.
    }
  });

  function walk(value) {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (typeof value !== 'object') return;
    const types = Array.isArray(value['@type']) ? value['@type'] : value['@type'] ? [value['@type']] : [];
    types.map(typeName).forEach((name) => {
      if (name === 'product') productCount += 1;
      if (['collectionpage', 'itemlist', 'searchresultspage', 'offercatalog'].includes(name)) listing = true;
    });
    if (value['@graph']) walk(value['@graph']);
  }

  const ogType = ($('meta[property="og:type"]').attr('content') || '').toLowerCase();
  return { productCount, listing, ogProduct: ogType === 'product' };
}

function isCatalogPath(value) {
  try {
    const url = new URL(value);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (/\/products\//i.test(path)) return false;
    if (/\/collections(\/[^/]+)?$/i.test(path)) return true;
    if (/\/(category|categories|collection|catalog)(\/[^/]+)?$/i.test(path)) return true;
    return /^\/(shop|store)$/i.test(path);
  } catch {
    return false;
  }
}

function classifyPage(html, pageUrl) {
  if (isProductUrl(pageUrl)) return 'product';
  const info = inspectHtml(html);
  if (info.productCount === 1 && !info.listing && !isCatalogPath(pageUrl)) return 'product';
  if (isCatalogPath(pageUrl) || isListingUrl(pageUrl) || info.listing || info.productCount > 1) return 'listing';
  if (info.ogProduct) return 'product';
  return 'other';
}

function contentRoot($) {
  const root = $('main, [role="main"], #MainContent').first();
  return root.length ? root : null;
}

function collectLinks($, root, pageUrl) {
  const found = new Set();
  const base = new URL(pageUrl);
  const add = (href) => {
    if (!href || href.startsWith('#') || /^(mailto|tel|javascript):/i.test(href)) return;
    try {
      const absolute = new URL(href, pageUrl);
      if (absolute.hostname !== base.hostname) return;
      if (/\.(pdf|jpe?g|png|gif|webp|zip|css|js)$/i.test(absolute.pathname)) return;
      absolute.hash = '';
      found.add(absolute.href);
    } catch {
      // Ignore malformed hrefs.
    }
  };

  root.find('a[href]').each((_, el) => add($(el).attr('href')));
  $('a[rel="next"][href], link[rel="next"][href]').each((_, el) => add($(el).attr('href')));
  return [...found];
}

const SKIP_PATH = /\/(account|cart|checkout|login|register|search|pages|policies|policy|blogs?|wishlist|customer|challenge|apps|about|contact|faq|help)(\/|$)/i;

function isLikelyProductLink(value) {
  try {
    if (isProductUrl(value) || isListingUrl(value)) return false;
    const url = new URL(value);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (path === '/' || SKIP_PATH.test(path)) return false;
    const keys = [...url.searchParams.keys()].map((key) => key.toLowerCase());
    if (keys.some((key) => FILTER_PARAMS.has(key) || key.startsWith('filter'))) return false;
    return path.split('/').filter(Boolean).length >= 1;
  } catch {
    return false;
  }
}

function isUsefulCatalogLink(url, pageUrl) {
  return isProductUrl(url) || isLikelyProductLink(url) || isListingUrl(url) || isPaginationUrl(url, pageUrl);
}

function urlMatches(url, pattern) {
  const trimmed = String(pattern || '').trim();
  if (!trimmed) return false;
  if (!trimmed.includes('*')) return url.toLowerCase().includes(trimmed.toLowerCase());
  const source = trimmed.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(source, 'i').test(url);
}
function extractCatalogLinks(html, pageUrl) {
  const $ = cheerio.load(html || '');
  const root = contentRoot($);
  const scoped = root ? collectLinks($, root, pageUrl) : [];
  const useful = scoped.filter((url) => isUsefulCatalogLink(url, pageUrl));
  if (useful.length) return useful;
  return collectLinks($, $.root(), pageUrl).filter((url) => isUsefulCatalogLink(url, pageUrl));
}

function nextCrawlDepth({ url, currentUrl, pageKind, depth, maxDepth, mode }) {
  if (mode !== 'product') return depth < maxDepth ? depth + 1 : null;
  const fromCatalog = pageKind === 'listing' || pageKind === 'other';
  if (isProductUrl(url) || (fromCatalog && isLikelyProductLink(url))) {
    if (fromCatalog) return depth;
    return depth < maxDepth ? depth + 1 : null;
  }
  if (isPaginationUrl(url, currentUrl) && (fromCatalog || depth < maxDepth)) return depth;
  if (isListingUrl(url) && depth < maxDepth) return depth + 1;
  return null;
}

module.exports = {
  identityUrl,
  isProductUrl,
  isListingUrl,
  isPaginationUrl,
  classifyPage,
  extractCatalogLinks,
  nextCrawlDepth,
  urlMatches,
  isLikelyProductLink,
};
