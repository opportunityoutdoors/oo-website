import { jsPDF } from "jspdf";

interface WaiverPdfData {
  participantName: string;
  participantEmail: string;
  eventTitle: string;
  eventDate: string | null;
  eventLocation: string | null;
  role: string | null;
  signatureName: string;
  signedAt: string;
  ipAddress: string;
  waiverText: string;
}

export function generateWaiverPdf(data: WaiverPdfData): Buffer {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 60;
  const contentWidth = pageWidth - margin * 2;
  let y = 60;

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Opportunity Outdoors", margin, y);
  y += 20;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("501(c)(3) Nonprofit | North Carolina", margin, y);
  y += 30;

  // Title
  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Signed Waiver & Release of Liability", margin, y);
  y += 24;

  // Event & Participant Info
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const infoLines = [
    `Event: ${data.eventTitle}`,
    data.eventDate ? `Date: ${data.eventDate}` : null,
    data.eventLocation ? `Location: ${data.eventLocation}` : null,
    `Participant: ${data.participantName} (${data.participantEmail})`,
    data.role ? `Role: ${data.role}` : null,
  ].filter(Boolean) as string[];

  for (const line of infoLines) {
    doc.text(line, margin, y);
    y += 14;
  }

  y += 10;

  // Divider
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 16;

  // Waiver text
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(50);

  const lines = doc.splitTextToSize(data.waiverText, contentWidth);

  for (const line of lines) {
    if (y > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      y = 60;
    }
    doc.text(line, margin, y);
    y += 11;
  }

  // Signature section
  y += 20;
  if (y > doc.internal.pageSize.getHeight() - 120) {
    doc.addPage();
    y = 60;
  }

  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Electronic Signature", margin, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  // Signature name in italic
  doc.setFont("helvetica", "bolditalic");
  doc.setFontSize(14);
  doc.text(data.signatureName, margin, y);
  y += 20;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  doc.text(`Signed: ${data.signedAt}`, margin, y);
  y += 13;
  doc.text(`IP Address: ${data.ipAddress}`, margin, y);
  y += 20;

  doc.setFontSize(7.5);
  doc.setTextColor(140);
  doc.text(
    "This electronic signature has the same legal effect as a handwritten signature under the ESIGN Act and UETA.",
    margin,
    y
  );

  return Buffer.from(doc.output("arraybuffer"));
}
