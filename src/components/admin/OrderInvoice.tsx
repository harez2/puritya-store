import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface InvoiceOrder {
  id: string;
  order_number: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  status: string;
  payment_status: string | null;
  payment_method: string | null;
  shipping_address: any;
  notes: string | null;
  created_at: string;
}

interface InvoiceItem {
  product_name: string;
  quantity: number;
  price: number;
  size: string | null;
  color: string | null;
}

interface InvoiceSettings {
  store_name: string;
  store_tagline: string;
  currency_symbol?: string;
  logo_url?: string;
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateInvoice(
  order: InvoiceOrder,
  items: InvoiceItem[],
  settings: InvoiceSettings
) {
  const doc = new jsPDF();
  const currency = settings.currency_symbol || 'BDT ';
  const addr = order.shipping_address || {};
  const L = 20; // left margin
  const R = 190; // right edge

  let headerY = 18;

  // Logo or Store name
  let hasLogo = false;
  if (settings.logo_url) {
    const logoBase64 = await loadImageAsBase64(settings.logo_url);
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'PNG', L, 12, 30, 30);
        hasLogo = true;
        headerY = 18;
      } catch {
        // logo failed, continue without
      }
    }
  }

  if (!hasLogo) {
    // Show store name and tagline only when no logo
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(settings.store_name || 'Store', L, headerY + 4);

    if (settings.store_tagline) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text(settings.store_tagline, L, headerY + 10);
    }
  }

  // Invoice title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('INVOICE', R, headerY + 4, { align: 'right' });

  // Order info - right side
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  const infoX = R;
  let infoY = headerY + 12;
  doc.text(`Invoice #: ${order.order_number}`, infoX, infoY, { align: 'right' });
  infoY += 5;
  doc.text(`Date: ${format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}`, infoX, infoY, { align: 'right' });
  infoY += 5;
  doc.text(`Status: ${order.status?.toUpperCase()}`, infoX, infoY, { align: 'right' });
  infoY += 5;
  doc.text(`Payment: ${order.payment_status?.toUpperCase() || 'N/A'}`, infoX, infoY, { align: 'right' });

  // Divider
  const dividerY = Math.max(infoY + 6, settings.logo_url ? 48 : 54);
  doc.setDrawColor(210, 210, 210);
  doc.line(L, dividerY, R, dividerY);

  // Bill To
  let billY = dividerY + 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Bill To:', L, billY);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  billY += 6;
  if (addr.full_name) { doc.text(addr.full_name, L, billY); billY += 5; }
  if (addr.phone) { doc.text(`Phone: ${addr.phone}`, L, billY); billY += 5; }
  const addressParts = [addr.address_line1, addr.address_line2, addr.city, addr.state, addr.postal_code].filter(Boolean);
  if (addressParts.length) {
    const addressText = addressParts.join(', ');
    const lines = doc.splitTextToSize(addressText, 90);
    doc.text(lines, L, billY);
    billY += lines.length * 4.5;
  }
  if (addr.country) { doc.text(addr.country, L, billY); billY += 5; }

  // Payment method - right column
  if (order.payment_method) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(`Payment Method: ${order.payment_method}`, R, dividerY + 14, { align: 'right' });
  }

  // Items table
  const tableY = Math.max(billY + 8, 92);

  const tableBody = items.map(item => {
    const variant = [item.size, item.color].filter(Boolean).join(' / ');
    const name = variant ? `${item.product_name}\n(${variant})` : item.product_name;
    return [
      name,
      `${currency}${Number(item.price).toFixed(0)}`,
      String(item.quantity),
      `${currency}${(item.quantity * Number(item.price)).toFixed(0)}`,
    ];
  });

  autoTable(doc, {
    startY: tableY,
    head: [['Product', 'Unit Price', 'Qty', 'Total']],
    body: tableBody,
    theme: 'striped',
    headStyles: {
      fillColor: [40, 40, 40],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
    columnStyles: {
      0: { cellWidth: 85 },
      1: { halign: 'right', cellWidth: 30 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 35 },
    },
    margin: { left: L, right: 20 },
  });

  // Totals
  const finalY = (doc as any).lastAutoTable?.finalY || tableY + 40;
  let totalsY = finalY + 12;

  const totalsLabelX = 145;
  const totalsValueX = R;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Subtotal:', totalsLabelX, totalsY, { align: 'right' });
  doc.text(`${currency}${Number(order.subtotal).toFixed(0)}`, totalsValueX, totalsY, { align: 'right' });
  totalsY += 7;

  doc.text('Shipping:', totalsLabelX, totalsY, { align: 'right' });
  doc.text(`${currency}${Number(order.shipping_fee).toFixed(0)}`, totalsValueX, totalsY, { align: 'right' });
  totalsY += 3;

  doc.setDrawColor(180, 180, 180);
  doc.line(130, totalsY, R, totalsY);
  totalsY += 7;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Total:', totalsLabelX, totalsY, { align: 'right' });
  doc.text(`${currency}${Number(order.total).toFixed(0)}`, totalsValueX, totalsY, { align: 'right' });

  // Notes
  if (order.notes) {
    totalsY += 16;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Notes:', L, totalsY);
    doc.setFont('helvetica', 'normal');
    doc.text(order.notes, L, totalsY + 5, { maxWidth: 160 });
  }

  // Save with order number as filename
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  // Also open in new tab
  window.open(url, '_blank');
}
