interface PrintTemplateConfig {
  name: string
  topHeaderHtml?: string // New optional prop for the very top header
  headerHtml: string
  leftLogoUrl: string
  rightLogoUrl: string
  bodyHtml: string // Now directly takes the HTML for the body
  footerText: string
  showPageNumbers: boolean
  paperSize: string
  orientation: string
}

interface GeneratePrintTemplateHtmlProps {
  template: PrintTemplateConfig
  scaleFactor?: number // New optional prop for scaling preview
  actualPaperWidthPx?: number // Actual paper width in pixels
  actualPaperHeightPx?: number // Actual paper height in pixels
  baseUrl: string
}

export function generatePrintTemplateHtml({
  template,
  scaleFactor = 1,
  actualPaperWidthPx,
  actualPaperHeightPx,
  baseUrl,
}: GeneratePrintTemplateHtmlProps): string {
  const { name, topHeaderHtml, headerHtml, leftLogoUrl, rightLogoUrl, bodyHtml, footerText, showPageNumbers, paperSize, orientation } =
    template

  const leftLogo = leftLogoUrl
    ? `<div style="flex: 0 0 auto; margin-right: 10px;"><img src="${leftLogoUrl}" alt="Left Logo" style="height: 50px; width: auto; object-fit: contain;"></div>`
    : `<div style="flex: 0 0 auto; width: 50px;"></div>` // Placeholder for alignment

  const rightLogo = rightLogoUrl
    ? `<div style="flex: 0 0 auto; margin-left: 10px;"><img src="${rightLogoUrl}" alt="Right Logo" style="height: 50px; width: auto; object-fit: contain;"></div>`
    : `<div style="flex: 0 0 auto; width: 50px;"></div>` // Placeholder for alignment

  // New top header structure including logos
  const fullHeaderContent = `
    <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 10px;">
      ${leftLogo}
      <div style="flex: 1; text-align: center;">
        ${topHeaderHtml || ''}
      </div>
      ${rightLogo}
    </div>
    <div style="text-align: center; margin-bottom: 20px;">
      ${headerHtml}
    </div>
  `

  // The main content area, directly using the provided bodyHtml
  const mainContent = `
    <div style="font-family: Arial, sans-serif; font-size: 12px; line-height: 1.6;">
      ${bodyHtml}
    </div>
  `

  // Determine the actual pixel dimensions for the body, if provided for preview
  const bodyWidthStyle = actualPaperWidthPx ? `width: ${actualPaperWidthPx}px;` : ""
  const bodyHeightStyle = actualPaperHeightPx ? `height: ${actualPaperHeightPx}px;` : ""

  // Basic styling for print, including page numbers
  const printStyles = `
    <style>
      @page {
        size: ${paperSize} ${orientation};
        margin: 0.5cm; /* This applies to actual print, not preview scaling */
      }
      html, body {
        margin: 0;
        padding: 0;
        overflow: hidden; /* Hide scrollbars within the scaled body */
      }
      body {
        font-family: Arial, sans-serif;
        font-size: 12px;
        line-height: 1.6;
        ${bodyWidthStyle}
        ${bodyHeightStyle}
        transform: scale(${scaleFactor}); /* Apply scaling here */
        transform-origin: top left; /* Scale from top-left corner */
        box-sizing: border-box; /* Include padding in the element's total width and height */
      }
      .page-content {
        page-break-after: always; /* Keep for multi-page print behavior */
        position: relative;
        padding: 0.5cm; /* Internal padding to simulate margins */
        box-sizing: border-box;
        height: 100%; /* Make page-content fill the body's height */
        display: flex; /* Use flexbox to push footer to bottom */
        flex-direction: column;
        justify-content: space-between; /* Push content to top, footer to bottom */
      }
      .page-content:last-child {
        page-break-after: avoid;
      }
      .footer {
        position: relative; /* Change to relative as flexbox handles positioning */
        margin-top: auto; /* Push footer to the bottom of the flex container */
        width: 100%; /* Take full width of page-content */
        text-align: center;
        font-size: 10px;
        padding-bottom: 10px; /* Small padding from bottom edge */
      }
      ${
        showPageNumbers
          ? `
        .footer::after {
          content: "${footerText.replace(/\[page\]/g, "counter(page)").replace(/\[total\]/g, "counter(pages)")}";
          margin-left: 10px; /* Space between footer text and page number */
        }
      `
          : ""
      }
    </style>
    <base href="${baseUrl}">
  `

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${name}</title>
      ${printStyles}
    </head>
    <body>
      <div class="page-content">
        <div>
          ${fullHeaderContent}
          ${mainContent}
        </div>
        <div class="footer">
          <span>${footerText}</span>
          ${showPageNumbers ? "<span>Page 1/1</span>" : ""}
        </div>
      </div>
      <script>
        // This script is for print functionality, not directly for preview scaling
        // window.onload = function() {
        //   setTimeout(function() {
        //     // window.print(); // This line is commented out for preview only
        //   }, 500);
        // };
      </script>
    </body>
    </html>
  `
}
