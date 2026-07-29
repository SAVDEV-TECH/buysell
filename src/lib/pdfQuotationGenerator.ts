/**
 * Generates and opens/downloads a professional B2B Proforma Quotation PDF
 */
export function generateQuotationPDF({
  rfq,
  quote,
  companyName = "BuySell B2B Marketplace",
}: {
  rfq: any;
  quote: any;
  companyName?: string;
}) {
  const quoteNo = `QT-${Date.now().toString().slice(-6)}`;
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const validUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const supplierName = quote?.supplier_organization?.company_name || quote?.supplier_profile?.full_name || "Verified Supplier";
  const buyerName = rfq?.buyer_organization?.company_name || rfq?.buyer_profile?.full_name || "Valued Buyer";
  const unitPrice = Number(quote?.unit_price || rfq?.target_price || 0);
  const qty = Number(quote?.total_quantity || rfq?.quantity || 1);
  const total = unitPrice * qty;
  const currency = quote?.currency || rfq?.currency || "USD";
  const incoterm = quote?.incoterms || rfq?.incoterms || "FOB";
  const leadTime = quote?.lead_time_days || 14;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Official B2B Proforma Quotation #${quoteNo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
    body {
      font-family: 'Inter', sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 40px;
      background: #ffffff;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 24px;
      border-bottom: 3px solid #1e3a8a;
      margin-bottom: 32px;
    }
    .brand-title {
      font-size: 28px;
      font-weight: 900;
      color: #1e3a8a;
      letter-spacing: -0.5px;
    }
    .brand-accent {
      color: #ea580c;
    }
    .badge {
      display: inline-block;
      background: #e0f2fe;
      color: #0369a1;
      font-size: 11px;
      font-weight: 800;
      padding: 4px 12px;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-bottom: 36px;
    }
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px;
    }
    .card-title {
      font-size: 11px;
      font-weight: 800;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    .card-bold {
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 36px;
    }
    th {
      background: #0f172a;
      color: #ffffff;
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 14px 16px;
      text-align: left;
    }
    td {
      padding: 16px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 14px;
    }
    .total-box {
      float: right;
      width: 320px;
      background: #f1f5f9;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 40px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .total-grand {
      font-size: 20px;
      font-weight: 900;
      color: #1e3a8a;
      border-top: 2px stroke #cbd5e1;
      padding-top: 10px;
      margin-top: 10px;
    }
    .footer-terms {
      clear: both;
      padding-top: 32px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #64748b;
      line-height: 1.6;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div className="no-print" style="margin-bottom: 20px; text-align: right;">
    <button onclick="window.print()" style="background: #1e3a8a; color: white; border: none; padding: 12px 24px; font-weight: 800; border-radius: 12px; cursor: pointer;">
      🖨️ Print / Save as PDF
    </button>
  </div>

  <div class="header">
    <div>
      <div class="brand-title">buy<span class="brand-accent">sell</span></div>
      <div style="font-size: 10px; font-weight: 800; color: #64748b; letter-spacing: 2px; margin-top: 2px;">
        OFFICIAL B2B PROFORMA QUOTATION
      </div>
    </div>
    <div style="text-align: right;">
      <span class="badge">Verified Trade Document</span>
      <div style="font-size: 14px; font-weight: 800; margin-top: 8px;">Ref: #${quoteNo}</div>
      <div style="font-size: 12px; color: #64748b;">Date: ${dateStr}</div>
    </div>
  </div>

  <div class="details-grid">
    <div class="card">
      <div class="card-title">ISSUED BY (SUPPLIER)</div>
      <div class="card-bold">${supplierName}</div>
      <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Status: Verified Manufacturer</div>
      <div style="font-size: 12px; color: #64748b;">Trade Terms: ${incoterm}</div>
    </div>
    <div class="card">
      <div class="card-title">PREPARED FOR (BUYER)</div>
      <div class="card-bold">${buyerName}</div>
      <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Destination: ${rfq?.destination_country || "Global"}</div>
      <div style="font-size: 12px; color: #64748b;">Valid Until: ${validUntil}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Item Description</th>
        <th>Quantity</th>
        <th>Incoterms</th>
        <th>Lead Time</th>
        <th style="text-align: right;">Unit Price (${currency})</th>
        <th style="text-align: right;">Total (${currency})</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="font-weight: 700;">${rfq?.title || "B2B Product Order"}</td>
        <td>${qty.toLocaleString()} units</td>
        <td>${incoterm}</td>
        <td>${leadTime} Days</td>
        <td style="text-align: right;">$${unitPrice.toLocaleString()}</td>
        <td style="text-align: right; font-weight: 800;">$${total.toLocaleString()}</td>
      </tr>
    </tbody>
  </table>

  <div class="total-box">
    <div class="total-row">
      <span>Subtotal:</span>
      <strong>$${total.toLocaleString()} ${currency}</strong>
    </div>
    <div class="total-row">
      <span>Escrow Guarantee Fee:</span>
      <strong>Included (0.00)</strong>
    </div>
    <div class="total-row total-grand">
      <span>Total Payable:</span>
      <span>$${total.toLocaleString()} ${currency}</span>
    </div>
  </div>

  <div class="footer-terms">
    <strong>Terms & Escrow Conditions:</strong><br>
    1. This Proforma Quotation is binding upon acceptance on the BuySell B2B Network.<br>
    2. Payment must be deposited into BuySell Escrow Protection before manufacturing dispatch.<br>
    3. Funds remain locked in escrow until recipient confirms quality inspection at destination.
  </div>
</body>
</html>
  `;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(htmlContent);
    win.document.close();
  }
}
