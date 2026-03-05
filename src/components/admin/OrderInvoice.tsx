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

export interface InvoiceConfig {
  showLogo: boolean;
  showInvoiceNumber: boolean;
  showDate: boolean;
  showOrderStatus: boolean;
  showPaymentStatus: boolean;
  showBillTo: boolean;
  showPaymentMethod: boolean;
  showItemsTable: boolean;
  showTotalQuantity: boolean;
  showSubtotal: boolean;
  showShippingFee: boolean;
  showTotal: boolean;
  showNotes: boolean;
  footerText: string;
}

export const defaultInvoiceConfig: InvoiceConfig = {
  showLogo: true,
  showInvoiceNumber: true,
  showDate: true,
  showOrderStatus: true,
  showPaymentStatus: true,
  showBillTo: true,
  showPaymentMethod: true,
  showItemsTable: true,
  showTotalQuantity: true,
  showSubtotal: true,
  showShippingFee: true,
  showTotal: true,
  showNotes: true,
  footerText: '',
};

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
  settings: InvoiceSettings,
  config?: Partial<InvoiceConfig>
) {
  const cfg = { ...defaultInvoiceConfig, ...config };
  const doc = new jsPDF();
  const currency = settings.currency_symbol || 'BDT ';
  const addr = order.shipping_address || {};
  const L = 20;
  const R = 190;

  let headerY = 18;

  // Logo or Store name
  let hasLogo = false;
  if (cfg.showLogo && settings.logo_url) {
    const logoBase64 = await loadImageAsBase64(settings.logo_url);
    if (logoBase64) {
      try {
        const fmt = logoBase64.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(logoBase64, fmt, L, 12, 30, 30);
        hasLogo = true;
        headerY = 18;
      } catch {
        // logo failed
      }
    }
  }

  if (!hasLogo && cfg.showLogo) {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(settings.store_name || 'Store', L, headerY + 4);
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

  if (cfg.showInvoiceNumber) {
    doc.text(`Invoice #: ${order.order_number}`, infoX, infoY, { align: 'right' });
    infoY += 5;
  }
  if (cfg.showDate) {
    doc.text(`Date: ${format(new Date(order.created_at), 'dd MMM yyyy, hh:mm a')}`, infoX, infoY, { align: 'right' });
    infoY += 5;
  }
  if (cfg.showOrderStatus) {
    doc.text(`Status: ${order.status?.toUpperCase()}`, infoX, infoY, { align: 'right' });
    infoY += 5;
  }
  if (cfg.showPaymentStatus) {
    doc.text(`Payment: ${order.payment_status?.toUpperCase() || 'N/A'}`, infoX, infoY, { align: 'right' });
    infoY += 5;
  }

  // Divider
  const dividerY = Math.max(infoY + 2, settings.logo_url ? 48 : 54);
  doc.setDrawColor(210, 210, 210);
  doc.line(L, dividerY, R, dividerY);

  let billY = dividerY + 8;

  // Bill To
  if (cfg.showBillTo) {
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
  }

  // Payment method - right column
  if (cfg.showPaymentMethod && order.payment_method) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(`Payment Method: ${order.payment_method}`, R, dividerY + 14, { align: 'right' });
  }

  // Items table
  if (cfg.showItemsTable) {
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

    // Total quantity footer row
    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0);
    const foot = cfg.showTotalQuantity
      ? [['', '', `Total: ${totalQty}`, '']]
      : undefined;

    autoTable(doc, {
      startY: tableY,
      head: [['Product', 'Unit Price', 'Qty', 'Total']],
      body: tableBody,
      foot,
      theme: 'striped',
      headStyles: {
        fillColor: [40, 40, 40],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
      },
      bodyStyles: { fontSize: 8, textColor: [40, 40, 40] },
      footStyles: {
        fillColor: [230, 230, 230],
        textColor: [30, 30, 30],
        fontStyle: 'bold',
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 85 },
        1: { halign: 'right', cellWidth: 30 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'right', cellWidth: 35 },
      },
      margin: { left: L, right: 20 },
    });
  }

  // Totals
  const finalY = (doc as any).lastAutoTable?.finalY || (cfg.showItemsTable ? billY + 48 : billY + 8);
  let totalsY = finalY + 12;

  const totalsLabelX = 145;
  const totalsValueX = R;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);

  if (cfg.showSubtotal) {
    doc.text('Subtotal:', totalsLabelX, totalsY, { align: 'right' });
    doc.text(`${currency}${Number(order.subtotal).toFixed(0)}`, totalsValueX, totalsY, { align: 'right' });
    totalsY += 7;
  }

  if (cfg.showShippingFee) {
    doc.text('Shipping:', totalsLabelX, totalsY, { align: 'right' });
    doc.text(`${currency}${Number(order.shipping_fee).toFixed(0)}`, totalsValueX, totalsY, { align: 'right' });
    totalsY += 3;
  }

  if (cfg.showTotal) {
    if (cfg.showSubtotal || cfg.showShippingFee) {
      doc.setDrawColor(180, 180, 180);
      doc.line(130, totalsY, R, totalsY);
      totalsY += 7;
    }
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Total:', totalsLabelX, totalsY, { align: 'right' });
    doc.text(`${currency}${Number(order.total).toFixed(0)}`, totalsValueX, totalsY, { align: 'right' });
    totalsY += 10;
  }

  // Notes
  if (cfg.showNotes && order.notes) {
    totalsY += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Notes:', L, totalsY);
    doc.setFont('helvetica', 'normal');
    doc.text(order.notes, L, totalsY + 5, { maxWidth: 160 });
    totalsY += 12;
  }

  // Custom footer text
  if (cfg.footerText) {
    totalsY += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    doc.text(cfg.footerText, 105, totalsY, { align: 'center', maxWidth: 160 });
  }

  // Download with order number as filename
  doc.save(`${order.order_number}.pdf`);
}
