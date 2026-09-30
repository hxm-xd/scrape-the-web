import React from 'react';

export const EMPTY_SELECTORS = {
  name: '',
  price: '',
  sku: '',
  brand: '',
  availability: '',
  image: '',
  description: '',
};

const FIELDS = [
  { key: 'name', label: 'Name', placeholder: 'h1.product-title' },
  { key: 'price', label: 'Price', placeholder: '.price' },
  { key: 'sku', label: 'SKU', placeholder: '.sku' },
  { key: 'brand', label: 'Brand', placeholder: '.brand' },
  { key: 'availability', label: 'Availability', placeholder: '.stock' },
  { key: 'image', label: 'Image', placeholder: 'img.product-image' },
  { key: 'description', label: 'Description', placeholder: '.description' },
];

export function compactSelectors(selectors, allowedKeys) {
  const out = {};
  Object.entries(selectors || {}).forEach(([key, value]) => {
    if (allowedKeys && !allowedKeys.includes(key)) return;
    if (value && value.trim()) out[key] = value.trim();
  });
  return Object.keys(out).length ? out : undefined;
}

export default function ProductSelectors({ selectors, onChange, nameAndPriceOnly = false }) {
  const fields = nameAndPriceOnly ? FIELDS.filter((field) => field.key === 'name' || field.key === 'price') : FIELDS;

  return (
    <div className="form-group full-width">
      <label>
        Field selectors
        <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.8em' }}> optional</span>
      </label>
      <p className="field-hint">
        {nameAndPriceOnly
          ? 'Name and price are read from the page automatically. Add a CSS selector only if one of them is missed.'
          : 'Name, price, SKU, and availability are read from the page automatically. Add a CSS selector only for a field the page does not expose.'}
      </p>
      <div className="selector-grid">
        {fields.map((field) => (
          <div key={field.key} className={field.key === 'description' ? 'span-2' : undefined}>
            <label htmlFor={`selector-${field.key}`}>{field.label}</label>
            <input
              id={`selector-${field.key}`}
              type="text"
              placeholder={field.placeholder}
              value={selectors[field.key] || ''}
              onChange={(e) => onChange({ ...selectors, [field.key]: e.target.value })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
