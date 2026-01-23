const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Create a new PDF document with text extraction enabled
const doc = new PDFDocument({
  size: 'LETTER',
  margins: { top: 50, bottom: 50, left: 50, right: 50 },
  // Ensure text is extractable
  info: {
    Title: 'Sample CIM - Manufacturing Company',
    Author: 'SearchFindr',
    Subject: 'Confidential Information Memorandum',
    Keywords: 'CIM, business sale, manufacturing'
  }
});

// Output file path
const outputPath = path.join(__dirname, '..', 'public', 'sample-cim.pdf');

// Create output stream
const stream = fs.createWriteStream(outputPath);
doc.pipe(stream);

// Helper function to add section header
function addSectionHeader(title) {
  doc.moveDown(1);
  doc.fontSize(16).font('Helvetica-Bold').text(title, { underline: true });
  doc.moveDown(0.5);
}

// Helper function to add subsection
function addSubsection(title) {
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica-Bold').text(title);
  doc.moveDown(0.3);
}

// Helper function to add body text
// Note: pdfkit should generate extractable text by default when using .text()
function addBodyText(text) {
  doc.fontSize(10).font('Helvetica').text(text, {
    align: 'left',
    lineGap: 2
  });
  doc.moveDown(0.3);
}

// Title Page
doc.fontSize(24).font('Helvetica-Bold').text('CONFIDENTIAL INFORMATION MEMORANDUM', {
  align: 'center'
});
doc.moveDown(1);
doc.fontSize(18).font('Helvetica').text('Acme Manufacturing Solutions, Inc.', {
  align: 'center'
});
doc.moveDown(0.5);
doc.fontSize(12).font('Helvetica-Oblique').text('A Leading Provider of Precision Manufacturing Services', {
  align: 'center'
});
doc.moveDown(2);
doc.fontSize(10).font('Helvetica').text('Prepared by: ABC Business Brokers', {
  align: 'center'
});
doc.fontSize(10).font('Helvetica').text('Date: January 2025', {
  align: 'center'
});
doc.fontSize(8).font('Helvetica-Oblique').text('CONFIDENTIAL - FOR QUALIFIED BUYERS ONLY', {
  align: 'center',
  color: 'red'
});

// Page 2: Executive Summary
doc.addPage();
addSectionHeader('EXECUTIVE SUMMARY');
addBodyText('Acme Manufacturing Solutions, Inc. ("Acme" or the "Company") is a well-established precision manufacturing business serving the aerospace, automotive, and medical device industries. Founded in 2010, the Company has built a reputation for high-quality custom components and assemblies.');
doc.moveDown(0.5);
addSubsection('Key Highlights');
addBodyText('• Revenue (TTM): $8.5M');
addBodyText('• EBITDA (TTM): $1.2M (14% margin)');
addBodyText('• 15-year operating history with consistent profitability');
addBodyText('• Diversified customer base with no single customer >15% of revenue');
addBodyText('• Strong recurring revenue from maintenance contracts (~40% of revenue)');
addBodyText('• Owner-operated with 2 key managers (5+ years tenure each)');
addBodyText('• Located in Austin, Texas with 12,000 sq ft facility on 5-year lease');

// Page 3: Business Overview
doc.addPage();
addSectionHeader('BUSINESS OVERVIEW');
addSubsection('Company Description');
addBodyText('Acme Manufacturing Solutions specializes in precision CNC machining, fabrication, and assembly services. The Company operates a modern facility equipped with 15 CNC machines, quality control systems, and assembly capabilities.');
addSubsection('Products & Services');
addBodyText('• Precision CNC Machining (60% of revenue)');
addBodyText('• Custom Fabrication (25% of revenue)');
addBodyText('• Assembly & Integration (10% of revenue)');
addBodyText('• Maintenance & Service Contracts (5% of revenue)');
addSubsection('Markets Served');
addBodyText('The Company serves three primary end markets:');
addBodyText('• Aerospace: 45% of revenue - components for commercial and defense applications');
addBodyText('• Automotive: 35% of revenue - precision parts for Tier 1 suppliers');
addBodyText('• Medical Devices: 20% of revenue - FDA-compliant components');

// Page 4: Financial Performance
doc.addPage();
addSectionHeader('FINANCIAL PERFORMANCE');
addSubsection('Revenue History');
addBodyText('Year 2022: $7.8M');
addBodyText('Year 2023: $8.1M (+3.8%)');
addBodyText('Year 2024 (TTM): $8.5M (+4.9%)');
addSubsection('EBITDA Performance');
addBodyText('Year 2022: $1.05M (13.5% margin)');
addBodyText('Year 2023: $1.15M (14.2% margin)');
addBodyText('Year 2024 (TTM): $1.2M (14.1% margin)');
addSubsection('Adjusted EBITDA');
addBodyText('Reported EBITDA (TTM): $1.2M');
addBodyText('Addbacks:');
addBodyText('• Owner compensation normalization: $150K');
addBodyText('• One-time legal expense: $25K');
addBodyText('• Discretionary marketing: $30K');
addBodyText('Total Addbacks: $205K');
addBodyText('Adjusted EBITDA: $1.405M');
addSubsection('Working Capital');
addBodyText('Typical working capital requirements: $400K - $500K');
addBodyText('AR Days: 45 days average');
addBodyText('AP Days: 30 days average');

// Page 5: Customer Base
doc.addPage();
addSectionHeader('CUSTOMER BASE & CONCENTRATION');
addSubsection('Customer Diversification');
addBodyText('The Company serves 45 active customers with the following concentration:');
addBodyText('• Top 3 customers: 38% of revenue');
addBodyText('• Top 5 customers: 52% of revenue');
addBodyText('• Top 10 customers: 68% of revenue');
addSubsection('Customer Retention');
addBodyText('• Average customer tenure: 6.5 years');
addBodyText('• Annual customer retention rate: 92%');
addBodyText('• Recurring maintenance contracts: 18 customers (40% of revenue)');
addSubsection('Key Customers');
addBodyText('Customer A: 15% of revenue - 8-year relationship, annual contract');
addBodyText('Customer B: 13% of revenue - 5-year relationship, quarterly orders');
addBodyText('Customer C: 10% of revenue - 12-year relationship, maintenance contract');

// Page 6: Operations
doc.addPage();
addSectionHeader('OPERATIONS');
addSubsection('Facility');
addBodyText('• Location: Austin, Texas');
addBodyText('• Size: 12,000 sq ft manufacturing facility');
addBodyText('• Lease: 5-year lease expiring 2027, $8,500/month');
addBodyText('• Condition: Well-maintained, modern equipment');
addSubsection('Equipment');
addBodyText('• 15 CNC machines (mix of 3-axis and 5-axis)');
addBodyText('• Quality control lab with CMM and inspection equipment');
addBodyText('• Assembly area with 5 workstations');
addBodyText('• Estimated equipment value: $2.5M');
addSubsection('Employees');
addBodyText('• Total employees: 28');
addBodyText('• Production staff: 20 (average tenure: 4 years)');
addBodyText('• Management: 3 (including owner)');
addBodyText('• Support staff: 5');

// Page 7: Management & Succession
doc.addPage();
addSectionHeader('MANAGEMENT & SUCCESSION');
addSubsection('Current Management');
addBodyText('Owner/CEO: 15 years with company, handles sales and strategy');
addBodyText('Operations Manager: 6 years with company, manages production');
addBodyText('Quality Manager: 5 years with company, handles QC and compliance');
addSubsection('Succession Planning');
addBodyText('The Operations Manager and Quality Manager have been groomed to take on additional responsibilities. However, the owner remains heavily involved in customer relationships and sales, representing a moderate succession risk.');

// Page 8: Growth Opportunities
doc.addPage();
addSectionHeader('GROWTH OPPORTUNITIES');
addBodyText('• Expand into adjacent markets (marine, industrial equipment)');
addBodyText('• Increase capacity utilization (currently ~75%)');
addBodyText('• Add value-added services (design, prototyping)');
addBodyText('• Pursue larger contracts with existing customers');
addBodyText('• Leverage relationships to cross-sell services');

// Page 9: Risk Factors
doc.addPage();
addSectionHeader('RISK FACTORS & CONSIDERATIONS');
addBodyText('• Owner-dependent customer relationships require transition planning');
addBodyText('• Customer concentration in top 5 customers (52% of revenue)');
addBodyText('• Lease expires in 2027 - renewal terms to be negotiated');
addBodyText('• Cyclical nature of aerospace and automotive markets');
addBodyText('• Working capital requirements vary with order flow');
addBodyText('• Quality certifications (AS9100, ISO 9001) must be maintained');

// Page 10: Deal Terms
doc.addPage();
addSectionHeader('DEAL TERMS & STRUCTURE');
addSubsection('Asking Price');
addBodyText('$4.5M (3.75x Adjusted EBITDA)');
addSubsection('Transaction Structure');
addBodyText('• Asset purchase preferred');
addBodyText('• Seller financing available: up to 20%');
addBodyText('• SBA financing eligible');
addSubsection('Due Diligence Requirements');
addBodyText('• Financial statements (3 years)');
addBodyText('• Customer contracts and agreements');
addBodyText('• Lease documentation');
addBodyText('• Equipment appraisals');
addBodyText('• Quality certifications');
addBodyText('• Employee agreements');
addBodyText('• Environmental assessments');

// Finalize PDF
doc.end();

// Wait for stream to finish before exiting
stream.on('finish', () => {
  const stats = fs.statSync(outputPath);
  console.log('Sample CIM PDF generated successfully at:', outputPath);
  console.log('File size:', stats.size, 'bytes');
  
  // Verify the file was written correctly
  if (stats.size === 0) {
    console.error('ERROR: Generated PDF file is empty!');
    process.exit(1);
  }
  
  // Verify it's a valid PDF by checking the header
  const firstBytes = fs.readFileSync(outputPath, { encoding: 'binary', flag: 'r' }).substring(0, 4);
  if (firstBytes !== '%PDF') {
    console.error('ERROR: Generated file does not have valid PDF header!');
    process.exit(1);
  }
  
  console.log('✅ PDF generation completed successfully');
  process.exit(0);
});

stream.on('error', (err) => {
  console.error('ERROR writing PDF:', err);
  process.exit(1);
});
