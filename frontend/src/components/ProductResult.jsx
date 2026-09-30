import React from 'react';

const CORE_FIELDS = [
  ['price', 'Price'],
  ['availability', 'Availability'],
  ['brand', 'Brand'],
  ['sku', 'SKU'],
  ['category', 'Category'],
  ['rating', 'Rating'],
  ['reviewCount', 'Reviews'],
];

function displayPrice(product) {
  const hasSymbol = product.priceText && /[$£€¥₹]|\b[A-Z]{3}\b/.test(product.priceText);
  if (hasSymbol) return product.priceText;
  if (product.priceText && product.currency) return `${product.priceText} ${product.currency}`;
  if (product.price && product.currency) return `${product.price} ${product.currency}`;
  return product.priceText || product.price || null;
}

export function downloadProductJson(product, filename) {
  const blob = new Blob([JSON.stringify(product, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

const wordButtonStyle = {
  padding: '0.5rem 1rem',
  fontSize: '0.85rem',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-main)',
};

export default function ProductResult({ product, onDownload, onDownloadWord }) {
  if (!product) return null;

  const price = displayPrice(product);
  const image = product.images && product.images[0];
  const detailEntries = Object.entries(product.details || {});

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem' }}>
        <h4 style={{ margin: 0 }}>{product.sku || product.description || product.details ? 'Product details' : 'Product'}</h4>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {onDownloadWord && (
            <button className="primary" style={wordButtonStyle} onClick={onDownloadWord}>
              Download Word
            </button>
          )}
          <button
            className="primary"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            onClick={onDownload}
          >
            Download JSON
          </button>
        </div>
      </div>

      {!(product.name || price) && (
        <p className="field-hint">
          No product fields were found. Turn on Force Render for JavaScript shops, or add a CSS selector for the missing field.
        </p>
      )}

      <div className={image ? 'product-layout' : undefined}>
        {image && (
          <a href={image} target="_blank" rel="noreferrer">
            <img src={image} alt={product.name || 'Product'} className="product-image" />
          </a>
        )}
        <div>
          {product.name && <h3 className="product-name">{product.name}</h3>}
          <dl className="product-fields">
            {price && (
              <>
                <dt>Price</dt>
                <dd>{price}</dd>
              </>
            )}
            {CORE_FIELDS.filter(([key]) => key !== 'price' && product[key] && !(key === 'reviewCount' && product.rating)).map(([key, label]) => (
              <React.Fragment key={key}>
                <dt>{label}</dt>
                <dd>{key === 'rating' && product.reviewCount ? `${product[key]} (${product.reviewCount})` : product[key]}</dd>
              </React.Fragment>
            ))}
          </dl>
          {product.description && <p className="product-description">{product.description}</p>}
        </div>
      </div>

      {detailEntries.length > 0 && (
        <div className="product-details">
          <h4>Specifications</h4>
          {detailEntries.map(([label, value]) => (
            <div key={label} className="spec-row">
              <span>{label}</span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
