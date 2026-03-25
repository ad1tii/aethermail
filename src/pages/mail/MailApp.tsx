import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Inbox,
  FileText,
  Send,
  AlertTriangle,
  Trash2,
  Pencil,
  Search,
  Star,
  Archive,
  ArrowLeft,
  Paperclip,
  LogOut,
  Sparkles,
  Filter,
  Clock,
  X,
  Menu,
  Mic,
  ChevronRight,
  MoreVertical,
  Reply,
  Forward,
  PanelLeftClose,
  Settings,
  Moon,
  Sun,
  Globe,
  MessageSquare,
  type LucideIcon
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { cn } from '../../utils/cn';
import { RichTextEditor } from '../../components/editor/RichTextEditor';
import { AskAIOverlay } from '../../components/mail/AskAIOverlay';
import { generateReplyDraft, type MailAIContext } from '../../components/mail/ai';
import logo from '../../assets/arcbyte.co Logo_white_transparent.png';
import { LANGUAGES, type Language, translations } from './translations';

// --- Theme Context ---
const ThemeContext = React.createContext({ isDark: true, toggleTheme: () => {} });
const useTheme = () => React.useContext(ThemeContext);

// --- Language Context ---
const LanguageContext = React.createContext<{
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
}>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
});
const useLanguage = () => React.useContext(LanguageContext);

// --- Types ---

type MailFolder = 'inbox' | 'drafts' | 'sent' | 'spam' | 'trash';

const MAIL_FOLDER_IMAP_PATH: Record<MailFolder, string> = {
  inbox: 'INBOX',
  drafts: 'Drafts',
  sent: 'Sent',
  spam: 'Spam',
  trash: 'Trash',
};

type MailThreadSummary = {
  id: string;
  folder: MailFolder;
  sender: string;
  senderEmail: string;
  subject: string;
  snippet: string;
  timestamp: string;
  unread: boolean;
  starred?: boolean;
  importanceScore?: number;
  spamScore?: number;
  tags?: string[];
  from?: { name?: string; address: string } | null;
  lastMessageAt?: string;
};

type MailThreadMessage = {
  id: string;
  subject: string;
  fromName?: string;
  fromAddress?: string;
  to: { name?: string; address: string }[];
  cc: { name?: string; address: string }[];
  bcc: { name?: string; address: string }[];
  date: string;
  text?: string;
  html?: string;
  attachments: {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    part: string;
  }[];
  flags: {
    seen: boolean;
    flagged: boolean;
    answered: boolean;
  };
};

type MailThreadDetail = {
  id: string;
  subject: string;
  folder: MailFolder;
  messages: MailThreadMessage[];
};

type ViewportState = {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
};

type DemoMailbox = {
  threadsByFolder: Record<MailFolder, MailThreadSummary[]>;
  detailById: Record<string, MailThreadDetail>;
};

const DEV_AUTH_BYPASS_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_DEV_AUTH_BYPASS === 'true';

const getDevAuthBypassActive = () => {
  const enabled =
    DEV_AUTH_BYPASS_ENABLED ||
    (typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        new URLSearchParams(window.location.search).get('demo') === '1'));
  if (!enabled) return false;
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem('devAuthBypass') === 'true';
  } catch {
    return false;
  }
};

const hashString = (input: string) => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const mulberry32 = (seed: number) => {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const createDemoMailbox = (userEmail: string): DemoMailbox => {
  const seed = hashString(userEmail || 'demo');
  const rand = mulberry32(seed);

  const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)]!;
  const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
  const chance = (p: number) => rand() < p;

  const firstNames = [
    'Aditi', 'Ravi', 'Nina', 'Omar', 'Leah', 'Jon', 'Maya', 'Ishaan', 'Sana', 'Eli',
    'Zara', 'Arjun', 'Noah', 'Priya', 'Theo', 'Meera', 'Sam', 'Kiran', 'Ava', 'Dev'
  ];
  const lastNames = [
    'Menon', 'Patel', 'Sharma', 'Singh', 'Khan', 'Lee', 'Chen', 'Garcia', 'Brown', 'Wilson',
    'Nguyen', 'Davis', 'Miller', 'Taylor', 'Anderson', 'Thomas', 'Martin', 'Clark', 'Lewis', 'Walker'
  ];
  const companies = [
    'AetherOps', 'Nimbus Labs', 'Stonebridge', 'Orchid Systems', 'Northwind', 'VantaWorks',
    'BluePeak', 'Copperfield', 'Redwood', 'Atlas Partners', 'Helio', 'IonWave', 'Crescent', 'Kite & Co'
  ];
  const domains = ['example.com', 'vendor.io', 'partner.co', 'ops.tools', 'mail.test'];
  const subjects = [
    'Weekly status update', 'Action required: access review', 'Invoice attached', 'Re: Timeline confirmation',
    'Security incident follow-up', 'Design review notes', 'Meeting recap', 'Deployment checklist',
    'Customer escalation', 'FYI: change request', 'Request for approval', 'New onboarding details',
    'Bug triage summary', 'Release notes draft', 'SLA discussion', 'Data export results'
  ];
  const bodyParagraphs = [
    'Sharing an update with the latest context and next steps.',
    'Please review and confirm your availability before end of day.',
    'I have attached the relevant documents and a short summary below.',
    'We can proceed once approvals are in place and the checklist is green.',
    'Let me know if you want a quick walkthrough or a deeper dive on any section.',
    'Flagging a potential risk so we can mitigate early and avoid surprises.',
    'Thank you for the fast turnaround on this.',
    'This is time-sensitive; please prioritize if possible.'
  ];
  const attachmentCatalog = [
    { filename: 'spec.pdf', mimeType: 'application/pdf', size: 482_381 },
    { filename: 'report.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 1_284_900 },
    { filename: 'screenshot.png', mimeType: 'image/png', size: 332_120 },
    { filename: 'logs.txt', mimeType: 'text/plain', size: 93_210 },
    { filename: 'proposal.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 724_503 }
  ];

  const folders: MailFolder[] = [];
  for (let i = 0; i < 60; i++) folders.push('inbox');
  for (let i = 0; i < 12; i++) folders.push('sent');
  for (let i = 0; i < 10; i++) folders.push('drafts');
  for (let i = 0; i < 8; i++) folders.push('spam');
  for (let i = 0; i < 10; i++) folders.push('trash');
  for (let i = folders.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [folders[i], folders[j]] = [folders[j]!, folders[i]!];
  }

  const threadsByFolder: Record<MailFolder, MailThreadSummary[]> = {
    inbox: [],
    drafts: [],
    sent: [],
    spam: [],
    trash: [],
  };
  const detailById: Record<string, MailThreadDetail> = {};

  const now = Date.now();
  for (let i = 0; i < 100; i++) {
    const folder = folders[i]!;
    const externalFirst = pick(firstNames);
    const externalLast = pick(lastNames);
    const externalName = `${externalFirst} ${externalLast}`;
    const externalCompany = pick(companies);
    const externalEmail = `${externalFirst.toLowerCase()}.${externalLast.toLowerCase()}@${pick(domains)}`;
    const threadSubject = chance(0.35)
      ? `${pick(subjects)} — ${externalCompany}`
      : pick(subjects);

    const isUnread = folder === 'inbox' ? chance(0.35) : folder === 'spam' ? chance(0.5) : false;
    const messageCount = folder === 'drafts' ? 1 : int(1, 3);
    const baseMinutesAgo = int(10, 60 * 24 * 21);
    const baseTime = now - baseMinutesAgo * 60 * 1000;

    const threadId = `demo-${folder}-${String(i + 1).padStart(3, '0')}`;
    const messages: MailThreadMessage[] = [];

    for (let m = 0; m < messageCount; m++) {
      const isUserSender = folder === 'sent' || folder === 'drafts' ? true : m % 2 === 1;
      const fromName = isUserSender ? (userEmail.split('@')[0] || 'User') : externalName;
      const fromAddress = isUserSender ? userEmail : externalEmail;
      const toAddress = isUserSender ? externalEmail : userEmail;
      const toName = isUserSender ? externalName : (userEmail.split('@')[0] || 'User');

      const paragraphCount = int(2, 5);
      const paragraphs = Array.from({ length: paragraphCount }, () => pick(bodyParagraphs));
      const salutation = isUserSender ? `Hi ${externalFirst},` : `Hi,`;
      const signOff = isUserSender ? `\n\nRegards,\n${fromName}` : `\n\nThanks,\n${fromName}`;
      const text = `${salutation}\n\n${paragraphs.join(' ')}${signOff}`;
      const html = `<p>${salutation}</p>${paragraphs.map(p => `<p>${p}</p>`).join('')}<p>${signOff.replace(/\n/g, '<br/>')}</p>`;

      const isLast = m === messageCount - 1;
      const attachments = isLast && chance(0.28)
        ? Array.from({ length: int(1, 2) }, () => {
            const a = pick(attachmentCatalog);
            return {
              id: `${threadId}-att-${Math.floor(rand() * 10_000)}`,
              filename: a.filename,
              mimeType: a.mimeType,
              size: a.size + int(-30_000, 60_000),
              part: String(int(1, 9)),
            };
          })
        : [];

      const msgDate = new Date(baseTime + m * int(12, 180) * 60 * 1000).toISOString();
      messages.push({
        id: `${threadId}-msg-${m + 1}`,
        subject: threadSubject,
        fromName,
        fromAddress,
        to: [{ name: toName, address: toAddress }],
        cc: [],
        bcc: [],
        date: msgDate,
        text,
        html,
        attachments,
        flags: {
          seen: !(isUnread && isLast),
          flagged: chance(0.08),
          answered: messageCount > 1 && chance(0.6),
        },
      });
    }

    const lastMessageAt = messages[messages.length - 1]!.date;
    const from = folder === 'sent' || folder === 'drafts'
      ? { name: userEmail.split('@')[0] || 'User', address: userEmail }
      : { name: externalName, address: externalEmail };

    const snippetSource = messages[messages.length - 1]!.text || '';
    const snippet = snippetSource.replace(/\s+/g, ' ').trim().slice(0, 120);
    const importanceScore = folder === 'inbox' ? int(35, 98) : undefined;
    const spamScore = folder === 'spam' ? int(60, 99) : undefined;
    const summary: MailThreadSummary = {
      id: threadId,
      folder,
      sender: from.name || from.address,
      senderEmail: from.address,
      subject: threadSubject,
      snippet,
      timestamp: lastMessageAt,
      unread: isUnread,
      starred: chance(0.12),
      importanceScore,
      spamScore,
      tags: chance(0.18) ? [pick(['Ops', 'Finance', 'Product', 'Legal', 'Security', 'Hiring'])] : undefined,
      from,
      lastMessageAt,
    };

    threadsByFolder[folder].push(summary);
    detailById[threadId] = {
      id: threadId,
      subject: threadSubject,
      folder,
      messages,
    };
  }

  (Object.keys(threadsByFolder) as MailFolder[]).forEach((folder) => {
    const items = threadsByFolder[folder];
    if (items.length > 0 && !items.some(i => i.starred)) {
      items[0] = { ...items[0]!, starred: true };
    }
    threadsByFolder[folder] = threadsByFolder[folder].sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
  });

  return { threadsByFolder, detailById };
};

const createDemoIncomingThread = (userEmail: string, seq: number) => {
  const seed = hashString(`${userEmail}|incoming|${seq}`);
  const rand = mulberry32(seed);
  const pick = <T,>(items: T[]) => items[Math.floor(rand() * items.length)]!;
  const int = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;
  const chance = (p: number) => rand() < p;

  const firstNames = ['Aditi', 'Ravi', 'Nina', 'Omar', 'Leah', 'Jon', 'Maya', 'Ishaan', 'Sana', 'Eli', 'Zara', 'Arjun', 'Noah', 'Priya', 'Theo', 'Meera', 'Sam', 'Kiran', 'Ava', 'Dev'];
  const lastNames = ['Menon', 'Patel', 'Sharma', 'Singh', 'Khan', 'Lee', 'Chen', 'Garcia', 'Brown', 'Wilson', 'Nguyen', 'Davis', 'Miller', 'Taylor', 'Anderson', 'Thomas', 'Martin', 'Clark', 'Lewis', 'Walker'];
  const companies = ['AetherOps', 'Nimbus Labs', 'Stonebridge', 'Orchid Systems', 'Northwind', 'VantaWorks', 'BluePeak', 'Copperfield', 'Redwood', 'Atlas Partners', 'Helio', 'IonWave', 'Crescent', 'Kite & Co'];
  const domains = ['example.com', 'vendor.io', 'partner.co', 'ops.tools', 'mail.test'];
  const subjects = [
    'Quick question', 'Following up', 'Approval needed', 'Re: Next steps', 'Production update', 'Contract review', 'Invoice reminder',
    'Meeting request', 'Risk flagged', 'Release coordination', 'Bug report', 'Timeline check', 'Access request', 'Status ping'
  ];
  const bodyParagraphs = [
    'Sharing an update and a brief summary of where we are.',
    'Could you please confirm the next steps and the expected deadline?',
    'If you approve, I can proceed and send the final confirmation.',
    'I’m flagging one risk that might affect the timeline unless we adjust scope.',
    'Let me know if you prefer a quick call, or I can handle it async.',
    'Thanks again — appreciate the help here.'
  ];
  const attachmentCatalog = [
    { filename: 'proposal.pdf', mimeType: 'application/pdf', size: 512_240 },
    { filename: 'invoice.pdf', mimeType: 'application/pdf', size: 238_110 },
    { filename: 'notes.txt', mimeType: 'text/plain', size: 41_920 },
    { filename: 'screenshot.png', mimeType: 'image/png', size: 312_444 },
  ];

  const externalFirst = pick(firstNames);
  const externalLast = pick(lastNames);
  const externalName = `${externalFirst} ${externalLast}`;
  const externalCompany = pick(companies);
  const externalEmail = `${externalFirst.toLowerCase()}.${externalLast.toLowerCase()}@${pick(domains)}`;
  const subject = chance(0.4) ? `${pick(subjects)} — ${externalCompany}` : pick(subjects);

  const now = Date.now();
  const date = new Date(now).toISOString();
  const threadId = `demo-inbox-live-${now}-${seq}`;

  const paragraphCount = int(2, 5);
  const paragraphs = Array.from({ length: paragraphCount }, () => pick(bodyParagraphs));
  const salutation = `Hi,`;
  const signOff = `\n\nThanks,\n${externalName}`;
  const text = `${salutation}\n\n${paragraphs.join(' ')}${signOff}`;
  const html = `<p>${salutation}</p>${paragraphs.map(p => `<p>${p}</p>`).join('')}<p>${signOff.replace(/\n/g, '<br/>')}</p>`;

  const attachments = chance(0.22)
    ? Array.from({ length: int(1, 2) }, () => {
        const a = pick(attachmentCatalog);
        return {
          id: `${threadId}-att-${int(1000, 9999)}`,
          filename: a.filename,
          mimeType: a.mimeType,
          size: a.size + int(-20_000, 50_000),
          part: String(int(1, 9)),
        };
      })
    : [];

  const message: MailThreadMessage = {
    id: `${threadId}-msg-1`,
    subject,
    fromName: externalName,
    fromAddress: externalEmail,
    to: [{ name: userEmail.split('@')[0] || 'User', address: userEmail }],
    cc: [],
    bcc: [],
    date,
    text,
    html,
    attachments,
    flags: { seen: false, flagged: chance(0.08), answered: false },
  };

  const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 120);
  const summary: MailThreadSummary = {
    id: threadId,
    folder: 'inbox',
    sender: externalName,
    senderEmail: externalEmail,
    subject,
    snippet,
    timestamp: date,
    unread: true,
    starred: chance(0.12),
    importanceScore: int(45, 99),
    from: { name: externalName, address: externalEmail },
    lastMessageAt: date,
  };

  const detail: MailThreadDetail = {
    id: threadId,
    subject,
    folder: 'inbox',
    messages: [message],
  };

  const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  let bytesAdded = 0;
  bytesAdded += encoder ? encoder.encode(text).length : text.length;
  attachments.forEach(a => (bytesAdded += a.size));

  return { summary, detail, bytesAdded };
};

// --- Hooks ---

const useViewport = (): ViewportState => {
  const [width, setWidth] = useState<number>(() => window.innerWidth || 1440);

  useEffect(() => {
    const handle = () => setWidth(window.innerWidth || 1440);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);

  const isMobile = width < 768;
  const isDesktop = width >= 1280;

  return { isMobile, isTablet: false, isDesktop };
};

// --- Components ---

const SidebarItem = ({
  icon: Icon,
  label,
  active,
  onClick,
  collapsed,
  count,
}: {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick: () => void;
  collapsed?: boolean;
  count?: number;
}) => {
  const { isDark } = useTheme();
  
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-3 px-3 py-2.5 mx-2 w-[calc(100%-16px)] rounded-xl transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]',
        active
          ? (isDark ? 'bg-[#1A1A1A] text-white shadow-lg shadow-black/20' : 'bg-white text-black shadow-md shadow-black/5')
          : (isDark ? 'text-[#B3B3B3] hover:text-white hover:bg-[#121212]' : 'text-[#5E5E5E] hover:text-black hover:bg-[#EAEAEA]')
      )}
    >
      {/* Active Glow Background */}
      {active && (
         <div className={cn("absolute inset-0 rounded-xl bg-gradient-to-r to-transparent opacity-100 pointer-events-none", isDark ? "from-[#1DB954]/5" : "from-[#1DB954]/10")} />
      )}

      {/* Icon Container */}
      <div className={cn(
          "relative flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-active:scale-95",
          active ? "text-[#1DB954]" : "text-current"
      )}>
          <Icon
            size={collapsed ? 24 : 20}
            strokeWidth={active ? 2.5 : 2}
            className="relative z-10"
          />
          {/* Icon Glow */}
          {active && <div className="absolute inset-0 bg-[#1DB954]/30 blur-lg rounded-full opacity-60" />} 
      </div>

      {!collapsed && (
        <>
          <span className={cn(
              "text-[14px] flex-1 text-left truncate transition-all duration-200",
              active 
                ? (isDark ? "font-bold text-white tracking-wide translate-x-1" : "font-bold text-black tracking-wide translate-x-1") 
                : (isDark ? "font-medium text-[#B3B3B3] group-hover:text-white group-hover:translate-x-1" : "font-medium text-[#5E5E5E] group-hover:text-black group-hover:translate-x-1")
          )}>
            {label}
          </span>
          {count !== undefined && (
            <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center transition-colors",
                active 
                  ? "bg-[#1DB954] text-black shadow-[0_0_10px_rgba(29,185,84,0.4)]" 
                  : (isDark ? "bg-[#282828] text-[#787878] group-hover:text-white group-hover:bg-[#333]" : "bg-[#E0E0E0] text-[#737373] group-hover:text-black group-hover:bg-[#D4D4D4]")
            )}>
              {count}
            </span>
          )}
        </>
      )}
      
      {/* Active Left Pill */}
      {active && !collapsed && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#1DB954] rounded-r-full shadow-[0_0_12px_#1DB954]" />
      )}
    </button>
  );
};

const MailSidebar = ({
  email,
  displayName,
  avatarUrl,
  activeFolder,
  starredOnly,
  onToggleStarred,
  onFolderChange,
  onCompose,
  collapsed,
  setCollapsed,
  onEditProfile,
  onLogout,
  isMobile,
  counts,
}: {
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  activeFolder: MailFolder;
  starredOnly: boolean;
  onToggleStarred: () => void;
  onFolderChange: (f: MailFolder) => void;
  onCompose: () => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  onEditProfile: () => void;
  onLogout: () => void;
  isMobile: boolean;
  counts: Record<MailFolder | 'starred', number>;
}) => {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  return (
    <aside
      className={cn(
        'relative flex flex-col h-full z-20',
        isDark ? 'bg-[#0B0B0B]' : 'bg-[#F6F6F6] border-r border-[#E5E5E5]',
        'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        collapsed ? 'w-[72px]' : 'w-[240px]',
        isMobile && 'w-full absolute inset-0 z-50'
      )}
    >
      {/* Header */}
      <div className={cn("h-16 flex items-center px-6 pt-4 pb-2", collapsed && "justify-center px-0")}>
        {!collapsed ? (
          <div className="flex items-center gap-3 cursor-pointer group">
             <img src={logo} alt="AetherMail" className={cn("h-8 w-auto object-contain", !isDark && "brightness-0")} />
             <span className={cn("font-bold text-lg tracking-tight transition-colors", isDark ? "text-white group-hover:text-[#1DB954]" : "text-black group-hover:text-[#1DB954]")}>AetherMail</span>
          </div>
        ) : (
          <div className="w-10 h-10 flex items-center justify-center shrink-0 cursor-pointer hover:scale-105 transition-transform">
             <img src={logo} alt="AetherMail" className={cn("h-8 w-auto object-contain", !isDark && "brightness-0")} />
          </div>
        )}
        
        {!collapsed && (
           <button 
             onClick={() => setCollapsed(true)} 
             className={cn(
               "ml-auto p-2 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 group",
               isDark ? "text-[#787878] hover:text-white hover:bg-[#1A1A1A]" : "text-[#949494] hover:text-black hover:bg-[#E0E0E0]"
             )}
             title="Collapse sidebar"
           >
             <PanelLeftClose size={20} strokeWidth={2} className="group-hover:-translate-x-0.5 transition-transform" />
           </button>
        )}
      </div>

      {/* Compose */}
      <div className="px-4 py-4">
        <button
          onClick={onCompose}
          className={cn(
            'flex items-center gap-3 w-full h-12 rounded-full transition-all duration-200 group',
            collapsed 
              ? (isDark ? 'w-12 h-12 justify-center bg-[#1A1A1A] hover:bg-[#282828] text-white p-0 mx-auto' : 'w-12 h-12 justify-center bg-white hover:bg-[#EAEAEA] text-black p-0 mx-auto border border-[#E5E5E5]')
              : (isDark ? 'bg-white hover:bg-[#F0F0F0] hover:scale-[1.02] text-black px-4 shadow-lg shadow-white/5' : 'bg-black hover:bg-[#333] hover:scale-[1.02] text-white px-4 shadow-lg shadow-black/10')
          )}
        >
          <Pencil size={20} strokeWidth={2.5} className={collapsed ? (isDark ? "text-white" : "text-black") : (isDark ? "text-black" : "text-white")} />
          {!collapsed && <span className="font-bold text-[14px]">{t('compose')}</span>}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar pt-2">
        <div className="space-y-1">
          <SidebarItem
            icon={Inbox}
            label={t('inbox')}
            active={activeFolder === 'inbox'}
            onClick={() => onFolderChange('inbox')}
            collapsed={collapsed}
            count={counts.inbox}
          />
          <SidebarItem
            icon={Star}
            label={t('starred')}
            active={starredOnly}
            onClick={onToggleStarred}
            collapsed={collapsed}
            count={counts.starred}
          />
          <SidebarItem
            icon={Send}
            label={t('sent')}
            active={activeFolder === 'sent'}
            onClick={() => onFolderChange('sent')}
            collapsed={collapsed}
            count={counts.sent}
          />
          <SidebarItem
            icon={FileText}
            label={t('drafts')}
            active={activeFolder === 'drafts'}
            onClick={() => onFolderChange('drafts')}
            collapsed={collapsed}
            count={counts.drafts}
          />
        </div>
        
        {!collapsed && (
          <div className="px-5 py-3 mt-4 mb-2 flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity">
             <div className={cn("h-[1px] w-4", isDark ? "bg-[#282828]" : "bg-[#E5E5E5]")} />
             <span className={cn("text-[10px] font-bold uppercase tracking-[0.2em] font-mono", isDark ? "text-[#5E5E5E]" : "text-[#949494]")}>{t('library')}</span>
             <div className={cn("h-[1px] flex-1", isDark ? "bg-[#282828]" : "bg-[#E5E5E5]")} />
          </div>
        )}
        
        <div className="space-y-1">
          <SidebarItem
            icon={AlertTriangle}
            label={t('spam')}
            active={activeFolder === 'spam'}
            onClick={() => onFolderChange('spam')}
            collapsed={collapsed}
            count={counts.spam}
          />
          <SidebarItem
            icon={Trash2}
            label={t('trash')}
            active={activeFolder === 'trash'}
            onClick={() => onFolderChange('trash')}
            collapsed={collapsed}
            count={counts.trash}
          />
        </div>
      </nav>

      {/* Profile */}
      <div className={cn("p-4 mt-auto border-t", isDark ? "border-[#1A1A1A]" : "border-[#E5E5E5]")}>
        <div className={cn(
            "relative flex items-center gap-3 w-full p-3 rounded-2xl transition-all duration-300 group cursor-pointer overflow-hidden",
            collapsed ? "justify-center p-0 bg-transparent" : (isDark ? "bg-[#181818] border border-[#282828]" : "bg-white border border-[#E5E5E5] shadow-sm")
        )}
        onClick={onEditProfile}
        >
           
           {/* Avatar */}
           <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#1DB954] to-[#1ED760] p-[2px]">
                 <div className={cn("w-full h-full rounded-full flex items-center justify-center overflow-hidden", isDark ? "bg-[#0B0B0B]" : "bg-white")}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span className={cn("font-bold", isDark ? "text-white" : "text-black")}>{displayName.charAt(0).toUpperCase()}</span>
                    )}
                 </div>
              </div>
              <div className={cn("absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-[#1DB954] border-2 rounded-full z-10", isDark ? "border-[#121212]" : "border-white")} />
           </div>

           {!collapsed && (
             <>
               <div className="flex-1 min-w-0 relative z-10">
                  <div className="flex items-center justify-between">
                     <span className={cn("text-[14px] font-bold truncate", isDark ? "text-white" : "text-black")}>{displayName}</span>
                  </div>
                  <div className={cn("text-[12px] truncate", isDark ? "text-[#787878]" : "text-[#949494]")}>{email}</div>
               </div>
               
               <button 
                 onClick={(e) => {
                   e.stopPropagation();
                   onLogout();
                 }}
                 className={cn(
                   "p-2 rounded-full transition-colors relative z-10",
                   isDark ? "text-[#5E5E5E] hover:text-[#FF5555] hover:bg-[#282828]" : "text-[#949494] hover:text-[#FF5555] hover:bg-[#F0F0F0]"
                 )}
                 title={t('sign_out')}
               >
                 <LogOut size={16} />
               </button>
             </>
           )}
        </div>
      </div>
    </aside>
  );
};

const MailListItem = ({
  thread,
  selected,
  onClick,
  onReply,
  onRestore,
}: {
  thread: MailThreadSummary;
  selected: boolean;
  onClick: () => void;
  onReply: () => void;
  onRestore: () => void;
}) => {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex items-center gap-4 px-4 py-3 cursor-pointer transition-all duration-200 border-b', 
        isDark ? 'border-[#1A1A1A]' : 'border-[#E5E5E5]',
        selected 
          ? (isDark ? 'bg-[#282828]' : 'bg-[#F0F0F0]')
          : (isDark ? 'hover:bg-[#181818] bg-transparent' : 'hover:bg-[#F9F9F9] bg-transparent')
      )}
    >
      {/* Selection Line */}
      {selected && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1DB954] shadow-[0_0_8px_rgba(29,185,84,0.4)]" />
      )}

      {/* Avatar */}
      <div className="shrink-0 relative">
         <div className={cn(
           "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-md",
           thread.unread 
             ? (isDark ? "bg-white text-black" : "bg-black text-white")
             : (isDark ? "bg-[#282828] text-[#B3B3B3]" : "bg-[#E0E0E0] text-[#5E5E5E]")
         )}>
            {thread.sender[0].toUpperCase()}
         </div>
         {thread.unread && (
           <div className={cn("absolute -top-1 -right-1 w-3 h-3 bg-[#1DB954] rounded-full border-2", isDark ? "border-[#121212]" : "border-white")} />
         )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 overflow-hidden">
         <div className="flex items-center justify-between mb-0.5">
            <span className={cn(
              "text-[15px] truncate pr-2",
              thread.unread 
                ? (isDark ? "text-white font-bold" : "text-black font-bold")
                : (isDark ? "text-[#B3B3B3] font-medium" : "text-[#5E5E5E] font-medium")
            )}>
              {thread.sender}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {thread.folder === 'trash' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestore();
                  }}
                  className={cn(
                    "text-[11px] px-2 py-0.5 rounded-full border font-bold transition-colors",
                    isDark ? "bg-[#1A1A1A] border-[#282828] text-[#B3B3B3] hover:text-white hover:bg-[#222]" : "bg-white border-[#E5E5E5] text-[#5E5E5E] hover:text-black hover:bg-[#F0F0F0]"
                  )}
                >
                  Restore
                </button>
              )}
              {thread.folder === 'inbox' && (() => {
                const importance = Math.max(1, Math.min(99, Math.round(thread.importanceScore ?? ((hashString(thread.id) % 70) + 30))));
                const tone = importance > 80 ? 'green' : importance > 50 ? 'amber' : 'red';
                return (
                  <span className={cn(
                    "text-[11px] px-2 py-0.5 rounded-full border font-bold",
                    isDark ? "bg-[#1A1A1A] border-[#282828]" : "bg-white border-[#E5E5E5]",
                    tone === 'green' && "text-[#1DB954] border-[#1DB954]/40",
                    tone === 'amber' && "text-[#F59E0B] border-[#F59E0B]/40",
                    tone === 'red' && "text-[#FF5555] border-[#FF5555]/40"
                  )}>
                    {`${importance}% imp`}
                  </span>
                );
              })()}
              {thread.folder === 'inbox' && thread.unread && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReply();
                  }}
                  className={cn(
                    "text-[11px] px-2 py-0.5 rounded-full border font-bold transition-colors",
                    isDark ? "bg-[#1A1A1A] border-[#282828] text-[#1DB954] hover:bg-[#222]" : "bg-white border-[#E5E5E5] text-[#15803D] hover:bg-[#F0F0F0]"
                  )}
                >
                  Reply
                </button>
              )}
              {thread.folder === 'spam' && (
                <span className={cn(
                  "text-[11px] px-2 py-0.5 rounded-full border",
                  isDark ? "bg-[#1A1A1A] border-[#282828] text-[#FF5555]" : "bg-white border-[#E5E5E5] text-[#B91C1C]"
                )}>
                  {`${Math.max(1, Math.min(99, Math.round(thread.spamScore ?? ((hashString(thread.id) % 40) + 60))))}% spam`}
                </span>
              )}
              <span className={cn(
                "text-[12px]",
                thread.unread ? "text-[#1DB954] font-medium" : (isDark ? "text-[#5E5E5E]" : "text-[#949494]")
              )}>
                {new Date(thread.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
         </div>
         
         <div className={cn(
           "text-[14px] truncate mb-0.5",
           thread.unread 
             ? (isDark ? "text-white font-medium" : "text-black font-medium")
             : (isDark ? "text-[#B3B3B3]" : "text-[#5E5E5E]")
         )}>
           {thread.subject}
         </div>
         
         <div className={cn("text-[13px] truncate flex items-center gap-2", isDark ? "text-[#787878]" : "text-[#949494]")}>
          {thread.folder === 'drafts' && (
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-widest shrink-0",
              isDark ? "bg-[#1A1A1A] border-[#282828] text-[#B3B3B3]" : "bg-white border-[#E5E5E5] text-[#5E5E5E]"
            )}>
              Draft
            </span>
          )}
          {thread.starred && (
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-widest shrink-0",
              isDark ? "bg-[#1A1A1A] border-[#282828] text-[#F59E0B]" : "bg-white border-[#E5E5E5] text-[#B45309]"
            )}>
              Starred
            </span>
          )}
           <span>{thread.snippet}</span>
         </div>
      </div>

      {/* Hover Actions */}
      <div className="hidden group-hover:flex items-center gap-1 pl-2">
         <button className={cn("p-2 rounded-full transition-colors", isDark ? "text-[#B3B3B3] hover:text-white hover:bg-[#282828]" : "text-[#949494] hover:text-black hover:bg-[#E0E0E0]")} title={t('archive')}>
           <Archive size={16} />
         </button>
         <button className={cn("p-2 rounded-full transition-colors", isDark ? "text-[#B3B3B3] hover:text-[#FF5555] hover:bg-[#282828]" : "text-[#949494] hover:text-[#FF5555] hover:bg-[#E0E0E0]")} title={t('delete')}>
           <Trash2 size={16} />
         </button>
      </div>
    </div>
  );
};

const ReadingPane = ({
  thread,
  loading,
  onBack,
  showBack,
  userName,
}: {
  thread: MailThreadDetail | null;
  loading: boolean;
  onBack?: () => void;
  showBack: boolean;
  userName?: string;
}) => {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const [quickReply, setQuickReply] = useState('');
  const [quickReplyAttachments, setQuickReplyAttachments] = useState<File[]>([]);
  const [replyReminderDismissed, setReplyReminderDismissed] = useState(false);
  const quickReplyFileRef = useRef<HTMLInputElement>(null);

  if (loading) {
    return (
      <div className={cn("flex-1 flex items-center justify-center", isDark ? "bg-[#121212]" : "bg-white")}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#1DB954]/30 border-t-[#1DB954] rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!thread) {
    return (
      <div className={cn("flex-1 flex flex-col items-center justify-center p-8 relative overflow-hidden", isDark ? "bg-[#121212]" : "bg-white")}>
        {/* Background Pattern */}
        {isDark && <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1DB954]/5 via-[#121212] to-[#121212] pointer-events-none" />}
        
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 flex flex-col items-center"
        >
           {/* Hero Icon */}
           <div className="relative group mb-10">
              <div className="absolute -inset-8 bg-[#1DB954]/20 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className={cn(
                "relative w-40 h-40 rounded-[2.5rem] flex items-center justify-center shadow-2xl border group-hover:scale-105 transition-all duration-500",
                isDark 
                  ? "bg-gradient-to-br from-[#1A1A1A] to-[#0F0F0F] border-[#282828] group-hover:border-[#1DB954]/50 shadow-[0_20px_60px_rgba(0,0,0,0.5)]" 
                  : "bg-white border-[#E5E5E5] group-hover:border-[#1DB954]/50 shadow-[0_20px_40px_rgba(0,0,0,0.1)]"
              )}>
                  <div className={cn("absolute inset-0 rounded-[2.5rem] pointer-events-none", isDark ? "bg-gradient-to-br from-white/5 to-transparent" : "")} />
                  <Inbox size={64} strokeWidth={1} className={cn("transition-colors duration-500 drop-shadow-2xl", isDark ? "text-[#5E5E5E] group-hover:text-[#1DB954]" : "text-[#949494] group-hover:text-[#1DB954]")} />
                  
                  {/* Floating Elements */}

              </div>
           </div>
        
           <h2 className={cn("text-4xl font-bold mb-4 tracking-tight text-center", isDark ? "text-white" : "text-black")}>{t('inbox_ready')}</h2>
           <p className={cn("text-center max-w-md text-lg leading-relaxed mb-10", isDark ? "text-[#787878]" : "text-[#5E5E5E]")}>
             {t('select_conversation')}
           </p>

           {/* Quick Actions */}
           <div className="flex items-center gap-4">
              <button className="flex items-center gap-3 px-6 py-3 bg-[#1DB954] hover:bg-[#1ED760] text-black rounded-full font-bold transition-transform hover:scale-105 active:scale-95 shadow-[0_8px_20px_rgba(29,185,84,0.3)]">
                 <Pencil size={18} strokeWidth={2.5} />
                 <span>{t('compose_new')}</span>
              </button>
              <div className={cn("flex items-center gap-3 px-6 py-3 border rounded-full", isDark ? "bg-[#1A1A1A] border-[#282828] text-[#B3B3B3]" : "bg-white border-[#E5E5E5] text-[#5E5E5E]")}>
                 <span className="font-mono text-sm">{t('press')}</span>
                 <kbd className={cn("h-6 min-w-[24px] px-1.5 flex items-center justify-center rounded border font-mono text-xs font-bold", isDark ? "bg-[#282828] border-[#333] text-white" : "bg-[#F0F0F0] border-[#E0E0E0] text-black")}>C</kbd>
              </div>
           </div>
        </motion.div>
      </div>
    );
  }

  const handleQuickReplyAttach = () => {
    quickReplyFileRef.current?.click();
  };

  const handleQuickReplyFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    if (!selected.length) return;
    setQuickReplyAttachments(prev => [...prev, ...selected]);
    e.target.value = '';
  };

  const removeQuickReplyAttachment = (index: number) => {
    setQuickReplyAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const extractBodyFromDraft = (draft: string) => {
    const normalized = draft.replace(/\r\n/g, '\n');
    if (!normalized.startsWith('Subject:')) return normalized.trim();
    const parts = normalized.split('\n\n');
    if (parts.length <= 1) return normalized.trim();
    return parts.slice(1).join('\n\n').trim();
  };

  const handleQuickReplyAI = () => {
    const last = thread.messages[thread.messages.length - 1];
    const ctx: MailAIContext = {
      threadId: thread.id,
      subject: thread.subject,
      fromName: last?.fromName,
      fromAddress: last?.fromAddress,
      date: last?.date,
      snippet: last?.text?.replace(/\s+/g, ' ').trim().slice(0, 140) || undefined,
      latestText: last?.text,
      latestHtml: last?.html,
      attachments: last?.attachments?.map(a => ({ filename: a.filename, mimeType: a.mimeType, size: a.size })) || undefined,
      messageCount: thread.messages.length,
    };
    const draft = generateReplyDraft(ctx, userName);
    setQuickReply(extractBodyFromDraft(draft));
  };

  return (
    <div className={cn("flex-1 flex flex-col h-full relative overflow-hidden", isDark ? "bg-[#121212]" : "bg-white")}>
      {/* Spotify Gradient Overlay */}
      {isDark && <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-[#1DB954]/10 via-[#1DB954]/[0.02] to-transparent pointer-events-none z-0" />}
      
      {/* Toolbar */}
      <div className={cn(
        "h-16 flex items-center justify-between px-8 border-b backdrop-blur-xl sticky top-0 z-10",
        isDark ? "border-[#282828] bg-[#121212]/80" : "border-[#E5E5E5] bg-white/80"
      )}>
        <div className="flex items-center gap-4">
          {showBack && (
            <button onClick={onBack} className={cn("p-2 -ml-2 rounded-full", isDark ? "text-[#B3B3B3] hover:text-white hover:bg-[#282828]" : "text-[#5E5E5E] hover:text-black hover:bg-[#F0F0F0]")}>
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="flex items-center gap-2">
            <button className={cn("p-2 rounded-full transition-colors", isDark ? "text-[#B3B3B3] hover:text-white hover:bg-[#282828]" : "text-[#5E5E5E] hover:text-black hover:bg-[#F0F0F0]")} title={t('archive')}>
              <Archive size={18} />
            </button>
            <button className={cn("p-2 rounded-full transition-colors", isDark ? "text-[#B3B3B3] hover:text-[#FF5555] hover:bg-[#282828]" : "text-[#5E5E5E] hover:text-[#FF5555] hover:bg-[#F0F0F0]")} title={t('delete')}>
              <Trash2 size={18} />
            </button>
            <button className={cn("p-2 rounded-full transition-colors", isDark ? "text-[#B3B3B3] hover:text-white hover:bg-[#282828]" : "text-[#5E5E5E] hover:text-black hover:bg-[#F0F0F0]")} title={t('mark_unread')}>
              <Clock size={18} />
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <span className={cn("text-xs mr-2", isDark ? "text-[#5E5E5E]" : "text-[#949494]")}>{t('conversation')}</span>
           <button className={cn("p-2 rounded-full", isDark ? "text-[#B3B3B3] hover:text-white hover:bg-[#282828]" : "text-[#5E5E5E] hover:text-black hover:bg-[#F0F0F0]")}>
             <MoreVertical size={18} />
           </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 relative z-10">
        <div className="max-w-3xl mx-auto pb-20">
          {(() => {
            const last = thread.messages[thread.messages.length - 1];
            const isUnread = Boolean(last && last.flags && last.flags.seen === false);
            if (!isUnread || replyReminderDismissed) return null;
            return (
              <div className={cn(
                "mb-6 rounded-2xl border p-4 flex items-center justify-between gap-4",
                isDark ? "bg-[#1A1A1A] border-[#282828]" : "bg-[#F9F9F9] border-[#E5E5E5]"
              )}>
                <div className="min-w-0">
                  <div className={cn("text-sm font-bold", isDark ? "text-white" : "text-black")}>Unread email</div>
                  <div className={cn("text-[12px] mt-0.5 truncate", isDark ? "text-[#B3B3B3]" : "text-[#5E5E5E]")}>
                    Reply recommended. Generate a draft reply automatically.
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setReplyReminderDismissed(true)}
                    className={cn(
                      "px-3 py-2 rounded-full text-xs font-bold border transition-colors",
                      isDark ? "bg-transparent border-[#282828] text-[#B3B3B3] hover:text-white hover:bg-[#222]" : "bg-white border-[#E5E5E5] text-[#5E5E5E] hover:text-black hover:bg-[#F0F0F0]"
                    )}
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={handleQuickReplyAI}
                    className="px-4 py-2 rounded-full text-xs font-bold bg-[#1DB954] hover:bg-[#1ED760] text-black transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
                  >
                    <Sparkles size={14} />
                    Draft reply
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Subject */}
          <div className="flex items-start justify-between gap-4 mb-8">
             <h1 className={cn("text-[28px] font-bold leading-tight", isDark ? "text-white" : "text-black")}>
               {thread.subject}
             </h1>
             <button className={cn("shrink-0 p-2 rounded-full transition-colors", isDark ? "text-[#B3B3B3] hover:text-[#1DB954] hover:bg-[#282828]" : "text-[#5E5E5E] hover:text-[#1DB954] hover:bg-[#F0F0F0]")}>
               <Star size={20} />
             </button>
          </div>

          {/* Messages */}
          <div className="space-y-8">
            {thread.messages.map((msg, idx) => {
               const isLast = idx === thread.messages.length - 1;
               const senderInitial = (msg.fromName || msg.fromAddress || '?')[0].toUpperCase();
               
               return (
                 <div key={msg.id} className={cn("group transition-all duration-300", !isLast && "opacity-60 hover:opacity-100")}>
                    <div className="flex items-center justify-between mb-4">
                       <div className="flex items-center gap-3">
                          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border", isDark ? "bg-gradient-to-b from-[#333] to-[#181818] text-white border-[#282828]" : "bg-gradient-to-b from-[#F5F5F5] to-white text-black border-[#E5E5E5]")}>
                            {senderInitial}
                          </div>
                          <div>
                             <div className="flex items-baseline gap-2">
                               <span className={cn("text-[15px] font-bold", isDark ? "text-white" : "text-black")}>
                                 {msg.fromName || msg.fromAddress}
                               </span>
                               <span className={cn("text-[12px]", isDark ? "text-[#787878]" : "text-[#949494]")}>
                                 {new Date(msg.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                               </span>
                             </div>
                             <div className={cn("text-[12px]", isDark ? "text-[#B3B3B3]" : "text-[#5E5E5E]")}>
                               to {msg.to.map(t => t.name || t.address).join(', ')}
                             </div>
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className={cn("p-2 rounded-full", isDark ? "text-[#B3B3B3] hover:text-white hover:bg-[#282828]" : "text-[#5E5E5E] hover:text-black hover:bg-[#F0F0F0]")} title={t('reply')}><Reply size={16}/></button>
                          <button className={cn("p-2 rounded-full", isDark ? "text-[#B3B3B3] hover:text-white hover:bg-[#282828]" : "text-[#5E5E5E] hover:text-black hover:bg-[#F0F0F0]")} title={t('forward')}><Forward size={16}/></button>
                       </div>
                    </div>
                    
                    <div className="pl-14">
                       <div 
                         className={cn("text-[15px] leading-relaxed space-y-4 font-sans whitespace-pre-wrap", isDark ? "text-[#EAEAEA]" : "text-[#121212]")}
                         dangerouslySetInnerHTML={{ __html: msg.html || msg.text || '' }}
                       />
                       
                       {msg.attachments.length > 0 && (
                         <div className="mt-6 flex flex-wrap gap-3">
                           {msg.attachments.map(att => (
                             <div key={att.id} className={cn(
                               "flex items-center gap-3 p-3 pr-4 rounded-xl border transition-all cursor-pointer group/att",
                               isDark ? "bg-[#181818] border-[#282828] hover:bg-[#222] hover:border-[#333]" : "bg-white border-[#E5E5E5] hover:bg-[#F9F9F9] hover:border-[#D4D4D4]"
                             )}>
                               <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", isDark ? "bg-[#282828]" : "bg-[#F0F0F0]")}>
                                  <FileText size={20} className={cn("group-hover/att:text-[#1DB954]", isDark ? "text-[#B3B3B3]" : "text-[#5E5E5E]")} />
                               </div>
                               <div className="flex flex-col">
                                 <span className={cn("text-[13px] font-medium truncate max-w-[150px]", isDark ? "text-white" : "text-black")}>{att.filename}</span>
                                 <span className={cn("text-[11px]", isDark ? "text-[#787878]" : "text-[#949494]")}>{(att.size / 1024).toFixed(1)} KB</span>
                               </div>
                             </div>
                           ))}
                         </div>
                       )}
                    </div>
                 </div>
               );
            })}
          </div>

          {/* Quick Reply Box */}
          <div className="mt-12 pl-14">
             <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#1DB954] to-[#1ED760] rounded-2xl opacity-0 group-focus-within:opacity-20 transition-opacity duration-500 blur" />
                <div className={cn(
                  "relative rounded-2xl border overflow-hidden focus-within:border-[#1DB954]/50 transition-colors",
                  isDark ? "bg-[#181818] border-[#282828]" : "bg-white border-[#E5E5E5]"
                )}>
                   <textarea 
                     placeholder={t('type_reply')}
                     value={quickReply}
                     onChange={(e) => setQuickReply(e.target.value)}
                     className={cn(
                       "w-full bg-transparent border-none p-4 text-[15px] focus:ring-0 min-h-[120px] resize-y",
                       isDark ? "text-white placeholder:text-[#5E5E5E]" : "text-black placeholder:text-[#949494]"
                     )}
                   />
                   <input
                     ref={quickReplyFileRef}
                     type="file"
                     multiple
                     className="hidden"
                     onChange={handleQuickReplyFiles}
                   />
                   {quickReplyAttachments.length > 0 && (
                     <div className={cn("px-4 pb-3 flex flex-wrap gap-2", isDark ? "bg-[#181818]" : "bg-white")}>
                       {quickReplyAttachments.map((file, idx) => (
                         <button
                           key={`${file.name}-${idx}`}
                           onClick={() => removeQuickReplyAttachment(idx)}
                           className={cn(
                             "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-colors",
                             isDark ? "bg-[#1A1A1A] border-[#282828] text-[#B3B3B3] hover:text-white hover:border-[#1DB954]/40" : "bg-[#F9F9F9] border-[#E5E5E5] text-[#5E5E5E] hover:text-black hover:border-[#1DB954]/40"
                           )}
                         >
                           <Paperclip size={14} />
                           <span className="max-w-[220px] truncate">{file.name}</span>
                           <X size={14} />
                         </button>
                       ))}
                     </div>
                   )}
                   <div className={cn("flex items-center justify-between px-4 py-3 border-t", isDark ? "bg-[#1A1A1A] border-[#282828]" : "bg-[#F9F9F9] border-[#E5E5E5]")}>
                      <div className="flex items-center gap-1">
                        <button onClick={handleQuickReplyAttach} className={cn("p-2 rounded-full transition-colors", isDark ? "text-[#B3B3B3] hover:text-white hover:bg-[#282828]" : "text-[#5E5E5E] hover:text-black hover:bg-[#E0E0E0]")}><Paperclip size={18}/></button>
                        <button onClick={handleQuickReplyAI} className={cn("p-2 rounded-full transition-colors", isDark ? "text-[#B3B3B3] hover:text-white hover:bg-[#282828]" : "text-[#5E5E5E] hover:text-black hover:bg-[#E0E0E0]")}><Sparkles size={18}/></button>
                      </div>
                      <button className="px-6 py-2 bg-[#1DB954] hover:bg-[#1ED760] text-black text-sm font-bold rounded-full transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
                        <span>{t('send')}</span>
                        <Send size={14} strokeWidth={2.5} />
                      </button>
                   </div>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

const ComposeModal = ({
  isMobile,
  onClose,
}: {
  isMobile: boolean;
  onClose: () => void;
}) => {
  const [sending, setSending] = useState(false);
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isDark } = useTheme();
  const { t } = useLanguage();

  const handleSend = async () => {
    if (sending) return;
    const toList = to.split(/[,\s]+/).filter(Boolean);
    const ccList = cc.split(/[,\s]+/).filter(Boolean);
    const bccList = bcc.split(/[,\s]+/).filter(Boolean);

    if (!toList.length || !subject.trim()) return;
    
    setSending(true);
    try {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = body;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';

      await api.post('/mail/send', {
        to: toList,
        cc: ccList,
        bcc: bccList,
        subject: subject.trim(),
        html: body,
        text: plainText,
      });
      onClose();
    } catch (error) {
      console.error('Failed to send mail', error);
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn("fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-lg", isDark ? "bg-black/80" : "bg-white/60")}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 30 }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className={cn(
            "w-full max-w-3xl border rounded-2xl overflow-hidden flex flex-col relative",
            isMobile ? "h-full rounded-none" : "min-h-[650px] max-h-[90vh]",
            isDark ? "bg-[#121212] border-[#282828] shadow-[0_50px_100px_rgba(0,0,0,0.8)]" : "bg-white border-[#E5E5E5] shadow-[0_50px_100px_rgba(0,0,0,0.1)]"
          )}
        >
          {/* Green Glow Top */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#1DB954] to-[#1ED760]" />
          <div className="absolute top-0 inset-x-0 h-32 bg-[#1DB954]/10 blur-3xl pointer-events-none" />

          {/* Header */}
          <div className={cn("flex items-center justify-between px-8 py-5 border-b backdrop-blur-md relative z-10", isDark ? "border-[#282828] bg-[#121212]/90" : "border-[#E5E5E5] bg-white/90")}>
            <span className={cn("text-lg font-bold tracking-tight", isDark ? "text-white" : "text-black")}>{t('new_message')}</span>
            <button 
              onClick={onClose} 
              className={cn("p-2 rounded-full transition-colors", isDark ? "text-[#787878] hover:text-white hover:bg-[#282828]" : "text-[#949494] hover:text-black hover:bg-[#F0F0F0]")}
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Body */}
          <div className={cn("flex-1 flex flex-col relative z-10", isDark ? "bg-[#121212]" : "bg-white")}>
            <div className={cn("px-8 pt-4 pb-2", isDark ? "bg-[#121212]" : "bg-white")}>
              <div className={cn("flex items-center border-b relative group transition-colors focus-within:border-[#1DB954]/50", isDark ? "border-[#282828]" : "border-[#E5E5E5]")}>
                <span className={cn("text-[14px] font-medium w-16 py-4", isDark ? "text-[#787878]" : "text-[#949494]")}>{t('to')}</span>
                <input
                  value={to}
                  onChange={e => setTo(e.target.value)}
                  className={cn(
                    "flex-1 bg-transparent border-none py-4 text-[15px] focus:ring-0 focus:outline-none",
                    isDark ? "text-white placeholder:text-[#5E5E5E]" : "text-black placeholder:text-[#949494]"
                  )}
                  placeholder={t('recipients_placeholder')}
                  autoFocus
                />
                {!showCcBcc && (
                  <button 
                    onClick={() => setShowCcBcc(true)}
                    className={cn("absolute right-0 top-1/2 -translate-y-1/2 text-xs font-medium hover:text-[#1DB954] px-2 py-1 rounded transition-colors", isDark ? "text-[#787878] hover:bg-[#1A1A1A]" : "text-[#949494] hover:bg-[#F0F0F0]")}
                  >
                    Cc/Bcc
                  </button>
                )}
              </div>

              {showCcBcc && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className={cn("flex items-center border-b focus-within:border-[#1DB954]/50 transition-colors", isDark ? "border-[#282828]" : "border-[#E5E5E5]")}>
                    <span className={cn("text-[14px] font-medium w-16 py-3", isDark ? "text-[#787878]" : "text-[#949494]")}>{t('cc')}</span>
                    <input
                      value={cc}
                      onChange={e => setCc(e.target.value)}
                      className={cn(
                        "flex-1 bg-transparent border-none py-3 text-[14px] focus:ring-0 focus:outline-none",
                        isDark ? "text-white placeholder:text-[#5E5E5E]" : "text-black placeholder:text-[#949494]"
                      )}
                    />
                  </div>
                  <div className={cn("flex items-center border-b focus-within:border-[#1DB954]/50 transition-colors", isDark ? "border-[#282828]" : "border-[#E5E5E5]")}>
                    <span className={cn("text-[14px] font-medium w-16 py-3", isDark ? "text-[#787878]" : "text-[#949494]")}>{t('bcc')}</span>
                    <input
                      value={bcc}
                      onChange={e => setBcc(e.target.value)}
                      className={cn(
                        "flex-1 bg-transparent border-none py-3 text-[14px] focus:ring-0 focus:outline-none",
                        isDark ? "text-white placeholder:text-[#5E5E5E]" : "text-black placeholder:text-[#949494]"
                      )}
                    />
                  </div>
                </motion.div>
              )}

              <div className="flex items-center focus-within:border-[#1DB954]/50 transition-colors border-b border-transparent">
                <span className={cn("text-[14px] font-medium w-16 py-4", isDark ? "text-[#787878]" : "text-[#949494]")}>{t('subject')}</span>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className={cn(
                    "flex-1 bg-transparent border-none py-4 text-[15px] font-bold focus:ring-0 focus:outline-none",
                    isDark ? "text-white placeholder:text-[#5E5E5E]" : "text-black placeholder:text-[#949494]"
                  )}
                  placeholder={t('subject_placeholder')}
                />
              </div>
            </div>

            <div className={cn("flex-1 flex flex-col min-h-0", isDark ? "bg-[#121212]" : "bg-white")}>
               <RichTextEditor
                 value={body}
                 onChange={setBody}
                 placeholder={t('body_placeholder')}
                 isDark={isDark}
                 className="flex-1"
               />
               
               {/* Attachments List */}
               {attachments.length > 0 && (
                 <div className="px-8 mt-2 mb-4 flex flex-wrap gap-3">
                   {attachments.map((file, i) => (
                     <div key={i} className={cn("flex items-center gap-3 px-4 py-2 rounded-xl border group hover:border-[#1DB954]/30 transition-colors", isDark ? "bg-[#1A1A1A] border-[#282828]" : "bg-[#F9F9F9] border-[#E5E5E5]")}>
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", isDark ? "bg-[#222]" : "bg-[#F0F0F0]")}>
                           <FileText size={16} className="text-[#1DB954]" />
                        </div>
                        <div className="flex flex-col">
                           <span className={cn("text-sm font-medium max-w-[180px] truncate", isDark ? "text-white" : "text-black")}>{file.name}</span>
                           <span className={cn("text-[10px]", isDark ? "text-[#787878]" : "text-[#949494]")}>{(file.size / 1024).toFixed(0)} KB</span>
                        </div>
                        <button onClick={() => removeAttachment(i)} className={cn("ml-2 hover:text-[#FF5555] transition-colors", isDark ? "text-[#5E5E5E]" : "text-[#949494]")}>
                          <X size={16} />
                        </button>
                     </div>
                   ))}
                 </div>
               )}
            </div>
          </div>

          {/* Footer */}
          <div className={cn("px-8 py-5 border-t flex items-center justify-between relative z-10", isDark ? "border-[#282828] bg-[#121212]" : "border-[#E5E5E5] bg-white")}>
             <div className="flex items-center gap-1">
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn("p-2.5 rounded-full transition-colors", isDark ? "text-[#B3B3B3] hover:text-white hover:bg-[#1A1A1A]" : "text-[#5E5E5E] hover:text-black hover:bg-[#F0F0F0]")} title={t('attach_files')}
                >
                  <Paperclip size={20} />
                </button>
                <div className={cn("w-[1px] h-6 mx-2", isDark ? "bg-[#282828]" : "bg-[#E5E5E5]")} />
                <button 
                  onClick={onClose}
                  className={cn("p-2.5 rounded-full transition-colors", isDark ? "text-[#B3B3B3] hover:text-[#FF5555] hover:bg-[#1A1A1A]" : "text-[#5E5E5E] hover:text-[#FF5555] hover:bg-[#F0F0F0]")} title={t('delete_draft')}
                >
                  <Trash2 size={20} />
                </button>
             </div>
             
             <button
               onClick={handleSend}
               disabled={sending}
               className="pl-8 pr-8 py-3 bg-[#1DB954] hover:bg-[#1ED760] text-black text-[15px] font-bold rounded-full transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_8px_20px_rgba(29,185,84,0.3)] hover:shadow-[0_12px_30px_rgba(29,185,84,0.4)]"
             >
               {sending ? (
                 <div className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"/> 
                    <span>{t('sending')}</span>
                 </div>
               ) : (
                 <div className="flex items-center gap-2">
                    <span>{t('send')}</span>
                    <Send size={16} strokeWidth={2.5} />
                 </div>
               )}
             </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const MobileNavItem = ({
  icon: Icon,
  label,
  isActive,
  onClick,
  isDark,
}: {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  onClick: () => void;
  isDark: boolean;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "relative flex flex-col items-center justify-center w-14 h-full transition-all duration-300",
      isActive
        ? (isDark ? "text-white" : "text-black")
        : (isDark ? "text-[#787878] hover:text-white" : "text-[#949494] hover:text-black")
    )}
  >
    <div
      className={cn(
        "absolute -top-1 w-8 h-1 rounded-b-full bg-[#1DB954] transition-all duration-300",
        isActive ? "opacity-100 shadow-[0_2px_10px_#1DB954]" : "opacity-0 -translate-y-2"
      )}
    />

    <Icon
      size={22}
      strokeWidth={isActive ? 2.5 : 2}
      className={cn("transition-transform duration-300", isActive && "scale-110")}
    />
    <span
      className={cn(
        "text-[10px] font-medium mt-1 transition-all duration-300",
        isActive ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 hidden"
      )}
    >
      {label}
    </span>
  </button>
);

const MobileNav = ({
  activeFolder,
  onFolderChange,
  onCompose,
  onMenu
}: {
  activeFolder: MailFolder;
  onFolderChange: (f: MailFolder) => void;
  onCompose: () => void;
  onMenu: () => void;
}) => {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  return (
    <div className="fixed bottom-6 inset-x-4 z-40 flex justify-center">
      <div className={cn(
        "w-full max-w-md h-16 rounded-2xl flex items-center justify-between px-6 backdrop-blur-xl border shadow-2xl relative",
        isDark 
          ? "bg-[#121212]/85 border-[#282828] shadow-black/50" 
          : "bg-white/85 border-[#E5E5E5] shadow-black/10"
      )}>
        <MobileNavItem 
          icon={Inbox} 
          label={t('inbox')} 
          isActive={activeFolder === 'inbox'} 
          onClick={() => onFolderChange('inbox')}
          isDark={isDark}
        />
        
        <MobileNavItem 
          icon={Send} 
          label={t('sent')} 
          isActive={activeFolder === 'sent'} 
          onClick={() => onFolderChange('sent')}
          isDark={isDark}
        />

        {/* Floating Compose Button */}
        <div className="relative -top-6">
           <div className={cn(
             "absolute inset-0 rounded-full blur-xl opacity-40 bg-[#1DB954]"
           )} />
           <button 
             onClick={onCompose}
             className="relative w-14 h-14 bg-gradient-to-tr from-[#1DB954] to-[#1ED760] rounded-full flex items-center justify-center shadow-[0_8px_20px_rgba(29,185,84,0.3)] text-black transition-transform active:scale-95 group border-4 border-transparent bg-clip-padding"
             style={{ borderColor: isDark ? '#000' : '#fff' }}
           >
             <Pencil size={24} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform duration-300" />
           </button>
        </div>

        <MobileNavItem 
          icon={FileText} 
          label={t('drafts')} 
          isActive={activeFolder === 'drafts'} 
          onClick={() => onFolderChange('drafts')}
          isDark={isDark}
        />
        
        <MobileNavItem 
          icon={Menu} 
          label={t('more')} 
          isActive={false} 
          onClick={onMenu}
          isDark={isDark}
        />
      </div>
    </div>
  );
};

const TypingGreeting = () => {
  const { t } = useLanguage();
  const [text, setText] = useState("");
  const fullText = t('welcome_back');
  const { isDark } = useTheme();

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      if (index <= fullText.length) {
        setText(fullText.slice(0, index));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 100); // 100ms typing speed
    return () => clearInterval(interval);
  }, [fullText]);

  return (
    <div className="hidden xl:flex items-center min-w-[140px]">
        <span className={cn("text-2xl font-bold font-sans tracking-tighter", isDark ? "text-white" : "text-black")}>
            {text}
            <span className="animate-pulse text-[#1DB954]">|</span>
        </span>
    </div>
  );
};

const SettingsDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-3 rounded-full transition-colors relative border border-transparent",
          isDark ? "text-[#B3B3B3] hover:text-white hover:bg-[#1A1A1A] hover:border-[#282828]" : "text-[#5E5E5E] hover:text-black hover:bg-[#F0F0F0] hover:border-[#E5E5E5]"
        )}
      >
        <Settings size={20} className={cn("transition-transform duration-500", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setIsOpen(false); setLangMenuOpen(false); }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", duration: 0.3 }}
              className={cn(
                "absolute right-0 top-full mt-2 w-64 border rounded-2xl shadow-2xl z-50 overflow-hidden",
                isDark ? "bg-[#181818] border-[#282828]" : "bg-white border-[#E5E5E5]"
              )}
            >
              <div className="p-2 space-y-1">
                {/* Language */}
                <div className="relative">
                  <button 
                    onClick={() => setLangMenuOpen(!langMenuOpen)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-xl transition-colors group",
                      isDark ? "text-[#EAEAEA] hover:bg-[#282828]" : "text-[#121212] hover:bg-[#F5F5F5]"
                    )}
                  >
                     <div className="flex items-center gap-3">
                        <Globe size={18} className={cn("group-hover:text-white", isDark ? "text-[#787878]" : "text-[#949494] group-hover:text-black")} />
                        <span>{t('language')}</span>
                     </div>
                     <div className="flex items-center gap-2">
                       <span className={cn("text-xs font-medium", isDark ? "text-[#5E5E5E]" : "text-[#949494]")}>
                         {LANGUAGES.find(l => l.code === language)?.name}
                       </span>
                       <ChevronRight size={14} className={cn("transition-transform", langMenuOpen && "rotate-90", isDark ? "text-[#5E5E5E]" : "text-[#949494]")} />
                     </div>
                  </button>
                  
                  <AnimatePresence>
                    {langMenuOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden pl-4 pr-1"
                      >
                        <div className={cn("mt-1 p-1 rounded-xl border space-y-0.5", isDark ? "bg-[#121212] border-[#282828]" : "bg-[#F9F9F9] border-[#E5E5E5]")}>
                          {LANGUAGES.map(lang => (
                            <button
                              key={lang.code}
                              onClick={() => {
                                setLanguage(lang.code);
                                setLangMenuOpen(false);
                              }}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors",
                                language === lang.code 
                                  ? (isDark ? "bg-[#1DB954]/10 text-[#1DB954]" : "bg-[#1DB954]/10 text-[#1DB954]")
                                  : (isDark ? "text-[#B3B3B3] hover:text-white hover:bg-[#1A1A1A]" : "text-[#5E5E5E] hover:text-black hover:bg-[#EAEAEA]")
                              )}
                            >
                              <span>{lang.nativeName}</span>
                              {language === lang.code && <div className="w-1.5 h-1.5 rounded-full bg-[#1DB954]" />}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Theme Toggle */}
                <button 
                  onClick={toggleTheme}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-xl transition-colors group",
                    isDark ? "text-[#EAEAEA] hover:bg-[#282828]" : "text-[#121212] hover:bg-[#F5F5F5]"
                  )}
                >
                   <div className="flex items-center gap-3">
                      {isDark ? (
                        <Moon size={18} className="text-[#787878] group-hover:text-white" />
                      ) : (
                        <Sun size={18} className="text-[#949494] group-hover:text-black" />
                      )}
                      <span>{t('dark_mode')}</span>
                   </div>
                   <div className={cn(
                     "w-9 h-5 rounded-full relative transition-colors duration-300",
                     isDark ? "bg-[#1DB954]" : "bg-[#E0E0E0]"
                   )}>
                     <div className={cn(
                       "absolute top-1 w-3 h-3 rounded-full bg-white transition-transform duration-300 shadow-sm",
                       isDark ? "left-5" : "left-1"
                     )} />
                   </div>
                </button>

                <div className={cn("h-[1px] my-1 mx-2", isDark ? "bg-[#282828]" : "bg-[#E5E5E5]")} />

                {/* Feedback */}
                <a 
                  href="mailto:feedback@aethermail.com?subject=AetherMail Feedback"
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-colors group",
                    isDark ? "text-[#EAEAEA] hover:bg-[#282828]" : "text-[#121212] hover:bg-[#F5F5F5]"
                  )}
                >
                   <MessageSquare size={18} className={cn("group-hover:text-[#1DB954]", isDark ? "text-[#787878]" : "text-[#949494]")} />
                   <span>{t('send_feedback')}</span>
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Preloader ---

const Preloader = ({ onComplete }: { onComplete: () => void }) => {
  const { isDark } = useTheme();
  
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0, pointerEvents: "none" }}
      transition={{ duration: 0.8, delay: 2.0, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={onComplete}
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center",
        isDark ? "bg-[#050507]" : "bg-[#F9F9F9]"
      )}
    >
      <div className="flex flex-col items-center gap-6">
         <div className="flex items-center gap-1 h-8 overflow-hidden">
            <motion.div 
              initial={{ y: 30 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className={cn("text-2xl font-bold tracking-tighter", isDark ? "text-white" : "text-black")}
            >
              AetherMail
            </motion.div>
            <motion.div
               initial={{ scale: 0 }}
               animate={{ scale: 1 }}
               transition={{ duration: 0.5, delay: 0.4, type: "spring" }}
               className={cn("w-2 h-2 rounded-full mt-2", isDark ? "bg-white" : "bg-black")}
            />
         </div>
         <div className={cn("w-48 h-[1px] relative overflow-hidden", isDark ? "bg-white/10" : "bg-black/10")}>
            <motion.div 
               initial={{ x: "-100%" }}
               animate={{ x: "100%" }}
               transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity }}
               className={cn("absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-current to-transparent", isDark ? "text-white" : "text-black")}
            />
         </div>
         <div className={cn("flex gap-4 text-[10px] font-mono uppercase tracking-widest", isDark ? "text-[#444]" : "text-[#999]")}>
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>Syncing</motion.span>
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>Decryption</motion.span>
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}>Ready</motion.span>
         </div>
      </div>
    </motion.div>
  );
};

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'] as const;
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  const decimals = idx === 0 ? 0 : idx === 1 ? 0 : 1;
  return `${value.toFixed(decimals)} ${units[idx]}`;
};

const computeMailboxBytes = (mailbox: DemoMailbox) => {
  const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  let total = 0;
  for (const detail of Object.values(mailbox.detailById)) {
    for (const msg of detail.messages) {
      const body = (msg.text && msg.text.trim()) ? msg.text : (msg.html || '');
      if (body) {
        total += encoder ? encoder.encode(body).length : body.length;
      }
      for (const att of msg.attachments) total += att.size;
    }
  }
  return total;
};

const StorageModal = ({
  isOpen,
  onClose,
  isDark,
  usedBytes,
  quotaBytes,
  mailCount,
  isEstimate,
}: {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  usedBytes: number;
  quotaBytes: number;
  mailCount: number;
  isEstimate: boolean;
}) => {
  const pct = quotaBytes > 0 ? Math.min(100, Math.max(0, Math.round((usedBytes / quotaBytes) * 100))) : 0;
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className={cn(
              "fixed z-[91] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-lg rounded-3xl border shadow-2xl overflow-hidden",
              isDark ? "bg-[#0B0B0B] border-[#1A1A1A]" : "bg-white border-[#E5E5E5]"
            )}
          >
            <div className={cn("px-6 py-5 flex items-center justify-between border-b", isDark ? "border-[#1A1A1A]" : "border-[#E5E5E5]")}>
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center border", isDark ? "bg-[#121212] border-[#282828]" : "bg-[#F9F9F9] border-[#E5E5E5]")}>
                  <Inbox size={18} className={cn(isDark ? "text-white" : "text-black")} />
                </div>
                <div className="min-w-0">
                  <div className={cn("font-bold tracking-tight", isDark ? "text-white" : "text-black")}>Storage</div>
                  <div className={cn("text-[12px] mt-0.5", isDark ? "text-[#787878]" : "text-[#5E5E5E]")}>
                    {isEstimate ? "Estimated from currently loaded mail" : "Calculated from mailbox"}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  isDark ? "text-[#B3B3B3] hover:text-white hover:bg-[#1A1A1A]" : "text-[#5E5E5E] hover:text-black hover:bg-[#F0F0F0]"
                )}
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-6">
              <div className={cn("text-sm font-bold", isDark ? "text-white" : "text-black")}>
                {formatBytes(usedBytes)} used
              </div>
              <div className={cn("text-[12px] mt-1", isDark ? "text-[#787878]" : "text-[#5E5E5E]")}>
                {`${formatBytes(quotaBytes)} total • ${pct}%`}
              </div>

              <div className={cn("mt-4 w-full h-2.5 rounded-full overflow-hidden", isDark ? "bg-[#1A1A1A]" : "bg-[#E5E5E5]")}>
                <div className="h-full bg-[#1DB954] rounded-full" style={{ width: `${pct}%` }} />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className={cn("rounded-2xl border px-4 py-3", isDark ? "bg-[#121212] border-[#1A1A1A]" : "bg-[#F9F9F9] border-[#E5E5E5]")}>
                  <div className={cn("text-[11px] uppercase tracking-widest font-mono", isDark ? "text-[#5E5E5E]" : "text-[#737373]")}>Mails</div>
                  <div className={cn("mt-1 text-lg font-bold", isDark ? "text-white" : "text-black")}>{mailCount}</div>
                </div>
                <div className={cn("rounded-2xl border px-4 py-3", isDark ? "bg-[#121212] border-[#1A1A1A]" : "bg-[#F9F9F9] border-[#E5E5E5]")}>
                  <div className={cn("text-[11px] uppercase tracking-widest font-mono", isDark ? "text-[#5E5E5E]" : "text-[#737373]")}>Free</div>
                  <div className={cn("mt-1 text-lg font-bold", isDark ? "text-white" : "text-black")}>
                    {formatBytes(Math.max(0, quotaBytes - usedBytes))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const ProfileModal = ({
  isOpen,
  onClose,
  isDark,
  email,
  name,
  setName,
  avatarUrl,
  setAvatarUrl,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  email: string;
  name: string;
  setName: (v: string) => void;
  avatarUrl?: string | null;
  setAvatarUrl: (v: string | null) => void;
  onSave: () => void;
}) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const pickFile = () => fileRef.current?.click();

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result;
      if (typeof res === 'string') setAvatarUrl(res);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[92] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className={cn(
              "fixed z-[93] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-lg rounded-3xl border shadow-2xl overflow-hidden",
              isDark ? "bg-[#0B0B0B] border-[#1A1A1A]" : "bg-white border-[#E5E5E5]"
            )}
          >
            <div className={cn("px-6 py-5 flex items-center justify-between border-b", isDark ? "border-[#1A1A1A]" : "border-[#E5E5E5]")}>
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center border overflow-hidden", isDark ? "bg-[#121212] border-[#282828]" : "bg-[#F9F9F9] border-[#E5E5E5]")}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
                  ) : (
                    <span className={cn("font-black", isDark ? "text-white" : "text-black")}>{name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className={cn("font-bold tracking-tight", isDark ? "text-white" : "text-black")}>Profile</div>
                  <div className={cn("text-[12px] mt-0.5 truncate", isDark ? "text-[#787878]" : "text-[#5E5E5E]")}>{email}</div>
                </div>
              </div>
              <button
                onClick={onClose}
                className={cn(
                  "p-2 rounded-full transition-colors",
                  isDark ? "text-[#B3B3B3] hover:text-white hover:bg-[#1A1A1A]" : "text-[#5E5E5E] hover:text-black hover:bg-[#F0F0F0]"
                )}
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-6">
              <div className={cn("text-[11px] uppercase tracking-widest font-mono", isDark ? "text-[#5E5E5E]" : "text-[#737373]")}>Display name</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={cn(
                  "mt-2 w-full h-12 px-4 rounded-2xl border bg-transparent text-[15px] focus:outline-none focus:ring-1 focus:ring-[#1DB954]/40 focus:border-[#1DB954]/40",
                  isDark ? "border-[#1A1A1A] text-white placeholder:text-[#5E5E5E]" : "border-[#E5E5E5] text-black placeholder:text-[#949494]"
                )}
                placeholder="Your name"
              />

              <div className="mt-5 flex items-center justify-between gap-3">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
                <button
                  onClick={pickFile}
                  className={cn(
                    "px-4 py-2.5 rounded-full text-xs font-bold border transition-all hover:scale-[1.02] active:scale-[0.98]",
                    isDark ? "bg-white/[0.05] border-[#1A1A1A] text-white hover:bg-white/[0.08]" : "bg-black/[0.03] border-[#E5E5E5] text-black hover:bg-black/[0.06]"
                  )}
                >
                  Change photo
                </button>
                <button
                  onClick={() => setAvatarUrl(null)}
                  className={cn(
                    "px-4 py-2.5 rounded-full text-xs font-bold border transition-colors",
                    isDark ? "bg-transparent border-[#1A1A1A] text-[#B3B3B3] hover:text-white hover:bg-white/[0.06]" : "bg-white border-[#E5E5E5] text-[#5E5E5E] hover:text-black hover:bg-[#F0F0F0]"
                  )}
                >
                  Remove
                </button>
                <button
                  onClick={onSave}
                  className="ml-auto px-5 py-2.5 rounded-full text-xs font-bold bg-[#1DB954] hover:bg-[#1ED760] text-black transition-transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// --- Main App Content ---

const MailAppContent = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const navigate = useNavigate();
  const { isMobile, isDesktop } = useViewport();
  const { isDark } = useTheme();
  const { t } = useLanguage();
  
  // State
  const [loading, setLoading] = useState(true);
  const [contentVisible, setContentVisible] = useState(false);
  const [activeFolder, setActiveFolder] = useState<MailFolder>('inbox');
  const [threads, setThreads] = useState<MailThreadSummary[]>([]);
  const [threadsCursor, setThreadsCursor] = useState<string | undefined>(undefined);
  const [threadsLoading, setThreadsLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [threadDetail, setThreadDetail] = useState<MailThreadDetail | null>(null);
  const [threadDetailLoading, setThreadDetailLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [askAIOpen, setAskAIOpen] = useState(false);
  const [starredOnly, setStarredOnly] = useState(false);
  const [replyReminderSnoozeUntil, setReplyReminderSnoozeUntil] = useState<number>(0);
  const [trashReminderDismissed, setTrashReminderDismissed] = useState(false);
  const [storageModalOpen, setStorageModalOpen] = useState(false);
  const [storageUsedBytes, setStorageUsedBytes] = useState(0);
  const [storageIsEstimate, setStorageIsEstimate] = useState(true);
  const [demoMailboxVersion, setDemoMailboxVersion] = useState(0);
  const [newMailToasts, setNewMailToasts] = useState<{ id: string; threadId: string; sender: string; subject: string; snippet?: string; receivedAt: number }[]>([]);
  const [searchFilterOpen, setSearchFilterOpen] = useState(false);
  const [searchFilters, setSearchFilters] = useState<{
    unreadOnly: boolean;
    starredOnly: boolean;
    highImportanceOnly: boolean;
  }>({ unreadOnly: false, starredOnly: false, highImportanceOnly: false });
  const [searchListening, setSearchListening] = useState(false);
  const [systemToasts, setSystemToasts] = useState<{ id: string; title: string; message: string }[]>([]);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [profileDraftName, setProfileDraftName] = useState('');
  const [profileDraftAvatarUrl, setProfileDraftAvatarUrl] = useState<string | null>(null);
  const demoMailboxRef = useRef<DemoMailbox | null>(null);
  const storageQuotaBytes = 2 * 1024 * 1024 * 1024;
  const demoIncomingSeqRef = useRef(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const speechRef = useRef<unknown>(null);

  const profileStorageKey = useMemo(() => {
    const email = user?.email || '';
    if (!email) return '';
    return `aethermail.profile.${email.toLowerCase()}`;
  }, [user?.email]);

  // Handle Loading
  useEffect(() => {
    if (loading) {
       // Optional: Lock body scroll if needed, though app is h-screen
    } else {
       setTimeout(() => setContentVisible(true), 100);
    }
  }, [loading]);

  // Handle mobile initial state
  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  }, [isMobile]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === 'k';
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      if (isCmdOrCtrl && isK) {
        e.preventDefault();
        setSearchFilterOpen(false);
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setSearchFilterOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-search-filter-root]')) return;
      setSearchFilterOpen(false);
    };
    if (!searchFilterOpen) return;
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [searchFilterOpen]);

  // Auth check
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user || user.role !== 'MAIL_USER')) {
      navigate('/mail/login', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, user]);

  useEffect(() => {
    if (!isAuthenticated || !profileStorageKey) return;
    const email = user?.email || '';
    const fallbackName = (user?.name && user.name.trim()) ? user.name.trim() : (email ? email.split('@')[0] : 'User');
    try {
      const raw = window.localStorage.getItem(profileStorageKey);
      if (!raw) {
        setProfileName(fallbackName);
        setProfileAvatarUrl(null);
        return;
      }
      const parsed = JSON.parse(raw) as { name?: unknown; avatarUrl?: unknown };
      const storedName = typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : fallbackName;
      const storedAvatar = typeof parsed.avatarUrl === 'string' && parsed.avatarUrl ? parsed.avatarUrl : null;
      setProfileName(storedName);
      setProfileAvatarUrl(storedAvatar);
    } catch {
      setProfileName(fallbackName);
      setProfileAvatarUrl(null);
    }
  }, [isAuthenticated, profileStorageKey, user?.email, user?.name]);

  useEffect(() => {
    if (!isAuthenticated || !profileStorageKey) return;
    if (!profileName.trim()) return;
    try {
      window.localStorage.setItem(profileStorageKey, JSON.stringify({ name: profileName.trim(), avatarUrl: profileAvatarUrl }));
    } catch {
      return;
    }
  }, [isAuthenticated, profileAvatarUrl, profileName, profileStorageKey]);

  useEffect(() => {
    const email = user?.email || '';
    if (!email || !isAuthenticated) {
      demoMailboxRef.current = null;
      setStorageUsedBytes(0);
      setDemoMailboxVersion(v => v + 1);
      return;
    }
    if (getDevAuthBypassActive()) {
      const mailbox = createDemoMailbox(email);
      demoMailboxRef.current = mailbox;
      setStorageUsedBytes(computeMailboxBytes(mailbox));
      setStorageIsEstimate(false);
      setDemoMailboxVersion(v => v + 1);
    } else {
      demoMailboxRef.current = null;
      setStorageIsEstimate(true);
      setDemoMailboxVersion(v => v + 1);
    }
  }, [isAuthenticated, user?.email]);

  useEffect(() => {
    if (demoMailboxRef.current) return;
    const avgBytesPerThread = 32_000;
    const estimated = threads.length * avgBytesPerThread;
    setStorageUsedBytes(estimated);
    setStorageIsEstimate(true);
  }, [threads]);

  useEffect(() => {
    const email = user?.email || '';
    if (!email || !isAuthenticated) return;
    if (!getDevAuthBypassActive()) return;
    if (!demoMailboxRef.current) return;

    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (window.Notification.permission === 'default') {
        window.Notification.requestPermission().catch(() => undefined);
      }
    }

    const intervalId = window.setInterval(() => {
      const mailbox = demoMailboxRef.current;
      if (!mailbox) return;
      demoIncomingSeqRef.current += 1;
      const { summary, detail, bytesAdded } = createDemoIncomingThread(email, demoIncomingSeqRef.current);
      mailbox.threadsByFolder.inbox.unshift(summary);
      mailbox.detailById[summary.id] = detail;

      setThreads(prev => {
        if (prev.some(t => t.id === summary.id)) return prev;
        return [summary, ...prev];
      });
      setStorageUsedBytes(prev => prev + bytesAdded);
      setStorageIsEstimate(false);
      setDemoMailboxVersion(v => v + 1);

      setNewMailToasts(prev => {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const toast = { id, threadId: summary.id, sender: summary.sender, subject: summary.subject, snippet: summary.snippet, receivedAt: Date.now() };
        window.setTimeout(() => {
          setNewMailToasts(current => current.filter(t => t.id !== id));
        }, 4500);
        return [toast, ...prev].slice(0, 3);
      });

      if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
        try {
          new window.Notification('New mail received', { body: `${summary.sender}: ${summary.subject}` });
        } catch {
          return;
        }
      }
    }, 20_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated, user?.email]);

  // Load threads
  const loadThreads = useCallback(async (options?: { reset?: boolean }) => {
    if (!user || !isAuthenticated) return;
    const imapFolder = MAIL_FOLDER_IMAP_PATH[activeFolder];
    const reset = options?.reset ?? false;
    
    setThreadsLoading(true);
    try {
      const mailbox = demoMailboxRef.current;
      if (mailbox) {
        const pageSize = 50;
        const cursor = reset ? 0 : Number(threadsCursor || 0);
        const all = mailbox.threadsByFolder[activeFolder] || [];
        const page = all.slice(cursor, cursor + pageSize).map(t => ({ ...t, folder: activeFolder }));
        const nextCursor = cursor + page.length < all.length ? String(cursor + page.length) : undefined;

        setThreads(prev => {
          if (reset) return page;
          const existingIds = new Set(prev.map(p => p.id));
          return [...prev, ...page.filter(i => !existingIds.has(i.id))];
        });
        setThreadsCursor(nextCursor);

        if (reset && page.length > 0 && !isMobile) {
          setSelectedId(page[0]!.id);
        }
        return;
      }

      const res = await api.get('/mail/threads', {
        params: { folder: imapFolder, limit: 50, cursor: reset ? undefined : threadsCursor },
      });
      const data = res.data as { threads: MailThreadSummary[]; nextCursor?: string };
      const mapped = (data.threads || []).map(t => ({
          ...t,
          id: String(t.id),
          folder: activeFolder,
          sender: t.from?.name || t.from?.address || 'Unknown',
          senderEmail: t.from?.address || '',
          subject: t.subject || '(no subject)',
          snippet: t.snippet || '',
          timestamp: t.lastMessageAt || '',
          unread: Boolean(t.unread),
          importanceScore:
            typeof (t as unknown as { importanceScore?: unknown }).importanceScore === 'number'
              ? (t as unknown as { importanceScore: number }).importanceScore
              : typeof (t as unknown as { importance_score?: unknown }).importance_score === 'number'
                ? (t as unknown as { importance_score: number }).importance_score
                : undefined,
          spamScore:
            typeof (t as unknown as { spamScore?: unknown }).spamScore === 'number'
              ? (t as unknown as { spamScore: number }).spamScore
              : typeof (t as unknown as { spam_score?: unknown }).spam_score === 'number'
                ? (t as unknown as { spam_score: number }).spam_score
                : undefined,
      }));

      setThreads(prev => {
        if (reset) return mapped;
        const existingIds = new Set(prev.map(p => p.id));
        return [...prev, ...mapped.filter(i => !existingIds.has(i.id))];
      });
      setThreadsCursor(data.nextCursor);
      
      if (reset && mapped.length > 0 && !isMobile) {
        setSelectedId(mapped[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setThreadsLoading(false);
    }
  }, [activeFolder, isAuthenticated, threadsCursor, user, isMobile]);

  // Initial load
  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role === 'MAIL_USER') {
      setThreads([]);
      setThreadsCursor(undefined);
      setSelectedId(null);
      setThreadDetail(null);
      setStarredOnly(false);
      loadThreads({ reset: true });
    }
  }, [activeFolder, isAuthenticated, isLoading, user, loadThreads]);

  // Load detail
  useEffect(() => {
    if (!selectedId) {
      setThreadDetail(null);
      return;
    }
    const fetchDetail = async () => {
      setThreadDetailLoading(true);
      try {
        const mailbox = demoMailboxRef.current;
        if (mailbox) {
          const found = mailbox.detailById[selectedId];
          if (found) {
            const mapped: MailThreadDetail = { ...found, folder: activeFolder };
            setThreadDetail(mapped);
            setThreads(prev => prev.map(t => t.id === selectedId ? { ...t, unread: false } : t));
          }
          return;
        }

        const res = await api.get(`/mail/threads/${encodeURIComponent(selectedId)}`, {
           params: { folder: MAIL_FOLDER_IMAP_PATH[activeFolder] }
        });
        const data = res.data as { thread: MailThreadDetail | null };
        if (data.thread) {
           const mapped: MailThreadDetail = {
             ...data.thread,
             id: String(data.thread.id),
             folder: activeFolder,
             messages: data.thread.messages.map(m => ({
               ...m,
               id: String(m.id),
               subject: m.subject || data.thread?.subject || '',
             }))
           };
           setThreadDetail(mapped);
           setThreads(prev => prev.map(t => t.id === selectedId ? { ...t, unread: false } : t));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setThreadDetailLoading(false);
      }
    };
    fetchDetail();
  }, [selectedId, activeFolder]);

  // Filter threads
  const visibleThreads = useMemo(() => {
    const byFolder = threads.filter(t => t.folder === activeFolder);
    if (starredOnly) return byFolder.filter(t => t.starred);
    return byFolder;
  }, [threads, activeFolder, starredOnly]);

  const filteredThreads = useMemo(() => {
    let list = visibleThreads;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(t => {
        const hay = `${t.sender} ${t.senderEmail} ${t.subject} ${t.snippet}`.toLowerCase();
        return hay.includes(q);
      });
    }
    if (searchFilters.unreadOnly) list = list.filter(t => t.unread);
    if (searchFilters.starredOnly) list = list.filter(t => Boolean(t.starred));
    if (searchFilters.highImportanceOnly) {
      list = list.filter(t => (t.importanceScore ?? ((hashString(t.id) % 70) + 30)) > 80);
    }
    return list;
  }, [searchFilters.highImportanceOnly, searchFilters.starredOnly, searchFilters.unreadOnly, searchQuery, visibleThreads]);

  const sidebarCounts = useMemo(() => {
    const counts: Record<MailFolder | 'starred', number> = {
      inbox: 0,
      sent: 0,
      drafts: 0,
      spam: 0,
      trash: 0,
      starred: 0,
    };
    const mailbox = demoMailboxRef.current;
    const mailboxVersion = demoMailboxVersion;
    if (mailbox && mailboxVersion >= 0) {
      (Object.keys(mailbox.threadsByFolder) as MailFolder[]).forEach((folder) => {
        const items = mailbox.threadsByFolder[folder] || [];
        counts[folder] = items.length;
        counts.starred += items.filter(i => i.starred).length;
      });
      return counts;
    }

    for (const t of threads) {
      counts[t.folder] += 1;
      if (t.starred) counts.starred += 1;
    }
    return counts;
  }, [demoMailboxVersion, threads]);

  const unreadInboxThreads = useMemo(() => {
    if (activeFolder !== 'inbox') return [];
    return visibleThreads.filter(t => t.unread);
  }, [activeFolder, visibleThreads]);

  const showReplyReminder = useMemo(() => {
    if (activeFolder !== 'inbox') return false;
    if (unreadInboxThreads.length === 0) return false;
    return Date.now() >= replyReminderSnoozeUntil;
  }, [activeFolder, replyReminderSnoozeUntil, unreadInboxThreads.length]);

  const handleReplyReminderNow = () => {
    const first = unreadInboxThreads[0];
    if (!first) return;
    setSelectedId(first.id);
    setAskAIOpen(true);
  };

  const handleReplyReminderLater = () => {
    setReplyReminderSnoozeUntil(Date.now() + 5 * 60 * 1000);
  };

  const restoreFromTrash = useCallback((threadId: string) => {
    setThreads(prev => prev.map(t => (t.id === threadId ? { ...t, folder: 'inbox' } : t)));
    setThreadDetail(prev => (prev && prev.id === threadId ? { ...prev, folder: 'inbox' } : prev));
    if (selectedId === threadId) {
      setActiveFolder('inbox');
    }
  }, [selectedId]);

  const selectedThreadSummary = useMemo(() => {
    if (!selectedId) return null;
    return threads.find(t => t.id === selectedId) || null;
  }, [selectedId, threads]);

  const aiContext = useMemo<MailAIContext | null>(() => {
    if (threadDetail) {
      const last = threadDetail.messages[threadDetail.messages.length - 1];
      return {
        threadId: threadDetail.id,
        subject: threadDetail.subject,
        fromName: last?.fromName,
        fromAddress: last?.fromAddress,
        date: last?.date,
        snippet: last?.text?.replace(/\s+/g, ' ').trim().slice(0, 140) || undefined,
        latestText: last?.text,
        latestHtml: last?.html,
        attachments: last?.attachments?.map(a => ({ filename: a.filename, mimeType: a.mimeType, size: a.size })) || undefined,
        messageCount: threadDetail.messages.length,
      };
    }
    if (selectedThreadSummary) {
      return {
        threadId: selectedThreadSummary.id,
        subject: selectedThreadSummary.subject,
        fromName: selectedThreadSummary.from?.name,
        fromAddress: selectedThreadSummary.from?.address,
        date: selectedThreadSummary.timestamp,
        snippet: selectedThreadSummary.snippet,
        messageCount: undefined,
      };
    }
    return null;
  }, [selectedThreadSummary, threadDetail]);

  if (isLoading || !isAuthenticated) return null;

  const showList = !isMobile || !selectedId;
  const showDetail = !isMobile || !!selectedId;

  const pushSystemToast = (title: string, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const toast = { id, title, message };
    setSystemToasts(prev => [toast, ...prev].slice(0, 3));
    window.setTimeout(() => setSystemToasts(current => current.filter(t => t.id !== id)), 4500);
  };

  const toggleVoiceSearch = async () => {
    type RecognitionResult = { transcript?: unknown };
    type RecognitionAlternativeList = { length: number; [index: number]: RecognitionResult };
    type RecognitionResultList = { length: number; [index: number]: RecognitionAlternativeList };
    type RecognitionEventLike = { results?: RecognitionResultList };
    type RecognitionInstance = {
      start: () => void;
      stop: () => void;
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onresult: ((event: RecognitionEventLike) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
    };
    type RecognitionCtor = new () => RecognitionInstance;

    const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      pushSystemToast('Voice search', 'Not supported in this browser. Try Chrome.');
      return;
    }
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      pushSystemToast('Voice search', 'Requires HTTPS (or localhost).');
      return;
    }

    if (searchListening) {
      const existing = speechRef.current as unknown as { stop?: unknown };
      if (existing && typeof existing.stop === 'function') {
        (existing.stop as () => void)();
      }
      setSearchListening(false);
      speechRef.current = null;
      return;
    }

    try {
      const stream = await navigator.mediaDevices?.getUserMedia?.({ audio: true });
      stream?.getTracks().forEach(t => t.stop());
    } catch {
      pushSystemToast('Voice search', 'Microphone permission denied or unavailable.');
      return;
    }

    searchInputRef.current?.focus();

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const results = event.results;
      if (!results || results.length === 0) return;
      let combined = '';
      for (let i = 0; i < results.length; i++) {
        const alt = results[i];
        if (alt && alt.length > 0) {
          const t = alt[0]?.transcript;
          if (typeof t === 'string') combined += t;
        }
      }
      const transcript = combined.trim();
      if (typeof transcript === 'string') {
        setSearchQuery(transcript.trim());
      }
    };
    recognition.onerror = () => {
      setSearchListening(false);
      speechRef.current = null;
      pushSystemToast('Voice search', 'Could not start voice recognition.');
    };
    recognition.onend = () => {
      setSearchListening(false);
      speechRef.current = null;
    };

    speechRef.current = recognition;
    setSearchListening(true);
    recognition.start();
  };

  return (
    <div className={cn(
      "mail-shell h-screen w-full flex overflow-hidden font-sans selection:bg-[#1DB954] selection:text-black relative",
      isDark ? "dark text-white" : "light text-black"
    )}>
      <Preloader onComplete={() => setLoading(false)} />

      <div className={cn("flex w-full h-full overflow-hidden transition-opacity duration-1000", contentVisible ? "opacity-100" : "opacity-0")}>
      {/* Sidebar */}
      {(isDesktop || (isMobile && !sidebarCollapsed)) && (
         <div className={cn("shrink-0 z-30 h-full", isMobile && "fixed inset-0")}>
            <MailSidebar 
              email={user?.email || ''}
              displayName={profileName || (user?.email ? user.email.split('@')[0] : 'User')}
              avatarUrl={profileAvatarUrl}
              activeFolder={activeFolder}
              starredOnly={starredOnly}
              onToggleStarred={() => setStarredOnly(v => !v)}
              onFolderChange={(f) => {
                setActiveFolder(f);
                setStarredOnly(false);
                if (isMobile) setSidebarCollapsed(true);
              }}
              onCompose={() => setComposeOpen(true)}
              collapsed={!isMobile && sidebarCollapsed}
              setCollapsed={setSidebarCollapsed}
              onEditProfile={() => {
                const fallback = profileName || (user?.email ? user.email.split('@')[0] : 'User');
                setProfileDraftName(fallback);
                setProfileDraftAvatarUrl(profileAvatarUrl);
                setProfileModalOpen(true);
              }}
              onLogout={logout}
              isMobile={isMobile}
              counts={sidebarCounts}
            />
         </div>
      )}

      {/* Main Content */}
      <main className={cn("flex-1 flex flex-col min-w-0 z-10", isDark ? "bg-[#121212]" : "bg-white")}>
        
        {/* Global Header */}
        <header className={cn(
          "h-16 md:h-20 flex items-center justify-between px-4 md:px-8 border-b z-50 shrink-0 sticky top-0 transition-all duration-300",
          isDark ? "bg-[#0B0B0B] border-[#1A1A1A]" : "bg-[#F6F6F6] border-[#E5E5E5]"
        )}>
          
          {/* Typing Greeting (Left) */}
          <TypingGreeting />

          {/* Mobile Header Logo */}
          {isMobile && (
             <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSidebarCollapsed(false)}
                  className={cn("p-2 -ml-1 rounded-xl mr-1 group relative transition-all duration-300 hover:scale-105 active:scale-95", isDark ? "hover:bg-[#1A1A1A]" : "hover:bg-[#F0F0F0]")}
                >
                   <div className="flex flex-col gap-1.5 w-6 items-start">
                       <span className={cn("h-0.5 rounded-full w-3 transition-all duration-300 group-hover:w-6", isDark ? "bg-white" : "bg-black")} />
                       <span className={cn("h-0.5 rounded-full w-6 transition-all duration-300 group-hover:bg-[#1DB954]", isDark ? "bg-[#787878]" : "bg-[#949494]")} />
                       <span className={cn("h-0.5 rounded-full w-4 transition-all duration-300 group-hover:w-2", isDark ? "bg-white" : "bg-black")} />
                   </div>
                </button>
                <img src={logo} alt="AetherMail" className={cn("h-7 w-auto object-contain", !isDark && "brightness-0")} />
                <span className={cn("font-bold text-xl tracking-tight", isDark ? "text-white" : "text-black")}>AetherMail</span>
             </div>
          )}

          {/* Center Search */}
          <div className={cn("flex-1 flex justify-center max-w-2xl mx-auto w-full relative", isMobile && "hidden")}>
             <div className="relative group w-full" data-search-filter-root>
                {/* Search Glow */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#1DB954]/20 to-[#1ED760]/20 rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 blur-xl" />
                
                <div className={cn(
                  "relative flex items-center h-12 px-5 border rounded-full shadow-sm group-focus-within:border-[#1DB954]/40 transition-all duration-300",
                  isDark ? "bg-[#121212] border-[#282828] group-focus-within:bg-[#181818]" : "bg-white border-[#E5E5E5] group-focus-within:bg-white"
                )}>
                   <Search size={18} className={cn("transition-colors mr-3", isDark ? "text-[#5E5E5E] group-focus-within:text-[#1DB954]" : "text-[#949494] group-focus-within:text-[#1DB954]")} />
                   <input 
                     ref={searchInputRef}
                     placeholder={t('search_placeholder')}
                     className={cn(
                       "flex-1 bg-transparent border-none text-[15px] focus:outline-none h-full font-medium",
                       isDark ? "text-white placeholder:text-[#5E5E5E]" : "text-black placeholder:text-[#949494]"
                     )}
                     value={searchQuery}
                     onChange={e => setSearchQuery(e.target.value)}
                   />
                   <div className={cn("flex items-center gap-3 pl-3 border-l ml-2", isDark ? "border-[#282828]" : "border-[#E5E5E5]")}>
                      <kbd className={cn("hidden md:inline-flex h-6 items-center gap-1 rounded border px-2 font-mono text-[10px] font-medium", isDark ? "border-[#333] bg-[#1A1A1A] text-[#787878]" : "border-[#E0E0E0] bg-[#F0F0F0] text-[#949494]")}>
                         <span className="text-xs">⌘</span>K
                      </kbd>
                      <button
                        onClick={() => setSearchFilterOpen(v => !v)}
                        className={cn(
                          "transition-colors p-1.5 rounded-full",
                          searchFilterOpen
                            ? (isDark ? "text-white bg-[#282828]" : "text-black bg-[#F0F0F0]")
                            : (isDark ? "text-[#787878] hover:text-white hover:bg-[#282828]" : "text-[#949494] hover:text-black hover:bg-[#F0F0F0]")
                        )}
                      >
                         <Filter size={16} />
                      </button>
                      <button
                        onClick={toggleVoiceSearch}
                        className={cn(
                          "transition-colors p-1.5 rounded-full",
                          searchListening
                            ? (isDark ? "text-white bg-[#282828]" : "text-black bg-[#F0F0F0]")
                            : (isDark ? "text-[#787878] hover:text-white hover:bg-[#282828]" : "text-[#949494] hover:text-black hover:bg-[#F0F0F0]")
                        )}
                      >
                         <Mic size={16} />
                      </button>
                   </div>
                </div>

                <AnimatePresence>
                  {searchFilterOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
                      className={cn(
                        "absolute right-0 mt-3 w-[260px] rounded-2xl border shadow-2xl overflow-hidden",
                        isDark ? "bg-[#0B0B0B] border-[#1A1A1A]" : "bg-white border-[#E5E5E5]"
                      )}
                    >
                      <div className={cn("px-4 py-3 border-b", isDark ? "border-[#1A1A1A]" : "border-[#E5E5E5]")}>
                        <div className={cn("text-xs font-bold uppercase tracking-widest", isDark ? "text-[#B3B3B3]" : "text-[#737373]")}>Filters</div>
                      </div>
                      <div className="p-2">
                        {[
                          { key: 'unreadOnly', label: 'Unread only' },
                          { key: 'starredOnly', label: 'Starred only' },
                          { key: 'highImportanceOnly', label: 'Importance > 80%' },
                        ].map((item) => (
                          <button
                            key={item.key}
                            onClick={() =>
                              setSearchFilters(prev => ({ ...prev, [item.key]: !prev[item.key as keyof typeof prev] } as typeof prev))
                            }
                            className={cn(
                              "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl transition-colors",
                              isDark ? "hover:bg-[#121212] text-white" : "hover:bg-[#F9F9F9] text-black"
                            )}
                          >
                            <span className={cn("text-sm font-medium", isDark ? "text-[#EAEAEA]" : "text-[#121212]")}>{item.label}</span>
                            <span className={cn(
                              "w-9 h-5 rounded-full relative transition-colors",
                              searchFilters[item.key as keyof typeof searchFilters] ? "bg-[#1DB954]" : (isDark ? "bg-[#1A1A1A]" : "bg-[#E5E5E5]")
                            )}>
                              <span className={cn(
                                "absolute top-1 w-3 h-3 rounded-full bg-white transition-transform shadow-sm",
                                searchFilters[item.key as keyof typeof searchFilters] ? "left-5" : "left-1"
                              )} />
                            </span>
                          </button>
                        ))}
                      </div>
                      <div className={cn("px-3 py-3 border-t flex items-center justify-between", isDark ? "border-[#1A1A1A]" : "border-[#E5E5E5]")}>
                        <button
                          onClick={() => setSearchFilters({ unreadOnly: false, starredOnly: false, highImportanceOnly: false })}
                          className={cn(
                            "text-xs font-bold uppercase tracking-widest",
                            isDark ? "text-[#787878] hover:text-white" : "text-[#737373] hover:text-black"
                          )}
                        >
                          Clear
                        </button>
                        <button
                          onClick={() => setSearchFilterOpen(false)}
                          className="text-xs font-bold uppercase tracking-widest text-[#1DB954]"
                        >
                          Done
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center justify-end gap-3 w-auto lg:w-20 min-w-max ml-4">
             <button 
               onClick={() => setAskAIOpen(true)}
               className={cn(
               "hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all group shadow-lg",
               isDark ? "bg-[#1A1A1A] hover:bg-[#222] border-[#282828] hover:border-[#1DB954]/30" : "bg-white hover:bg-[#F9F9F9] border-[#E5E5E5] hover:border-[#1DB954]/30"
             )}>
                <Sparkles size={16} className="text-[#1DB954] group-hover:scale-110 transition-transform duration-300" />
                <span className={cn("text-[13px] font-bold group-hover:text-[#1DB954] transition-colors", isDark ? "text-white" : "text-black")}>{t('ask_ai')}</span>
             </button>
             
             <div className={cn("w-[1px] h-8 mx-2 hidden sm:block", isDark ? "bg-[#282828]" : "bg-[#E5E5E5]")} />

             <SettingsDropdown />

             <button className={cn(
               "p-3 rounded-full transition-colors relative border border-transparent",
               isDark ? "text-[#B3B3B3] hover:text-white hover:bg-[#1A1A1A] hover:border-[#282828]" : "text-[#5E5E5E] hover:text-black hover:bg-[#F0F0F0] hover:border-[#E5E5E5]"
             )}>
                <div className={cn("absolute top-3 right-3 w-2 h-2 bg-[#1DB954] rounded-full border-2", isDark ? "border-[#0B0B0B]" : "border-white")} />
                <Inbox size={20} />
             </button>
          </div>
        </header>

        <div className={cn("flex-1 flex min-h-0", isMobile && "pb-16")}>
          
          {/* Thread List */}
          {showList && (
            <div className={cn(
              "flex flex-col transition-all duration-300",
              isDark ? "bg-[#121212]" : "bg-white",
              isMobile ? "w-full" : (isDark ? "w-[420px] shrink-0 border-r border-[#1A1A1A]" : "w-[420px] shrink-0 border-r border-[#E5E5E5]")
            )}>
              {/* List Header */}
              <div className={cn(
                "h-16 flex items-center justify-between px-6 pb-2 pt-2 sticky top-0 z-20 backdrop-blur-md border-b",
                isDark ? "bg-[#121212]/95 border-[#1A1A1A]" : "bg-white/95 border-[#E5E5E5]"
              )}>
                 <div className="flex items-baseline gap-3">
                    <h2 className={cn("text-2xl font-bold capitalize tracking-tight", isDark ? "text-white" : "text-black")}>{t(activeFolder)}</h2>
                     <span className={cn("text-sm font-medium", isDark ? "text-[#5E5E5E]" : "text-[#949494]")}>{filteredThreads.length} {t('messages')}</span>
                  </div>
                 <button className={cn(
                   "flex items-center gap-2 px-3 py-1.5 rounded-full border hover:border-[#1DB954]/30 transition-all group",
                   isDark ? "bg-[#1A1A1A] hover:bg-[#222] border-[#282828]" : "bg-white hover:bg-[#F9F9F9] border-[#E5E5E5]"
                 )}>
                    <span className={cn("text-xs font-bold group-hover:text-black transition-colors", isDark ? "text-[#B3B3B3] group-hover:text-white" : "text-[#5E5E5E]")}>{t('mark_all_read')}</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1DB954] shadow-[0_0_8px_#1DB954]" />
                 </button>
              </div>

              {showReplyReminder && (
                <div className={cn(
                  "px-4 py-3 border-b",
                  isDark ? "border-[#1A1A1A] bg-[#121212]" : "border-[#E5E5E5] bg-white"
                )}>
                  <div className={cn(
                    "flex items-center justify-between gap-4 rounded-2xl border px-4 py-3",
                    isDark ? "bg-[#1A1A1A] border-[#282828]" : "bg-[#F9F9F9] border-[#E5E5E5]"
                  )}>
                    <div className="min-w-0">
                      <div className={cn("text-sm font-bold tracking-tight", isDark ? "text-white" : "text-black")}>
                        Reply reminder
                      </div>
                      <div className={cn("text-[12px] mt-0.5 truncate", isDark ? "text-[#B3B3B3]" : "text-[#5E5E5E]")}>
                        {`You have ${unreadInboxThreads.length} unread email${unreadInboxThreads.length === 1 ? '' : 's'} in your inbox.`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={handleReplyReminderLater}
                        className={cn(
                          "px-3 py-2 rounded-full text-xs font-bold border transition-colors",
                          isDark ? "bg-transparent border-[#282828] text-[#B3B3B3] hover:text-white hover:bg-[#222]" : "bg-white border-[#E5E5E5] text-[#5E5E5E] hover:text-black hover:bg-[#F0F0F0]"
                        )}
                      >
                        Remind later
                      </button>
                      <button
                        onClick={handleReplyReminderNow}
                        className="px-4 py-2 rounded-full text-xs font-bold bg-[#1DB954] hover:bg-[#1ED760] text-black transition-transform hover:scale-105 active:scale-95"
                      >
                        Reply now
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeFolder === 'trash' && !trashReminderDismissed && (
                <div className={cn(
                  "px-4 py-3 border-b",
                  isDark ? "border-[#1A1A1A] bg-[#121212]" : "border-[#E5E5E5] bg-white"
                )}>
                  <div className={cn(
                    "flex items-center justify-between gap-4 rounded-2xl border px-4 py-3",
                    isDark ? "bg-[#1A1A1A] border-[#282828]" : "bg-[#F9F9F9] border-[#E5E5E5]"
                  )}>
                    <div className="min-w-0">
                      <div className={cn("text-sm font-bold tracking-tight", isDark ? "text-white" : "text-black")}>
                        Trash retention
                      </div>
                      <div className={cn("text-[12px] mt-0.5 truncate", isDark ? "text-[#B3B3B3]" : "text-[#5E5E5E]")}>
                        All trashed emails will be auto deleted in 30 days.
                      </div>
                    </div>
                    <button
                      onClick={() => setTrashReminderDismissed(true)}
                      className={cn(
                        "px-3 py-2 rounded-full text-xs font-bold border transition-colors shrink-0",
                        isDark ? "bg-transparent border-[#282828] text-[#B3B3B3] hover:text-white hover:bg-[#222]" : "bg-white border-[#E5E5E5] text-[#5E5E5E] hover:text-black hover:bg-[#F0F0F0]"
                      )}
                    >
                      Got it
                    </button>
                  </div>
                </div>
              )}

              {/* List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar relative px-2 z-10">
                {threadsLoading && filteredThreads.length === 0 ? (
                  <div className="space-y-2 mt-2">
                     {[1,2,3,4,5].map(i => (
                       <div key={i} className={cn("h-24 rounded-md animate-pulse", isDark ? "bg-[#181818]" : "bg-[#F0F0F0]")} />
                     ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 pb-4">
                    {filteredThreads.map(t => (
                      <MailListItem 
                        key={t.id} 
                        thread={t} 
                        selected={selectedId === t.id}
                        onClick={() => setSelectedId(t.id)}
                        onReply={() => {
                          setSelectedId(t.id);
                          setAskAIOpen(true);
                        }}
                        onRestore={() => restoreFromTrash(t.id)}
                      />
                    ))}
                    {filteredThreads.length === 0 && (
                      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center relative overflow-hidden min-h-[400px]">
                         
                         <motion.div 
                             initial={{ scale: 0.8, opacity: 0 }}
                             animate={{ scale: 1, opacity: 1 }}
                             transition={{ type: "spring", duration: 0.8 }}
                             className="relative mb-8 group"
                         >
                             <div className="absolute -inset-4 bg-[#1DB954]/20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                             <div className={cn(
                               "relative w-24 h-24 rounded-[2rem] flex items-center justify-center border group-hover:border-[#1DB954]/50 transition-colors duration-500",
                               isDark ? "bg-[#181818] border-[#282828] shadow-[0_8px_30px_rgba(0,0,0,0.5)]" : "bg-white border-[#E5E5E5] shadow-lg"
                             )}>
                                  <Inbox size={40} className={cn("group-hover:text-[#1DB954] transition-colors duration-500", isDark ? "text-[#5E5E5E]" : "text-[#949494]")} />
                                  
                                  {/* Decor elements */}
                                  <div className={cn("absolute top-0 right-0 w-3 h-3 bg-[#1DB954] rounded-full border-2 translate-x-1 -translate-y-1 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100", isDark ? "border-[#121212]" : "border-white")} />
                             </div>
                         </motion.div>

                         <motion.div
                             initial={{ y: 20, opacity: 0 }}
                             animate={{ y: 0, opacity: 1 }}
                             transition={{ delay: 0.2, duration: 0.5 }}
                         >
                             <h3 className={cn("text-2xl font-bold mb-3 tracking-tight", isDark ? "text-white" : "text-black")}>{t('all_caught_up')}</h3>
                             <p className={cn("max-w-[240px] mx-auto leading-relaxed", isDark ? "text-[#787878]" : "text-[#5E5E5E]")}>
                                {t('folder_empty', { folder: t(activeFolder) })} <br/>{t('relax_message')}
                             </p>
                             
                             <button className={cn(
                               "mt-8 px-6 py-2.5 rounded-full border text-sm font-medium transition-all hover:scale-105 active:scale-95 shadow-lg",
                               isDark ? "bg-[#1A1A1A] hover:bg-[#222] border-[#282828] text-white hover:text-[#1DB954]" : "bg-white hover:bg-[#F9F9F9] border-[#E5E5E5] text-black hover:text-[#1DB954]"
                             )}>
                                {t('refresh_inbox')}
                             </button>
                         </motion.div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Reading Pane */}
          {showDetail && (
            <ReadingPane
              key={threadDetail?.id || 'empty'}
              thread={threadDetail} 
              loading={threadDetailLoading} 
              showBack={isMobile}
              onBack={() => setSelectedId(null)}
              userName={profileName || undefined}
            />
          )}

        </div>

        {/* Global Footer */}
        <footer className={cn(
          "h-8 border-t hidden md:flex items-center justify-between px-4 z-20 shrink-0 text-[11px] font-medium select-none",
          isDark ? "bg-[#0B0B0B] border-[#1A1A1A] text-[#5E5E5E]" : "bg-[#F6F6F6] border-[#E5E5E5] text-[#737373]"
        )}>
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 group cursor-help">
                 <div className="w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
                 <span className={cn("transition-colors", isDark ? "group-hover:text-white" : "group-hover:text-black")}>{t('system_operational')}</span>
              </div>
              <div className={cn("w-[1px] h-3", isDark ? "bg-[#282828]" : "bg-[#E5E5E5]")} />
              <span className={cn("transition-colors cursor-pointer", isDark ? "hover:text-white" : "hover:text-black")}>v2.4.0 (Stable)</span>
           </div>

           <div className="flex items-center gap-6">
              <button
                onClick={() => setStorageModalOpen(true)}
                className={cn(
                  "flex items-center gap-2",
                  isDark ? "hover:text-white" : "hover:text-black"
                )}
              >
                 <span>{t('storage')}</span>
                 <div className={cn("w-20 h-1.5 rounded-full overflow-hidden", isDark ? "bg-[#1A1A1A]" : "bg-[#E5E5E5]")}>
                    <div className="h-full bg-[#1DB954] rounded-full" style={{ width: `${Math.min(100, Math.max(0, Math.round((storageUsedBytes / storageQuotaBytes) * 100)))}%` }} />
                 </div>
                 <span className={isDark ? "text-white" : "text-black"}>
                   {`${Math.min(100, Math.max(0, Math.round((storageUsedBytes / storageQuotaBytes) * 100)))}%`}
                 </span>
              </button>
              
              <div className="hidden md:flex items-center gap-4">
                 <div className="flex items-center gap-1.5">
                    <kbd className={cn("border rounded px-1 min-w-[16px] text-center text-[9px]", isDark ? "bg-[#1A1A1A] border-[#282828] text-[#B3B3B3]" : "bg-[#F0F0F0] border-[#E0E0E0] text-[#737373]")}>C</kbd>
                    <span>{t('compose')}</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                    <kbd className={cn("border rounded px-1 min-w-[16px] text-center text-[9px]", isDark ? "bg-[#1A1A1A] border-[#282828] text-[#B3B3B3]" : "bg-[#F0F0F0] border-[#E0E0E0] text-[#737373]")}>/</kbd>
                    <span>{t('search')}</span>
                 </div>
                 <div className="flex items-center gap-1.5">
                    <kbd className={cn("border rounded px-1 min-w-[16px] text-center text-[9px]", isDark ? "bg-[#1A1A1A] border-[#282828] text-[#B3B3B3]" : "bg-[#F0F0F0] border-[#E0E0E0] text-[#737373]")}>?</kbd>
                    <span>{t('shortcuts')}</span>
                 </div>
              </div>
           </div>
        </footer>
      </main>

      {/* Mobile Nav */}
      {isMobile && !composeOpen && (
        <MobileNav 
          activeFolder={activeFolder}
          onFolderChange={(f) => {
            setActiveFolder(f);
            window.scrollTo(0, 0);
          }}
          onCompose={() => setComposeOpen(true)}
          onMenu={() => setSidebarCollapsed(false)}
        />
      )}

      </div>

      {composeOpen && (
        <ComposeModal 
          isMobile={isMobile}
          onClose={() => setComposeOpen(false)}
        />
      )}

      <AskAIOverlay 
        isOpen={askAIOpen}
        onClose={() => setAskAIOpen(false)}
        isDark={isDark}
        context={aiContext}
        userName={profileName || undefined}
        userEmail={user?.email || undefined}
      />

      <StorageModal
        isOpen={storageModalOpen}
        onClose={() => setStorageModalOpen(false)}
        isDark={isDark}
        usedBytes={storageUsedBytes}
        quotaBytes={storageQuotaBytes}
        mailCount={threads.length}
        isEstimate={storageIsEstimate}
      />

      <ProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        isDark={isDark}
        email={user?.email || ''}
        name={profileDraftName}
        setName={setProfileDraftName}
        avatarUrl={profileDraftAvatarUrl}
        setAvatarUrl={setProfileDraftAvatarUrl}
        onSave={() => {
          const nextName = profileDraftName.trim();
          if (!nextName) return;
          setProfileName(nextName);
          setProfileAvatarUrl(profileDraftAvatarUrl);
          setProfileModalOpen(false);
        }}
      />

      <div className="fixed top-4 right-4 z-[95] flex flex-col gap-2 w-[320px] max-w-[92vw]">
        <AnimatePresence>
          {systemToasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              className={cn(
                "rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl",
                isDark ? "bg-[#0B0B0B]/90 border-[#1A1A1A] text-white" : "bg-white/90 border-[#E5E5E5] text-black"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className={cn("text-xs font-bold uppercase tracking-[0.22em]", isDark ? "text-[#B3B3B3]" : "text-[#737373]")}>
                    {toast.title}
                  </div>
                  <div className={cn("text-sm mt-1", isDark ? "text-white" : "text-black")}>{toast.message}</div>
                </div>
                <button
                  onClick={() => setSystemToasts(prev => prev.filter(t => t.id !== toast.id))}
                  className={cn(
                    "p-2 rounded-full transition-colors shrink-0",
                    isDark ? "text-[#B3B3B3] hover:text-white hover:bg-white/[0.06]" : "text-[#5E5E5E] hover:text-black hover:bg-black/[0.05]"
                  )}
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          ))}
          {newMailToasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -14, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -14, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              onClick={() => {
                setActiveFolder('inbox');
                setStarredOnly(false);
                setSelectedId(toast.threadId);
              }}
              className={cn("relative cursor-pointer select-none")}
            >
              <div className="absolute -inset-[1px] rounded-[22px] bg-gradient-to-r from-[#1DB954]/40 via-[#1ED760]/25 to-transparent opacity-70 blur-[10px]" />
              <div className={cn(
                "relative rounded-[22px] border overflow-hidden shadow-2xl backdrop-blur-xl",
                isDark ? "bg-[#0B0B0B]/90 border-[#1A1A1A]" : "bg-white/90 border-[#E5E5E5]"
              )}>
                <div className="absolute inset-0 pointer-events-none">
                  <div className={cn(
                    "absolute inset-0 opacity-60",
                    isDark
                      ? "bg-[radial-gradient(circle_at_20%_0%,rgba(29,185,84,0.28),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(255,255,255,0.10),transparent_60%)]"
                      : "bg-[radial-gradient(circle_at_20%_0%,rgba(29,185,84,0.18),transparent_55%),radial-gradient(circle_at_80%_30%,rgba(0,0,0,0.04),transparent_60%)]"
                  )} />
                </div>

                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="shrink-0">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1DB954] to-[#1ED760] p-[2px] shadow-[0_0_22px_rgba(29,185,84,0.35)]">
                          <div className={cn("w-full h-full rounded-2xl flex items-center justify-center", isDark ? "bg-[#0B0B0B]" : "bg-white")}>
                            <span className={cn("text-sm font-black", isDark ? "text-white" : "text-black")}>
                              {(toast.sender || 'N')[0]?.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] px-2 py-1 rounded-full border",
                            isDark ? "border-[#1A1A1A] bg-white/[0.03] text-[#B3B3B3]" : "border-[#E5E5E5] bg-black/[0.02] text-[#737373]"
                          )}>
                            <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954]" />
                            NEW MAIL
                          </span>
                          <span className={cn("text-[11px] font-mono", isDark ? "text-[#5E5E5E]" : "text-[#949494]")}>
                            {new Date(toast.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className={cn("mt-2 font-bold leading-tight truncate", isDark ? "text-white" : "text-black")}>
                          {toast.sender}
                        </div>
                        <div className={cn("text-sm mt-0.5 truncate", isDark ? "text-[#B3B3B3]" : "text-[#5E5E5E]")}>
                          {toast.subject}
                        </div>
                        {toast.snippet && (
                          <div className={cn("text-[12px] mt-1.5 line-clamp-2", isDark ? "text-[#787878]" : "text-[#737373]")}>
                            {toast.snippet}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewMailToasts(prev => prev.filter(t => t.id !== toast.id));
                      }}
                      className={cn(
                        "p-2 rounded-full transition-colors shrink-0",
                        isDark ? "text-[#B3B3B3] hover:text-white hover:bg-white/[0.06]" : "text-[#5E5E5E] hover:text-black hover:bg-black/[0.05]"
                      )}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveFolder('inbox');
                        setStarredOnly(false);
                        setSelectedId(toast.threadId);
                      }}
                      className={cn(
                        "px-3 py-2 rounded-full text-xs font-bold border transition-all hover:scale-[1.02] active:scale-[0.98]",
                        isDark ? "bg-white/[0.05] border-[#1A1A1A] text-white hover:bg-white/[0.08]" : "bg-black/[0.03] border-[#E5E5E5] text-black hover:bg-black/[0.06]"
                      )}
                    >
                      Open
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveFolder('inbox');
                        setStarredOnly(false);
                        setSelectedId(toast.threadId);
                        setAskAIOpen(true);
                      }}
                      className="ml-auto px-3 py-2 rounded-full text-xs font-bold bg-[#1DB954] hover:bg-[#1ED760] text-black transition-transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
                    >
                      <Sparkles size={14} />
                      AI Reply
                    </button>
                  </div>
                </div>

                <div className={cn("h-[3px] w-full", isDark ? "bg-white/[0.06]" : "bg-black/[0.05]")}>
                  <motion.div
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: 4.5, ease: 'linear' }}
                    className="h-full bg-gradient-to-r from-[#1DB954] to-[#1ED760]"
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

const MailApp = () => {
  const [isDark, setIsDark] = useState(true);
  const toggleTheme = () => setIsDark(!isDark);
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const t = useCallback((key: string, params?: Record<string, string>) => {
    let text = translations[language][key] || translations['en'][key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v);
      });
    }
    return text;
  }, [language]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <LanguageContext.Provider value={{ language, setLanguage, t }}>
        <MailAppContent />
      </LanguageContext.Provider>
    </ThemeContext.Provider>
  );
};

export default MailApp;
