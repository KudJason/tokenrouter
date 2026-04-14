const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
        Header, Footer, PageNumber } = require('docx');
const fs = require('fs');

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };

// Create the document
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 36, bold: true, font: "Arial", color: "0EA5E9" },
        paragraph: { spacing: { before: 360, after: 240 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 300, after: 180 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: "TokenRouter Demo Tutorial", color: "666666", size: 18 })
            ]
          })
        ]
      })
    },
    footers: {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Page ", size: 18 }),
              new TextRun({ children: [PageNumber.CURRENT], size: 18 }),
              new TextRun({ text: " | TokenRouter - Trusted AI Agent Infrastructure", size: 18, color: "666666" })
            ]
          })
        ]
      })
    },
    children: [
      // Title
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
        children: [
          new TextRun({ text: "TokenRouter Demo Tutorial", bold: true, size: 48, font: "Arial", color: "0EA5E9" })
        ]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
        children: [
          new TextRun({ text: "Version 1.0 | April 2026 | API: token.route.worthwolf.top", size: 20, color: "666666" })
        ]
      }),

      // Overview
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Overview")] }),
      new Paragraph({
        spacing: { after: 240 },
        children: [new TextRun("TokenRouter provides trusted AI agent infrastructure for enterprise automation. This tutorial demonstrates how to use the Privacy Compute API for processing sensitive data with AI summarization.")]
      }),

      // Getting Started
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Getting Started")] }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Request Your API Key")] }),
      new Paragraph({
        spacing: { after: 240 },
        children: [
          new TextRun({ text: "Contact us to receive your demo API key with ", size: 22 }),
          new TextRun({ text: "€5 free credit", bold: true, size: 22 }),
          new TextRun({ text: " for testing:", size: 22 }),
        ]
      }),
      new Paragraph({ children: [new TextRun({ text: "Email: jason.jia@thirdhour.eu", bold: true })] }),
      new Paragraph({ children: [new TextRun({ text: "Subject: TokenRouter Demo Access Request", bold: true })], spacing: { after: 240 } }),
      new Paragraph({
        spacing: { after: 240 },
        children: [new TextRun("Once you receive your API key, you can start making API calls immediately.")]
      }),

      new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Make Your First Request")] }),
      new Paragraph({
        spacing: { after: 240 },
        children: [
          new TextRun({ text: "curl -X POST https://token.route.worthwolf.top/v1/privacy/compute \\", font: "Courier New", size: 18 }),
        ]
      }),

      // Pricing
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Pricing")] }),
      new Paragraph({
        spacing: { after: 240 },
        shading: { fill: "E0F2FE", type: ShadingType.CLEAR },
        children: [
          new TextRun({ text: "Free Trial: ", bold: true }),
          new TextRun("All new accounts receive "),
          new TextRun({ text: "100,000 free tokens", bold: true }),
          new TextRun(" for testing (powered by SiliconFlow and DeepSeek).")
        ]
      }),

      // Pricing Table
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: [3120, 3120, 3120],
        rows: [
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 3120, type: WidthType.DXA }, shading: { fill: "0EA5E9", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "Plan", bold: true, color: "FFFFFF", size: 22 })] })] }),
              new TableCell({ borders, width: { size: 3120, type: WidthType.DXA }, shading: { fill: "0EA5E9", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "Price", bold: true, color: "FFFFFF", size: 22 })] })] }),
              new TableCell({ borders, width: { size: 3120, type: WidthType.DXA }, shading: { fill: "0EA5E9", type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 },
                children: [new Paragraph({ children: [new TextRun({ text: "Description", bold: true, color: "FFFFFF", size: 22 })] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 3120, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun("Agent Infrastructure")] })] }),
              new TableCell({ borders, width: { size: 3120, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun("€0.05 / 1K tokens")] })] }),
              new TableCell({ borders, width: { size: 3120, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun("Multi-model gateway, automatic fallback")] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 3120, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun("Agent Compliance")] })] }),
              new TableCell({ borders, width: { size: 3120, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun("€0.10 / API call")] })] }),
              new TableCell({ borders, width: { size: 3120, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun("EU AI Act validation, PII masking, audit logs")] })] }),
            ]
          }),
          new TableRow({
            children: [
              new TableCell({ borders, width: { size: 3120, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun("Enterprise Setup")] })] }),
              new TableCell({ borders, width: { size: 3120, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun("€500 / hour")] })] }),
              new TableCell({ borders, width: { size: 3120, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun("Custom integration")] })] }),
            ]
          }),
        ]
      }),

      new Paragraph({ spacing: { before: 240 }, children: [] }),
      new Paragraph({
        spacing: { after: 240 },
        children: [
          new TextRun({ text: "Monthly Caps: ", bold: true }),
          new TextRun("Agent Infrastructure €250 cap | Agent Compliance €2,500 cap")
        ]
      }),

      // Contact
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Contact & Support")] }),
      new Paragraph({ children: [new TextRun({ text: "Dashboard: ", bold: true }), new TextRun("token.route.worthwolf.top/admin")] }),
      new Paragraph({ children: [new TextRun({ text: "API Status: ", bold: true }), new TextRun("token.route.worthwolf.top/health")] }),
      new Paragraph({ children: [new TextRun({ text: "Documentation: ", bold: true }), new TextRun("token.route.worthwolf.top/docs")] }),
    ]
  }],
  numbering: {
    config: [
      { reference: "numbers", levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  }
});

// Generate and save
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('TokenRouter_Demo_Tutorial.docx', buffer);
  console.log('Document created: TokenRouter_Demo_Tutorial.docx');
});
