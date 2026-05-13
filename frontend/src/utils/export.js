// utils/export.js - Download transcript/results as PDF, DOCX, or MD

export async function exportAsPDF(data) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const margin = 50;
  const pageWidth = doc.internal.pageSize.getWidth();
  const maxWidth = pageWidth - 2 * margin;
  let y = margin;

  const addText = (text, fontSize = 11, bold = false, color = [240, 246, 255]) => {
    if (y > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      y = margin;
    }
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(text || ''), maxWidth);
    doc.text(lines, margin, y);
    y += lines.length * (fontSize * 1.4);
    return lines.length;
  };

  const addSpace = (h = 12) => { y += h; };
  const addLine = () => {
    doc.setDrawColor(0, 212, 255, 0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;
  };

  // Background
  doc.setFillColor(8, 12, 20);
  doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), 'F');

  // Title
  addText('AI Mock Interview Report', 24, true, [0, 212, 255]);
  addSpace(4);
  addText(`Role: ${data.role} | Difficulty: ${data.difficulty} | Date: ${new Date().toLocaleDateString()}`, 10, false, [139, 163, 196]);
  addLine();

  // Summary stats
  addText('Performance Summary', 16, true, [240, 246, 255]);
  addSpace(6);
  addText(`Questions Attempted: ${data.questionsAttempted} / ${data.totalQuestions}`, 11, false, [139, 163, 196]);
  addText(`Average Score: ${data.averageScore?.toFixed(1)} / 5.0`, 11, false, [139, 163, 196]);
  addText(`Session Duration: ${Math.floor(data.duration / 60)}m ${data.duration % 60}s`, 11, false, [139, 163, 196]);
  if (data.summary?.overallRating) {
    addText(`Overall Rating: ${data.summary.overallRating}`, 11, false, [16, 185, 129]);
  }
  addLine();

  // AI Summary
  if (data.summary) {
    addText('AI Assessment', 16, true, [240, 246, 255]);
    addSpace(6);
    if (data.summary.summary) addText(data.summary.summary, 11, false, [139, 163, 196]);
    addSpace(8);

    if (data.summary.topStrengths?.length) {
      addText('Strengths:', 12, true, [16, 185, 129]);
      data.summary.topStrengths.forEach(s => addText(`• ${s}`, 10, false, [139, 163, 196]));
      addSpace(4);
    }

    if (data.summary.areasToImprove?.length) {
      addText('Areas to Improve:', 12, true, [245, 158, 11]);
      data.summary.areasToImprove.forEach(a => addText(`• ${a}`, 10, false, [139, 163, 196]));
    }
    addLine();
  }

  // Per-question results
  addText('Question-by-Question Results', 16, true, [240, 246, 255]);
  addSpace(8);

  data.evaluations?.forEach((ev, i) => {
    addText(`Q${i + 1}: ${ev.question}`, 11, true, [0, 212, 255]);
    addSpace(4);
    addText(`Your Answer: ${ev.answer}`, 10, false, [139, 163, 196]);
    addSpace(4);
    addText(`Score: ${ev.score}/5 (${ev.rating})`, 10, true, [16, 185, 129]);
    if (ev.betterAnswer) addText(`Better Answer: ${ev.betterAnswer}`, 10, false, [139, 163, 196]);
    addSpace(12);
    addLine();
  });

  // Transcript
  if (data.transcript?.length) {
    addText('Full Transcript', 16, true, [240, 246, 255]);
    addSpace(8);
    data.transcript.forEach(t => {
      const label = t.role === 'interviewer' ? 'AI Interviewer' : 'You';
      const color = t.role === 'interviewer' ? [0, 212, 255] : [124, 58, 237];
      addText(`[${label}]`, 10, true, color);
      addText(t.text, 10, false, [139, 163, 196]);
      addSpace(8);
    });
  }

  doc.save(`interview-report-${data.role}-${Date.now()}.pdf`);
}

export async function exportAsDOCX(data) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');
  const { saveAs } = await import('file-saver');

  const paragraphs = [];

  const h = (text, level = HeadingLevel.HEADING_1) =>
    new Paragraph({ heading: level, children: [new TextRun({ text, bold: true })] });

  const p = (text, opts = {}) =>
    new Paragraph({ children: [new TextRun({ text: String(text || ''), ...opts })] });

  paragraphs.push(h('AI Mock Interview Report'));
  paragraphs.push(p(`Role: ${data.role} | Difficulty: ${data.difficulty} | Date: ${new Date().toLocaleDateString()}`));
  paragraphs.push(p(''));

  paragraphs.push(h('Performance Summary', HeadingLevel.HEADING_2));
  paragraphs.push(p(`Questions Attempted: ${data.questionsAttempted} / ${data.totalQuestions}`));
  paragraphs.push(p(`Average Score: ${data.averageScore?.toFixed(1)} / 5.0`));
  paragraphs.push(p(`Session Duration: ${Math.floor(data.duration / 60)}m ${data.duration % 60}s`));
  paragraphs.push(p(''));

  if (data.summary) {
    paragraphs.push(h('AI Assessment', HeadingLevel.HEADING_2));
    paragraphs.push(p(data.summary.summary || ''));
    paragraphs.push(p(''));

    if (data.summary.topStrengths?.length) {
      paragraphs.push(p('Strengths:', { bold: true }));
      data.summary.topStrengths.forEach(s => paragraphs.push(p(`• ${s}`)));
      paragraphs.push(p(''));
    }

    if (data.summary.areasToImprove?.length) {
      paragraphs.push(p('Areas to Improve:', { bold: true }));
      data.summary.areasToImprove.forEach(a => paragraphs.push(p(`• ${a}`)));
      paragraphs.push(p(''));
    }
  }

  if (data.evaluations?.length) {
    paragraphs.push(h('Question Results', HeadingLevel.HEADING_2));
    data.evaluations.forEach((ev, i) => {
      paragraphs.push(p(`Q${i + 1}: ${ev.question}`, { bold: true }));
      paragraphs.push(p(`Your Answer: ${ev.answer}`));
      paragraphs.push(p(`Score: ${ev.score}/5 - ${ev.rating}`, { bold: true }));
      if (ev.betterAnswer) paragraphs.push(p(`Suggested Better Answer: ${ev.betterAnswer}`));
      paragraphs.push(p(''));
    });
  }

  if (data.transcript?.length) {
    paragraphs.push(h('Full Transcript', HeadingLevel.HEADING_2));
    data.transcript.forEach(t => {
      const label = t.role === 'interviewer' ? 'AI Interviewer' : 'You';
      paragraphs.push(p(`[${label}]: ${t.text}`));
    });
  }

  const doc = new Document({ sections: [{ children: paragraphs }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `interview-report-${data.role}-${Date.now()}.docx`);
}

export function exportAsMarkdown(data) {
  let md = `# AI Mock Interview Report\n\n`;
  md += `**Role:** ${data.role} | **Difficulty:** ${data.difficulty} | **Date:** ${new Date().toLocaleDateString()}\n\n`;
  md += `---\n\n`;

  md += `## Performance Summary\n\n`;
  md += `| Metric | Value |\n|--------|-------|\n`;
  md += `| Questions Attempted | ${data.questionsAttempted} / ${data.totalQuestions} |\n`;
  md += `| Average Score | ${data.averageScore?.toFixed(1)} / 5.0 |\n`;
  md += `| Duration | ${Math.floor(data.duration / 60)}m ${data.duration % 60}s |\n`;
  if (data.summary?.overallRating) md += `| Overall Rating | ${data.summary.overallRating} |\n`;
  md += `\n`;

  if (data.summary) {
    md += `## AI Assessment\n\n${data.summary.summary || ''}\n\n`;
    if (data.summary.topStrengths?.length) {
      md += `### Strengths\n${data.summary.topStrengths.map(s => `- ${s}`).join('\n')}\n\n`;
    }
    if (data.summary.areasToImprove?.length) {
      md += `### Areas to Improve\n${data.summary.areasToImprove.map(a => `- ${a}`).join('\n')}\n\n`;
    }
    if (data.summary.studyTopics?.length) {
      md += `### Recommended Study Topics\n${data.summary.studyTopics.map(t => `- ${t}`).join('\n')}\n\n`;
    }
    md += `---\n\n`;
  }

  if (data.evaluations?.length) {
    md += `## Question-by-Question Results\n\n`;
    data.evaluations.forEach((ev, i) => {
      md += `### Q${i + 1}: ${ev.question}\n\n`;
      md += `**Your Answer:** ${ev.answer}\n\n`;
      md += `**Score:** ${ev.score}/5 — ${ev.rating}\n\n`;
      if (ev.strengths?.length) md += `**Strengths:** ${ev.strengths.join(', ')}\n\n`;
      if (ev.improvements?.length) md += `**Improvements:** ${ev.improvements.join(', ')}\n\n`;
      if (ev.betterAnswer) md += `**Suggested Answer:** ${ev.betterAnswer}\n\n`;
      md += `---\n\n`;
    });
  }

  if (data.transcript?.length) {
    md += `## Full Transcript\n\n`;
    data.transcript.forEach(t => {
      const label = t.role === 'interviewer' ? '🤖 AI Interviewer' : '👤 You';
      md += `**${label}:** ${t.text}\n\n`;
    });
  }

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `interview-report-${data.role}-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
