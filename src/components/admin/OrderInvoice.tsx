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
}

export function generateInvoice(
  order: InvoiceOrder,
  items: InvoiceItem[],
  settings: InvoiceSettings
) {
  const doc = new jsPDF();
  const currency = settings.currency_symbol || '৳';
  const addr = order.shipping_address || {};

  // Header - Store name
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.store_name || 'Store', 14, 22);

  if (settings.store_tagline) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(settings.store_tagline, 14, 28);
  }

  // Invoice title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('INVOICE', 196, 22, { align: 'right' });

  // Order info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Invoice #: ${order.order_number}`, 196, 30, { align: 'right' });
  doc.text(`Date: ${format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}`, 196, 36, { align: 'right' });
  doc.text(`Status: ${order.status?.toUpperCase()}`, 196, 42, { align: 'right' });
  doc.text(`Payment: ${order.payment_status?.toUpperCase() || 'N/A'}`, 196, 48, { align: 'right' });

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 54, 196, 54);

  // Bill To
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Bill To:', 14, 62);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  let y = 68;
  if (addr.full_name) { doc.text(addr.full_name, 14, y); y += 5; }
  if (addr.phone) { doc.text(`Phone: ${addr.phone}`, 14, y); y += 5; }
  const addressParts = [addr.address_line1, addr.address_line2, addr.city, addr.state, addr.postal_code].filter(Boolean);
  if (addressParts.length) { doc.text(addressParts.join(', '), 14, y); y += 5; }
  if (addr.country) { doc.text(addr.country, 14, y); y += 5; }

  if (order.payment_method) {
    doc.text(`Payment Method: ${order.payment_method}`, 120, 68);
  }

  // Items table
  const tableY = Math.max(y + 6, 90);

  const tableBody = items.map(item => {
    const variant = [item.size, item.color].filter(Boolean).join(' / ');
    const name = variant ? `${item.product_name}\n(${variant})` : item.product_name;
    return [
      name,
      `${currency}${Number(item.price).toFixed(2)}`,
      String(item.quantity),
      `${currency}${(item.quantity * Number(item.price)).toFixed(2)}`,
    ];
  });

  autoTable(doc, {
    startY: tableY,
    head: [['Product', 'Unit Price', 'Qty', 'Total']],
    body: tableBody,
    theme: 'striped',
    headStyles: {
      fillColor: [50, 50, 50],
      textColor: 255,
      fontSize: 9,
      fontStyle: 'bold',
    },
    bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { halign: 'right', cellWidth: 30 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'right', cellWidth: 30 },
    },
    margin: { left: 14, right: 14 },
  });

  // Totals
  const finalY = (doc as any).lastAutoTable?.finalY || tableY + 40;
  let totalsY = finalY + 10;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Subtotal:', 145, totalsY, { align: 'right' });
  doc.text(`${currency}${Number(order.subtotal).toFixed(2)}`, 196, totalsY, { align: 'right' });
  totalsY += 6;

  doc.text('Shipping:', 145, totalsY, { align: 'right' });
  doc.text(`${currency}${Number(order.shipping_fee).toFixed(2)}`, 196, totalsY, { align: 'right' });
  totalsY += 2;

  doc.setDrawColor(180, 180, 180);
  doc.line(130, totalsY, 196, totalsY);
  totalsY += 6;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Total:', 145, totalsY, { align: 'right' });
  doc.text(`${currency}${Number(order.total).toFixed(2)}`, 196, totalsY, { align: 'right' });

  // Notes
  if (order.notes) {
    totalsY += 14;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Notes:', 14, totalsY);
    doc.setFont('helvetica', 'normal');
    doc.text(order.notes, 14, totalsY + 5, { maxWidth: 180 });
  }

  // Open in new tab
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  window.open(url, '_blank');
}
