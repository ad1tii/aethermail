export type MailAIContext = {
  threadId: string;
  subject?: string;
  fromName?: string;
  fromAddress?: string;
  date?: string;
  snippet?: string;
  latestText?: string;
  latestHtml?: string;
  attachments?: { filename: string; mimeType: string; size: number }[];
  messageCount?: number;
};

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

const normalize = (text: string) => text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

const hashString = (input: string) => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const pickVariant = <T,>(seed: number, variants: T[]) => variants[seed % variants.length]!;

const splitSentences = (text: string) => {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (!compact) return [];
  return compact.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
};

const extractQuestions = (text: string) => {
  const sentences = splitSentences(text);
  return sentences.filter(s => s.endsWith('?')).slice(0, 4);
};

const extractDeadlines = (text: string) => {
  const patterns = [
    /\bby\s+(eod|end of day|today|tomorrow|this week|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
    /\bby\s+\w+\s+\d{1,2}\b/gi,
    /\bbefore\s+(eod|end of day|today|tomorrow|this week|next week)\b/gi,
    /\bdeadline\s*(is|:)?\s*([^.\n]+)/gi,
    /\bdue\s+(on|by)?\s*([^.\n]+)/gi,
  ];
  const hits: string[] = [];
  patterns.forEach((re) => {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      hits.push(m[0].trim());
      if (hits.length >= 3) break;
    }
  });
  return Array.from(new Set(hits)).slice(0, 3);
};

const getContextText = (ctx: MailAIContext) => {
  const preferred = (ctx.latestText && ctx.latestText.trim()) ? ctx.latestText : (ctx.latestHtml ? stripHtml(ctx.latestHtml) : '');
  if (preferred) return preferred;
  return ctx.snippet || '';
};

const extractActionItems = (text: string) => {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const sentences = normalized.split(/(?<=[.!?])\s+/).filter(Boolean);
  const actionSignals = [
    'please', 'kindly', 'could you', 'can you', 'action required', 'asap', 'by eod', 'by end of day', 'deadline', 'review', 'approve', 'confirm', 'send', 'share', 'update'
  ];
  const picked = sentences
    .filter(s => actionSignals.some(sig => s.toLowerCase().includes(sig)))
    .slice(0, 5)
    .map(s => s.replace(/^\s*[-•]\s*/g, '').trim());

  return picked;
};

export const generateContextSummary = (ctx: MailAIContext) => {
  const subject = ctx.subject?.trim() || '(no subject)';
  const from = (ctx.fromName || ctx.fromAddress || 'Unknown sender').trim();
  const body = getContextText(ctx);
  const compact = body.replace(/\s+/g, ' ').trim();
  const preview = compact ? compact.slice(0, 240) + (compact.length > 240 ? '…' : '') : '';
  const attachments = ctx.attachments?.length ? `\n• Attachments: ${ctx.attachments.map(a => a.filename).join(', ')}` : '';
  const actions = extractActionItems(compact);
  const actionBlock = actions.length ? `\n\nAction items:\n${actions.map(a => `• ${a}`).join('\n')}` : '';
  const msgCount = ctx.messageCount ? ` (${ctx.messageCount} message${ctx.messageCount === 1 ? '' : 's'})` : '';
  return `Summary for "${subject}" from ${from}${msgCount}:\n${preview ? `• ${preview}` : '• No content available.'}${attachments}${actionBlock}`;
};

export const generateReplyDraft = (ctx: MailAIContext, meName?: string) => {
  const subject = ctx.subject?.trim() || '(no subject)';
  const senderName = ctx.fromName || ctx.fromAddress || 'there';
  const rawText = getContextText(ctx);
  const text = normalize(rawText);
  const actions = extractActionItems(text);
  const questions = extractQuestions(text);
  const deadlines = extractDeadlines(text);
  const seed = hashString(`${ctx.threadId}|${subject}|${senderName}|${text.slice(0, 200)}`);

  const greetingName = ctx.fromName ? ctx.fromName.split(' ')[0] : senderName;
  const lines: string[] = [];
  lines.push(`Subject: Re: ${subject}`);
  lines.push('');
  lines.push(`Hi ${greetingName},`);
  lines.push('');

  const opening = pickVariant(seed, [
    "Thanks for reaching out — I’ve gone through your message in detail.",
    "Thanks for the note. I reviewed the details and here’s my proposed response.",
    "Appreciate the update. I read through everything and I’m aligned on next steps.",
    "Thanks for sharing this. I’ve reviewed it carefully and I can proceed as follows.",
  ]);
  lines.push(opening);

  const sentences = splitSentences(text);
  const recap = sentences.slice(0, Math.min(3, Math.max(1, sentences.length ? 2 : 1)));
  if (recap.length && recap[0]) {
    lines.push('');
    lines.push('To confirm my understanding:');
    recap.forEach((s) => lines.push(`- ${s}`));
  }

  if (deadlines.length) {
    lines.push('');
    lines.push('Timeline noted:');
    deadlines.forEach(d => lines.push(`- ${d}`));
  }

  if (actions.length) {
    lines.push('');
    lines.push(pickVariant(seed + 1, [
      'Next steps on my side:',
      'Here’s what I’ll take care of next:',
      'Planned actions:',
    ]));
    actions.slice(0, 6).forEach(a => lines.push(`- ${a}`));
  } else {
    lines.push('');
    lines.push(pickVariant(seed + 2, [
      'To move this forward smoothly, could you confirm a couple of details?',
      'Before I proceed, I want to validate a few points:',
      'To make sure I execute correctly, can you clarify:',
    ]));
    if (questions.length) {
      questions.forEach(q => lines.push(`- ${q}`));
    } else {
      lines.push('- The desired outcome / acceptance criteria');
      lines.push('- Any deadline or priority constraints');
      lines.push('- Who the final approver is (if applicable)');
    }
  }

  if (ctx.attachments?.length) {
    lines.push('');
    lines.push(`Attachments received: ${ctx.attachments.map(a => a.filename).join(', ')}.`);
    lines.push('I’ll review them and incorporate any relevant details into the final response.');
  }

  lines.push('');
  lines.push(pickVariant(seed + 3, [
    'If you approve, I’ll proceed and share an update once the items above are complete.',
    'Let me know if you’d like me to prioritize any part of this first, and I’ll adjust accordingly.',
    'If this looks good, I’ll move ahead and keep you posted with the outcome.',
  ]));

  lines.push('');
  lines.push('Best,');
  lines.push(meName || 'Aditi Menon');
  return lines.join('\n');
};

export const generateResponse = (args: { query: string; context: MailAIContext | null; userName?: string; userEmail?: string }) => {
  const q = args.query.toLowerCase();
  const ctx = args.context;

  if (!ctx) {
    if (q.includes('summarize')) return 'Open an email thread first, then ask me to summarize it.';
    if (q.includes('draft') || q.includes('reply')) return 'Open an email thread first, then ask me to draft a reply for it.';
    if (q.includes('action')) return 'Open an email thread first, then ask me to extract action items.';
    return 'Select an email thread, then ask a question about it (summary, action items, or a reply draft).';
  }

  const text = getContextText(ctx);
  const compact = text.replace(/\s+/g, ' ').trim();

  if (q.includes('summarize') || q.includes('summary')) return generateContextSummary(ctx);
  if (q.includes('draft') || q.includes('reply')) return generateReplyDraft(ctx, args.userName);
  if (q.includes('action') || q.includes('todo') || q.includes('next step')) {
    const actions = extractActionItems(compact);
    if (!actions.length) return 'No explicit action items detected in this email. If you want, ask me to draft a reply asking for the missing details.';
    return `Action items:\n${actions.map(a => `• ${a}`).join('\n')}`;
  }
  if (q.includes('who') && (q.includes('from') || q.includes('sender'))) {
    return `Sender: ${ctx.fromName || 'Unknown'}${ctx.fromAddress ? ` <${ctx.fromAddress}>` : ''}`;
  }
  if (q.includes('attachments') || q.includes('attach')) {
    if (!ctx.attachments?.length) return 'No attachments found on the latest message in this thread.';
    return `Attachments:\n${ctx.attachments.map(a => `• ${a.filename} (${Math.round(a.size / 1024)} KB)`).join('\n')}`;
  }

  const subject = ctx.subject?.trim() || '(no subject)';
  const from = (ctx.fromName || ctx.fromAddress || 'Unknown sender').trim();
  const preview = compact ? compact.slice(0, 320) + (compact.length > 320 ? '…' : '') : '';
  return `In "${subject}" from ${from}:\n${preview ? `• ${preview}` : '• No content available.'}\n\nTry: “Summarize this thread”, “Extract action items”, or “Draft a reply”.`;
};
