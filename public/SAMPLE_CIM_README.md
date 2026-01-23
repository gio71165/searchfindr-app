# Sample CIM PDF

This directory should contain a sample anonymized CIM PDF file named `sample-cim.pdf`.

## Requirements

The sample CIM should:
- Be a real PDF document (not a text file)
- Contain anonymized business information (company name, location, financials)
- Include typical CIM sections:
  - Executive Summary
  - Business Overview
  - Financials (P&L, Balance Sheet if available)
  - Market Analysis
  - Operations
  - Management Team
- Be suitable for demonstrating the AI analysis capabilities
- Have realistic but anonymized financial data:
  - Revenue: $2-5M range
  - EBITDA: $300K-800K range
  - Asking price: $1.5M-3M range
  - SBA eligible deal size

## Usage

The onboarding flow will attempt to upload this file when users click "Use Sample CIM" in step 2 of the onboarding tutorial.

## Adding the File

1. Create or obtain an anonymized sample CIM PDF
2. Name it `sample-cim.pdf`
3. Place it in the `/public` directory
4. The file will be accessible at `/sample-cim.pdf` in the application

## Note

If the file doesn't exist, the "Use Sample CIM" button will show an error, but users can still upload their own CIM files.
