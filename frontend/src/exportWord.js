import {
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { saveAs } from 'file-saver';

const EXTRA_FIELDS = [
  ['availability', 'Availability'],
  ['brand', 'Brand'],
  ['sku', 'SKU'],
  ['category', 'Category'],
  ['rating', 'Rating'],
  ['reviewCount', 'Reviews'],
];

const border = { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' };
const borders = { top: border, bottom: border, left: border, right: border };

function displayPrice(product) {
  const hasSymbol = product.priceText && /[$£€¥₹]|\b[A-Z]{3}\b/.test(product.priceText);
  if (hasSymbol) return product.priceText;
  if (product.priceText && product.currency) return `${product.priceText} ${product.currency}`;
  if (product.price && product.currency) return `${product.price} ${product.currency}`;
  return product.priceText || product.price || '';
}

function paragraph(text, options = {}) {
  return new Paragraph({
    spacing: { after: 160 },
    ...options,
    children: options.children || [new TextRun(String(text ?? ''))],
  });
}

function cell(text, width, bold = false) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        children: [new TextRun({ text: String(text ?? ''), bold })],
      }),
    ],
  });
}

function fieldValue(product, key) {
  if (key === 'price') return displayPrice(product);
  if (key === 'rating' && product.rating && product.reviewCount) {
    return `${product.rating} (${product.reviewCount})`;
  }
  return product[key] || '';
}

async function saveDoc(children, filename) {
  const doc = new Document({
    sections: [{ children: children.length ? children : [new Paragraph('')] }],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}

async function exportDoc(children, filename) {
  try {
    await saveDoc(children, filename);
  } catch (error) {
    alert(`Failed to create Word file: ${error.message}`);
  }
}

export function saveProductWord(product, filename) {
  if (!product) return;
  const children = [
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      text: product.name || 'Product',
    }),
  ];

  const price = displayPrice(product);
  if (price) {
    children.push(paragraph('', {
      children: [
        new TextRun({ text: 'Price: ', bold: true }),
        new TextRun(price),
      ],
    }));
  }

  EXTRA_FIELDS.forEach(([key, label]) => {
    if (key === 'reviewCount' && product.rating) return;
    const value = fieldValue(product, key);
    if (!value) return;
    children.push(paragraph('', {
      children: [
        new TextRun({ text: `${label}: `, bold: true }),
        new TextRun(String(value)),
      ],
    }));
  });

  if (product.description) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: 'Description' }));
    children.push(paragraph(product.description));
  }

  const details = Object.entries(product.details || {});
  if (details.length) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_2, text: 'Specifications' }));
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: details.map(([label, value]) => new TableRow({
        children: [cell(label, 35, true), cell(value, 65)],
      })),
    }));
  }

  if (product.url) {
    children.push(paragraph('', {
      children: [
        new TextRun({ text: 'Page: ', bold: true }),
        new TextRun(product.url),
      ],
    }));
  }

  return exportDoc(children, filename);
}

export function saveProductsWord(products, filename, title) {
  const columns = [
    ['name', 'Name'],
    ['price', 'Price'],
  ];
  EXTRA_FIELDS.forEach((column) => {
    if (products.some((product) => fieldValue(product, column[0]))) columns.push(column);
  });
  if (products.some((product) => product.url)) columns.push(['url', 'Page']);

  const width = Math.floor(100 / columns.length);
  const header = new TableRow({
    tableHeader: true,
    children: columns.map(([key, label]) => cell(label, key === columns[0][0] ? 100 - width * (columns.length - 1) : width, true)),
  });
  const rows = products.map((product) => new TableRow({
    children: columns.map(([key], index) => cell(
      fieldValue(product, key),
      index === 0 ? 100 - width * (columns.length - 1) : width
    )),
  }));

  return exportDoc([
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      text: title || 'Products',
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [header, ...rows],
    }),
  ], filename);
}

function markdownParagraph(line) {
  const heading = line.match(/^(#{1,3})\s+(.*)$/);
  if (heading) {
    const levels = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3];
    return new Paragraph({
      heading: levels[heading[1].length - 1],
      text: heading[2],
    });
  }

  const text = line
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    .replace(/`([^`]+)`/g, '$1');

  return paragraph(text);
}

export function saveMarkdownWord(markdown, filename, title) {
  const children = [];
  if (title) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, text: title }));
  }
  String(markdown || '').split(/\r?\n/).forEach((line) => {
    if (!line.trim() || line.trim() === '---') return;
    children.push(markdownParagraph(line));
  });
  return exportDoc(children, filename);
}
