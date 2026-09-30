const cheerio = require('cheerio');

const CURRENCY_SYMBOLS = {
  '$': 'USD',
  '£': 'GBP',
  '€': 'EUR',
  '¥': 'JPY',
  '₹': 'INR',
};

function cleanText(value, max = 500) {
  if (value == null) return null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text) return null;
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

function toAbsolute(href, base) {
  if (!href || href.startsWith('data:')) return null;
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function parsePrice(value) {
  const priceText = cleanText(value, 80);
  if (!priceText) return { price: null, currency: null, priceText: null };

  let currency = null;
  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (priceText.includes(symbol)) {
      currency = code;
      break;
    }
  }
  const codeMatch = priceText.match(/\b(USD|EUR|GBP|INR|CAD|AUD|JPY)\b/i);
  if (codeMatch) currency = codeMatch[1].toUpperCase();

  const num = priceText.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})|\d+(?:[.,]\d{1,2})?)/);
  if (!num) return { price: null, currency, priceText };

  let n = num[1];
  if (n.includes(',') && n.includes('.')) {
    if (n.lastIndexOf(',') > n.lastIndexOf('.')) n = n.replace(/\./g, '').replace(',', '.');
    else n = n.replace(/,/g, '');
  } else if (n.includes(',') && /,\d{1,2}$/.test(n)) {
    n = n.replace(',', '.');
  } else {
    n = n.replace(/,/g, '');
  }

  return { price: n, currency, priceText };
}

function normalizeAvailability(value) {
  const text = cleanText(value, 80);
  if (!text) return null;
  const token = text.split('/').pop().replace(/[_-]+/g, ' ');
  const lower = token.toLowerCase();
  if (lower.includes('in stock') || lower.replace(/\s/g, '').includes('instock')) return 'In stock';
  if (lower.includes('out of stock') || lower.includes('sold out') || lower.replace(/\s/g, '').includes('outofstock')) {
    return 'Out of stock';
  }
  if (lower.includes('pre order') || lower.includes('preorder')) return 'Pre-order';
  return cleanText(token.replace(/([a-z])([A-Z])/g, '$1 $2'), 80);
}

function asName(value) {
  if (!value) return null;
  if (typeof value === 'string') return cleanText(value, 200);
  if (Array.isArray(value)) return asName(value[0]);
  if (typeof value === 'object') return cleanText(value.name || value['@value'], 200);
  return null;
}

function asImages(value, base) {
  if (!value) return [];
  if (typeof value === 'string') {
    const abs = toAbsolute(value, base);
    return abs ? [abs] : [];
  }
  if (Array.isArray(value)) return value.flatMap((item) => asImages(item, base));
  if (typeof value === 'object') {
    return asImages(value.url || value.contentUrl || value['@id'], base);
  }
  return [];
}

function isType(node, typeName) {
  const type = node && node['@type'];
  if (!type) return false;
  const types = Array.isArray(type) ? type : [type];
  return types.some((item) => String(item).toLowerCase().endsWith(typeName.toLowerCase()));
}

function flattenJsonLd(value, out) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((item) => flattenJsonLd(item, out));
    return;
  }
  if (typeof value === 'object') {
    out.push(value);
    if (value['@graph']) flattenJsonLd(value['@graph'], out);
  }
}

function readJsonLd($) {
  const nodes = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    let raw = $(el).text().trim().replace(/^<!--/, '').replace(/-->$/, '').trim();
    if (!raw) return;
    try {
      flattenJsonLd(JSON.parse(raw), nodes);
    } catch {
      // Ignore malformed blocks and keep looking.
    }
  });
  return nodes.find((node) => isType(node, 'Product')) || null;
}

function firstOffer(offers) {
  if (!offers) return null;
  if (Array.isArray(offers)) return offers.find(Boolean) || null;
  return offers;
}

function extractJsonLd($, pageUrl) {
  const node = readJsonLd($);
  if (!node) return {};

  const offer = firstOffer(node.offers);
  const parsedPrice = parsePrice(offer && (offer.price ?? offer.lowPrice));
  const rating = node.aggregateRating || {};
  const images = asImages(node.image, pageUrl);

  return {
    name: asName(node.name),
    price: parsedPrice.price,
    priceText: parsedPrice.priceText,
    currency: cleanText(offer && offer.priceCurrency, 12) || parsedPrice.currency,
    availability: normalizeAvailability(offer && offer.availability),
    brand: asName(node.brand),
    sku: cleanText(node.sku || node.productID || node.gtin13 || node.gtin || node.mpn, 80),
    description: cleanText(node.description, 1500),
    images,
    rating: cleanText(rating.ratingValue, 20),
    reviewCount: cleanText(rating.reviewCount || rating.ratingCount, 20),
    category: asName(node.category),
  };
}

function metaContent($, selector) {
  return cleanText($(selector).attr('content'), 1500);
}

function extractOpenGraph($, pageUrl) {
  const price = parsePrice(
    $('meta[property="product:price:amount"]').attr('content')
    || $('meta[property="og:price:amount"]').attr('content')
  );
  const image = toAbsolute($('meta[property="og:image"]').attr('content'), pageUrl);

  return {
    name: metaContent($, 'meta[property="og:title"]'),
    description: metaContent($, 'meta[property="og:description"]'),
    price: price.price,
    priceText: price.priceText,
    currency: metaContent($, 'meta[property="product:price:currency"]') || price.currency,
    availability: normalizeAvailability($('meta[property="product:availability"]').attr('content')),
    brand: metaContent($, 'meta[property="product:brand"]'),
    sku: metaContent($, 'meta[property="product:retailer_item_id"]'),
    images: image ? [image] : [],
  };
}

function propValue($root, name) {
  const el = $root.find(`[itemprop="${name}"]`).first();
  if (!el.length) return null;
  return el.attr('content') || el.attr('datetime') || el.text();
}

function extractMicrodata($, pageUrl) {
  const root = $('[itemtype*="schema.org/Product"]').first();
  if (!root.length) return {};

  const price = parsePrice(propValue(root, 'price'));
  const image = toAbsolute(propValue(root, 'image') || root.find('[itemprop="image"]').attr('src'), pageUrl);

  return {
    name: cleanText(propValue(root, 'name'), 200),
    description: cleanText(propValue(root, 'description'), 1500),
    price: price.price,
    priceText: price.priceText,
    currency: cleanText(propValue(root, 'priceCurrency'), 12) || price.currency,
    availability: normalizeAvailability(propValue(root, 'availability')),
    brand: cleanText(propValue(root, 'brand'), 200),
    sku: cleanText(propValue(root, 'sku') || propValue(root, 'productID'), 80),
    images: image ? [image] : [],
    rating: cleanText(propValue(root, 'ratingValue'), 20),
    reviewCount: cleanText(propValue(root, 'reviewCount') || propValue(root, 'ratingCount'), 20),
  };
}

function findPrice($) {
  const nodes = $('[itemprop="price"], [class*="price" i], [id*="price" i]').toArray();
  for (const el of nodes) {
    const text = $(el).attr('content') || $(el).text();
    if (!text || text.length > 40) continue;
    const parsed = parsePrice(text);
    if (parsed.price) return parsed;
  }
  return null;
}

function findDescription($) {
  const item = cleanText($('[itemprop="description"]').first().attr('content') || $('[itemprop="description"]').first().text(), 1500);
  if (item) return item;

  const block = $('[id*="description" i], [class*="description" i]').first();
  if (block.length) {
    let text = cleanText(block.text(), 1500);
    if (!text || text.length < 40) {
      text = cleanText(block.next('p').text() || block.parent().find('p').first().text(), 1500);
    }
    if (text && text.length >= 40) return text;
  }

  return metaContent($, 'meta[name="description"]');
}

function findImages($, pageUrl) {
  const found = [];
  const push = (href) => {
    const abs = toAbsolute(href, pageUrl);
    if (abs && !found.includes(abs)) found.push(abs);
  };

  push($('meta[property="og:image"]').attr('content'));
  $('#product_gallery img, .product-gallery img, .product-image img, img.product-image, img[itemprop="image"], .product_main img, .thumbnail img').each((_, el) => {
    if (found.length >= 6) return;
    const src = $(el).attr('src') || '';
    const lazy = $(el).attr('data-src') || $(el).attr('data-lazy-src');
    if (!src || src.startsWith('data:') || /placeholder|blank|spacer/i.test(src)) push(lazy);
    else push(src);
  });
  return found.slice(0, 6);
}

function extractHeuristics($, pageUrl) {
  const price = findPrice($);
  const availability = normalizeAvailability(
    $('[itemprop="availability"], [class*="availability" i], [class*="stock" i]').first().text()
  );

  return {
    name: cleanText($('h1').first().text(), 200),
    description: findDescription($),
    price: price && price.price,
    priceText: price && price.priceText,
    currency: price && price.currency,
    availability,
    images: findImages($, pageUrl),
  };
}

function extractSpecTables($) {
  const details = {};
  const add = (key, value) => {
    const label = cleanText(key, 60);
    const text = cleanText(value, 300);
    if (!label || !text || details[label]) return;
    if (Object.keys(details).length >= 25) return;
    details[label] = text;
  };

  $('table tr').each((_, row) => {
    const label = $(row).find('th').first();
    const value = $(row).find('td').first();
    if (!label.length || !value.length) return;
    add(label.text(), value.text());
  });

  $('dl').each((_, list) => {
    $(list).find('dt').each((__, term) => {
      add($(term).text(), $(term).next('dd').text());
    });
  });

  return details;
}

function specValue(details, names) {
  const wanted = names.map((name) => name.toLowerCase());
  for (const [key, value] of Object.entries(details)) {
    if (wanted.includes(key.toLowerCase())) return value;
  }
  return null;
}

function applySelectors($, product, selectors, pageUrl) {
  if (!selectors) return;

  const read = (selector) => {
    if (!selector || !String(selector).trim()) return null;
    try {
      const el = $(selector).first();
      if (!el.length) return null;
      return el.attr('content') || el.text();
    } catch {
      return null;
    }
  };

  const assignText = (field, selector, max) => {
    const text = cleanText(read(selector), max);
    if (text) product[field] = text;
  };

  assignText('name', selectors.name, 200);
  assignText('brand', selectors.brand, 200);
  assignText('sku', selectors.sku, 80);
  assignText('description', selectors.description, 1500);
  assignText('category', selectors.category, 120);
  assignText('rating', selectors.rating, 20);
  assignText('reviewCount', selectors.reviewCount, 20);

  if (selectors.availability) {
    const availability = normalizeAvailability(read(selectors.availability));
    if (availability) product.availability = availability;
  }

  if (selectors.price) {
    const parsed = parsePrice(read(selectors.price));
    if (parsed.price) product.price = parsed.price;
    if (parsed.priceText) product.priceText = parsed.priceText;
    if (parsed.currency) product.currency = parsed.currency;
  }

  if (selectors.currency) {
    const currency = cleanText(read(selectors.currency), 12);
    if (currency) product.currency = currency;
  }

  if (selectors.image) {
    try {
      const images = [];
      $(selectors.image).each((_, el) => {
        if (images.length >= 6) return;
        const node = $(el);
        const href = node.attr('src') || node.attr('data-src') || node.attr('content') || node.find('img').attr('src');
        const abs = toAbsolute(href, pageUrl);
        if (abs && !images.includes(abs)) images.push(abs);
      });
      if (images.length) product.images = images;
    } catch {
      // Ignore an invalid image selector.
    }
  }
}

function fill(target, source) {
  if (!source) return;
  for (const [key, value] of Object.entries(source)) {
    if (value == null || value === '') continue;
    if (Array.isArray(value) && value.length === 0) continue;
    const current = target[key];
    if (current == null || current === '' || (Array.isArray(current) && current.length === 0)) {
      target[key] = value;
    }
  }
}

function formatAmount(amount, currency) {
  const number = Number(String(amount).replace(/,/g, ''));
  if (!Number.isFinite(number)) return amount;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Number.isInteger(number) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(number);
  if (currency === 'LKR') return `Rs ${formatted}`;
  if (currency) return `${currency} ${formatted}`;
  return formatted;
}

function formatPrice(product) {
  if (!product) return null;
  const hasSymbol = product.priceText && /[$£€¥₹]|\bRs\b|\b[A-Z]{3}\b/.test(product.priceText);
  if (hasSymbol) return product.priceText;
  if (product.price && product.currency) return formatAmount(product.price, product.currency);
  if (product.priceText && product.currency) return `${product.priceText} ${product.currency}`;
  return product.priceText || product.price || null;
}

function shapeProduct(product, output) {
  if (!product || output !== 'name_price') return product;
  const shaped = {};
  if (product.name) shaped.name = product.name;
  const price = formatPrice(product);
  if (price) shaped.price = price;
  return shaped;
}

function extractProduct(html, pageUrl, selectors = {}) {
  const $ = cheerio.load(html || '');
  const product = {
    name: null,
    price: null,
    priceText: null,
    currency: null,
    availability: null,
    brand: null,
    sku: null,
    description: null,
    images: [],
    rating: null,
    reviewCount: null,
    category: null,
    url: pageUrl,
    details: {},
  };

  const details = extractSpecTables($);
  product.details = details;

  // Earlier sources win. JSON-LD is preferred, then meta tags, then visible page text.
  fill(product, extractJsonLd($, pageUrl));
  fill(product, extractOpenGraph($, pageUrl));
  fill(product, extractMicrodata($, pageUrl));
  fill(product, extractHeuristics($, pageUrl));

  if (!product.sku) product.sku = specValue(details, ['sku', 'upc', 'isbn', 'gtin', 'mpn']);
  if (!product.brand) product.brand = specValue(details, ['brand', 'manufacturer']);
  if (!product.availability) product.availability = normalizeAvailability(specValue(details, ['availability', 'stock']));
  if (!product.reviewCount) product.reviewCount = specValue(details, ['number of reviews', 'reviews', 'review count']);

  applySelectors($, product, selectors, pageUrl);

  product.found = Boolean(product.name || product.price || product.sku);

  return product;
}

module.exports = { extractProduct, parsePrice, shapeProduct };
