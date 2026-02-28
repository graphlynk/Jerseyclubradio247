import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, Users, Wifi, WifiOff, X, Reply, AtSign, Search, Loader2 } from 'lucide-react';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const API = `https://${projectId}.supabase.co/functions/v1/make-server-715f71b9`;
const headers = (extra?: Record<string, string>) => ({
  Authorization: `Bearer ${publicAnonKey}`,
  ...extra,
});

interface ChatMessage {
  id: string;
  guestId: string;
  guestName: string;
  message: string;
  timestamp: string;
  ipId?: string;
  ipHash?: string;
  type?: 'message' | 'system';
  replyTo?: { id: string; ipId: string; message: string; gifUrl?: string };
  gifUrl?: string;
  mentions?: string[];
}

interface OnlineUser {
  guestId: string;
  ipId: string;
  typing: boolean;
}

interface GifResult {
  id: string;
  title: string;
  preview: string;
  url: string;
  width: number;
  height: number;
}

const neonGlow = {
  textShadow: '0 0 8px #C084FC, 0 0 20px #9D00FF80, 0 0 40px #9D00FF40',
};

// Renders message text with highlighted @mentions
function RenderMessage({ text, mentions, myIpId }: { text: string; mentions?: string[]; myIpId: string }) {
  if (!mentions?.length) return <>{text}</>;
  const parts: (string | JSX.Element)[] = [];
  let remaining = text;
  let key = 0;
  const mentionRegex = /@(User_[A-Z0-9]+|You)/g;
  let match;
  let lastIndex = 0;
  const fullText = text;
  mentionRegex.lastIndex = 0;
  while ((match = mentionRegex.exec(fullText)) !== null) {
    if (match.index > lastIndex) {
      parts.push(fullText.slice(lastIndex, match.index));
    }
    const mentionText = match[0];
    const isMentioningMe = match[1] === myIpId || match[1] === 'You';
    parts.push(
      <span
        key={key++}
        className={`font-bold px-0.5 rounded ${isMentioningMe ? 'text-[#FF0080] bg-[#FF0080]/15' : 'text-[#C084FC] bg-[#C084FC]/15'}`}
      >
        {mentionText}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < fullText.length) {
    parts.push(fullText.slice(lastIndex));
  }
  return <>{parts}</>;
}

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [guestId, setGuestId] = useState('');
  const [myIpId, setMyIpId] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [joined, setJoined] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [showOnlinePanel, setShowOnlinePanel] = useState(false);

  // Reply state
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);

  // Mention state
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionCursorPos, setMentionCursorPos] = useState(0);

  // GIF state
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [isLoadingGifs, setIsLoadingGifs] = useState(false);
  const [gifError, setGifError] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasJoinedRef = useRef(false);
  const guestIdRef = useRef('');
  const inputRef = useRef<HTMLInputElement>(null);
  const gifSearchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { guestIdRef.current = guestId; }, [guestId]);

  // Get or create guest ID
  useEffect(() => {
    let id = localStorage.getItem('guestId');
    if (!id) {
      id = `Guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem('guestId', id);
    }
    setGuestId(id);
  }, []);

  // Join the chat room
  const joinChat = useCallback(async () => {
    if (!guestId || hasJoinedRef.current) return;
    hasJoinedRef.current = true;
    try {
      const res = await fetch(`${API}/chat/join`, {
        method: 'POST',
        headers: headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ guestId }),
      });
      if (res.ok) {
        const data = await res.json();
        setMyIpId(data.ipId || '');
        setJoined(true);
      }
    } catch (err) { console.error('Join chat error:', err); }
  }, [guestId]);

  useEffect(() => { if (guestId) joinChat(); }, [guestId, joinChat]);

  // Leave chat
  const leaveChat = useCallback(() => {
    const id = guestIdRef.current;
    if (!id) return;
    try {
      fetch(`${API}/chat/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ guestId: id }),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  }, []);

  useEffect(() => {
    if (!guestId) return;
    const handleUnload = () => leaveChat();
    const handleVisChange = () => {
      if (document.visibilityState === 'hidden') {
        fetch(`${API}/chat/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ guestId, typing: false }),
          keepalive: true,
        }).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    document.addEventListener('visibilitychange', handleVisChange);
    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      document.removeEventListener('visibilitychange', handleVisChange);
      leaveChat();
    };
  }, [guestId, leaveChat]);

  // Heartbeat
  useEffect(() => {
    if (!guestId || !joined) return;
    const interval = setInterval(() => {
      fetch(`${API}/chat/heartbeat`, {
        method: 'POST',
        headers: headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ guestId, typing: isTyping }),
      }).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, [guestId, joined, isTyping]);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`${API}/chat/messages?limit=50`, { headers: headers() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
        setOnlineUsers(data.onlineUsers || []);
        setOnlineCount(data.onlineCount || 0);
      } else if (Array.isArray(data)) {
        setMessages([...data].reverse());
      }
      if (!myIpId && data.messages) {
        const myMsg = data.messages.find((m: ChatMessage) => m.guestId === guestId);
        if (myMsg?.ipId) setMyIpId(myMsg.ipId);
      }
      setError('');
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Connection lost. Retrying...');
    } finally { setIsLoading(false); }
  }, [guestId, myIpId]);

  useEffect(() => {
    if (!joined) return;
    fetchMessages();
    const interval = setInterval(fetchMessages, 10_000);
    return () => clearInterval(interval);
  }, [joined, fetchMessages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Typing detection
  const handleInputChange = (val: string) => {
    setInput(val);
    if (!isTyping && val.length > 0) {
      setIsTyping(true);
      fetch(`${API}/chat/heartbeat`, {
        method: 'POST',
        headers: headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ guestId, typing: true }),
      }).catch(() => {});
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 3000);

    // Check for @mention trigger
    const cursorPos = inputRef.current?.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setShowMentionPicker(true);
      setMentionFilter(atMatch[1].toLowerCase());
      setMentionCursorPos(cursorPos);
    } else {
      setShowMentionPicker(false);
    }
  };

  // Insert @mention
  const insertMention = (ipId: string) => {
    const cursorPos = mentionCursorPos;
    const textBeforeCursor = input.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    const before = input.slice(0, atIndex);
    const after = input.slice(cursorPos);
    const newInput = `${before}@${ipId} ${after}`;
    setInput(newInput);
    setShowMentionPicker(false);
    inputRef.current?.focus();
  };

  // Extract mentions from message
  const extractMentions = (text: string): string[] => {
    const matches = text.match(/@(User_[A-Z0-9]+)/g);
    if (!matches) return [];
    return [...new Set(matches.map(m => m.slice(1)))];
  };

  // GIF search
  const searchGifs = useCallback(async (query: string) => {
    setIsLoadingGifs(true);
    setGifError('');
    try {
      const url = query
        ? `${API}/chat/gifs?q=${encodeURIComponent(query)}`
        : `${API}/chat/gifs`;
      const res = await fetch(url, { headers: headers() });
      const data = await res.json();
      if (!res.ok) {
        console.error('GIF API error:', data);
        setGifError(data.error || 'GIF search failed');
        setGifs([]);
        return;
      }
      setGifs(data.gifs || []);
    } catch (err) {
      console.error('GIF search error:', err);
      setGifError('Failed to load GIFs');
    } finally { setIsLoadingGifs(false); }
  }, []);

  // Load trending on GIF picker open
  useEffect(() => {
    if (showGifPicker) searchGifs('');
  }, [showGifPicker, searchGifs]);

  // Debounced GIF search
  useEffect(() => {
    if (!showGifPicker) return;
    if (gifSearchTimeoutRef.current) clearTimeout(gifSearchTimeoutRef.current);
    gifSearchTimeoutRef.current = setTimeout(() => searchGifs(gifSearch), 400);
    return () => { if (gifSearchTimeoutRef.current) clearTimeout(gifSearchTimeoutRef.current); };
  }, [gifSearch, showGifPicker, searchGifs]);

  // Send a GIF
  const sendGif = async (gif: GifResult) => {
    if (isSending || !guestId) return;
    setIsSending(true);
    setShowGifPicker(false);
    try {
      const payload: any = {
        guestId,
        guestName: guestId.slice(0, 20),
        message: '',
        gifUrl: gif.url,
      };
      if (replyTo) {
        payload.replyTo = {
          id: replyTo.id,
          ipId: replyTo.ipId || replyTo.guestName,
          message: replyTo.gifUrl ? '[GIF]' : replyTo.message.slice(0, 50),
          ...(replyTo.gifUrl ? { gifUrl: replyTo.gifUrl } : {}),
        };
        setReplyTo(null);
      }
      await fetch(`${API}/chat/messages`, {
        method: 'POST',
        headers: headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });
      await fetchMessages();
    } catch (err: any) {
      setError(err.message || 'Failed to send GIF');
    } finally { setIsSending(false); }
  };

  // Send text message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending || !guestId) return;

    setIsSending(true);
    setIsTyping(false);
    setError('');
    setShowMentionPicker(false);

    try {
      const mentions = extractMentions(input);
      const payload: any = {
        guestId,
        guestName: guestId.slice(0, 20),
        message: input.trim(),
        ...(mentions.length > 0 ? { mentions } : {}),
      };
      if (replyTo) {
        payload.replyTo = {
          id: replyTo.id,
          ipId: replyTo.ipId || replyTo.guestName,
          message: replyTo.gifUrl ? '[GIF]' : replyTo.message.slice(0, 50),
          ...(replyTo.gifUrl ? { gifUrl: replyTo.gifUrl } : {}),
        };
        setReplyTo(null);
      }
      const res = await fetch(`${API}/chat/messages`, {
        method: 'POST',
        headers: headers({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send');
      }
      setInput('');
      await fetchMessages();
    } catch (err: any) {
      console.error('Send error:', err);
      setError(err.message || 'Failed to send');
    } finally { setIsSending(false); }
  };

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const typingUsers = onlineUsers.filter(u => u.typing && u.guestId !== guestId);
  const filteredMentionUsers = onlineUsers.filter(
    u => u.guestId !== guestId && u.ipId.toLowerCase().includes(mentionFilter)
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#06000F' }}>
      {/* Header */}
      <div
        className="border-b border-[#1a0040] p-4 md:p-6"
        style={{ background: 'linear-gradient(180deg, #0A0018 0%, #06000F 100%)' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #9D00FF, #FF0080)' }}
            >
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-white flex items-center gap-2" style={neonGlow}>
                Live Chat
                {myIpId && (
                  <span className="text-xs font-mono px-2 py-1 rounded-lg" style={{ background: 'rgba(157, 0, 255, 0.2)', color: '#9D00FF' }}>
                    {myIpId}
                  </span>
                )}
              </h1>
              <p className="text-[#5B4F70] text-sm mt-0.5 flex items-center gap-2">
                Chat with Jersey Club fans worldwide
                <span className="inline-flex items-center gap-1.5 text-xs">
                  {joined ? <Wifi className="w-3 h-3 text-[#00FF88]" /> : <WifiOff className="w-3 h-3 text-red-400" />}
                  <span className={joined ? 'text-[#00FF88] font-semibold' : 'text-red-400 font-semibold'}>
                    {joined ? 'Connected' : 'Connecting...'}
                  </span>
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowOnlinePanel(!showOnlinePanel)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#1a0040] hover:border-[#9D00FF] transition-colors"
            style={{ background: 'rgba(157, 0, 255, 0.08)' }}
          >
            <Users className="w-4 h-4 text-[#C084FC]" />
            <span className="text-sm font-bold text-[#C084FC]">{onlineCount}</span>
            <span className="w-2 h-2 rounded-full bg-[#00FF88] animate-pulse" />
          </button>
        </div>

        {/* Online panel */}
        {showOnlinePanel && onlineUsers.length > 0 && (
          <div className="mt-3 p-3 rounded-xl border border-[#1a0040]" style={{ background: 'rgba(10, 0, 24, 0.8)' }}>
            <p className="text-xs text-[#5B4F70] mb-2 uppercase font-bold tracking-wider">Online Now</p>
            <div className="flex flex-wrap gap-2">
              {onlineUsers.map(u => (
                <button
                  key={u.guestId}
                  onClick={() => {
                    if (u.guestId !== guestId) {
                      setInput(prev => prev + `@${u.ipId} `);
                      inputRef.current?.focus();
                      setShowOnlinePanel(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                  style={{
                    background: u.guestId === guestId
                      ? 'linear-gradient(135deg, #9D00FF40, #FF008040)'
                      : 'rgba(157, 0, 255, 0.12)',
                    color: u.guestId === guestId ? '#E0AAFF' : '#C084FC',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88]" />
                  {u.guestId === guestId ? 'You' : u.ipId}
                  {u.typing && <span className="text-[#FF0080] ml-1 animate-pulse">typing...</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-[#9D00FF] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-[#3B2F50] mx-auto mb-3" />
            <p className="text-[#5B4F70]">No messages yet. Be the first to say something!</p>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const isMe = msg.guestId === guestId;
              const isSystem = msg.type === 'system';

              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center py-1">
                    <span className="text-[11px] text-[#5B4F70] px-3 py-1 rounded-full italic" style={{ background: 'rgba(157, 0, 255, 0.06)' }}>
                      {msg.message}
                    </span>
                  </div>
                );
              }

              const displayName = msg.ipId || msg.guestName;
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const isGrouped = prevMsg && prevMsg.guestId === msg.guestId && prevMsg.type !== 'system';
              const isMentioningMe = msg.mentions?.includes(myIpId);

              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-0.5' : 'mt-2'} group`}
                >
                  <div
                    className={`max-w-[80%] md:max-w-[60%] rounded-2xl px-4 py-2 ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'} relative`}
                    style={{
                      background: isMe
                        ? 'linear-gradient(135deg, #9D00FF, #FF0080)'
                        : isMentioningMe
                        ? 'linear-gradient(135deg, #2a0050, #1a0040)'
                        : 'linear-gradient(135deg, #1a0040, #0F0022)',
                      ...(isMentioningMe && !isMe ? { border: '1px solid #9D00FF40' } : {}),
                    }}
                  >
                    {/* Reply context */}
                    {msg.replyTo && (
                      <div
                        className="flex items-start gap-2 mb-1.5 px-2 py-1.5 rounded-lg text-[10px] border-l-2 border-[#9D00FF]"
                        style={{ background: 'rgba(0,0,0,0.25)' }}
                      >
                        <Reply className="w-3 h-3 text-[#9D00FF] flex-shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <span className="text-[#C084FC] font-bold">{msg.replyTo.ipId}</span>
                          {msg.replyTo.gifUrl ? (
                            <img src={msg.replyTo.gifUrl} alt="GIF" className="w-12 h-12 rounded mt-0.5 object-cover" />
                          ) : (
                            <p className="text-white/60 truncate">{msg.replyTo.message}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Header */}
                    {!isGrouped && (
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-xs font-bold text-white">{isMe ? 'You' : displayName}</span>
                        {msg.ipHash && !isMe && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(157, 0, 255, 0.2)', color: '#9D00FF' }}>
                            #{msg.ipHash}
                          </span>
                        )}
                        <span className="text-[10px] text-white/50">{formatTime(msg.timestamp)}</span>
                      </div>
                    )}

                    {/* GIF */}
                    {msg.gifUrl && (
                      <img
                        src={msg.gifUrl}
                        alt="GIF"
                        className="rounded-lg max-w-full max-h-48 object-contain"
                        loading="lazy"
                      />
                    )}

                    {/* Message text */}
                    {msg.message && (
                      <p className="text-sm text-white break-words leading-relaxed">
                        <RenderMessage text={msg.message} mentions={msg.mentions} myIpId={myIpId} />
                      </p>
                    )}

                    {/* Reply button */}
                    <button
                      onClick={() => {
                        setReplyTo(msg);
                        inputRef.current?.focus();
                      }}
                      className="absolute -bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#0F0022] border border-[#2A0060] rounded-full p-1 hover:bg-[#1a0040]"
                      title="Reply"
                    >
                      <Reply className="w-3 h-3 text-[#C084FC]" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="flex justify-start mt-1">
                <div className="rounded-2xl rounded-bl-sm px-4 py-2.5" style={{ background: 'linear-gradient(135deg, #1a0040, #0F0022)' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#C084FC]">
                      {typingUsers.length === 1 ? typingUsers[0].ipId : `${typingUsers.length} people`}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C084FC] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C084FC] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C084FC] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* GIF Picker */}
      {showGifPicker && (
        <div className="border-t border-[#1a0040]" style={{ background: '#0A0018' }}>
          <div className="max-w-4xl mx-auto p-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-[#5B4F70] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={gifSearch}
                  onChange={e => setGifSearch(e.target.value)}
                  placeholder="Search GIFs..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-sm text-white placeholder:text-[#5B4F70] border border-[#1a0040] focus:border-[#9D00FF] focus:outline-none"
                  style={{ background: '#06000F' }}
                  autoFocus
                />
              </div>
              <button
                onClick={() => setShowGifPicker(false)}
                className="p-2 rounded-lg text-[#5B4F70] hover:text-white hover:bg-[#1a0040] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto">
              {isLoadingGifs ? (
                <div className="col-span-full flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-[#9D00FF] animate-spin" />
                </div>
              ) : gifs.length === 0 ? (
                <div className="col-span-full text-center py-8 text-[#5B4F70] text-sm">
                  {gifSearch ? 'No GIFs found' : 'Loading trending GIFs...'}
                </div>
              ) : (
                gifs.map(gif => (
                  <button
                    key={gif.id}
                    onClick={() => sendGif(gif)}
                    className="rounded-lg overflow-hidden hover:ring-2 hover:ring-[#9D00FF] transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <img
                      src={gif.preview}
                      alt={gif.title}
                      className="w-full h-24 object-cover"
                      loading="lazy"
                    />
                  </button>
                ))
              )}
            </div>
            {gifError && (
              <p className="text-[11px] text-red-400 mt-2">{gifError}</p>
            )}
            <p className="text-[9px] text-[#3B2F50] mt-2 text-right">Jersey Club Radio</p>
          </div>
        </div>
      )}

      {/* Input area */}
      <form
        onSubmit={handleSend}
        className="border-t border-[#1a0040] p-4"
        style={{ background: '#0A0018' }}
      >
        {/* Reply preview */}
        {replyTo && (
          <div className="max-w-4xl mx-auto mb-2 flex items-center gap-2 px-3 py-2 rounded-xl border border-[#9D00FF]/30" style={{ background: '#0F001A' }}>
            <Reply className="w-4 h-4 text-[#9D00FF] flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-[#C084FC]">
                Replying to {replyTo.guestId === guestId ? 'yourself' : (replyTo.ipId || replyTo.guestName)}
              </span>
              {replyTo.gifUrl ? (
                <p className="text-xs text-[#5B4F70] truncate">[GIF]</p>
              ) : (
                <p className="text-xs text-[#5B4F70] truncate">{replyTo.message}</p>
              )}
            </div>
            <button type="button" onClick={() => setReplyTo(null)} className="text-[#5B4F70] hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Mention picker */}
        {showMentionPicker && filteredMentionUsers.length > 0 && (
          <div
            className="max-w-4xl mx-auto mb-2 rounded-xl border border-[#1a0040] overflow-hidden"
            style={{ background: '#0F001A' }}
          >
            <p className="text-[10px] text-[#5B4F70] px-3 pt-2 pb-1 uppercase font-bold tracking-wider flex items-center gap-1">
              <AtSign className="w-3 h-3" /> Mention someone
            </p>
            <div className="max-h-32 overflow-y-auto">
              {filteredMentionUsers.map(u => (
                <button
                  key={u.guestId}
                  type="button"
                  onClick={() => insertMention(u.ipId)}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[#9D00FF]/10 transition-colors text-left"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88]" />
                  <span className="text-sm font-semibold text-[#C084FC]">{u.ipId}</span>
                  {u.typing && <span className="text-[10px] text-[#FF0080] animate-pulse">typing</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Presence bar */}
        <div className="flex items-center justify-between max-w-4xl mx-auto mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00FF88] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00FF88]" />
              </span>
              <span className="text-xs font-bold text-[#C084FC]" style={{ textShadow: '0 0 8px #C084FC, 0 0 16px #9D00FF60' }}>
                {onlineCount} {onlineCount === 1 ? 'person' : 'people'} in chat
              </span>
            </div>
          </div>
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[#FF0080] font-semibold animate-pulse">
                {typingUsers.length === 1
                  ? `${typingUsers[0].ipId} is typing`
                  : `${typingUsers.length} people typing`}
              </span>
              <div className="flex items-center gap-0.5">
                <span className="w-1 h-1 rounded-full bg-[#FF0080] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 rounded-full bg-[#FF0080] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 rounded-full bg-[#FF0080] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 max-w-4xl mx-auto">
          {/* GIF button */}
          <button
            type="button"
            onClick={() => { setShowGifPicker(!showGifPicker); setShowMentionPicker(false); }}
            className={`px-3 py-3 rounded-xl font-bold text-xs transition-all border ${
              showGifPicker
                ? 'border-[#9D00FF] text-[#9D00FF] bg-[#9D00FF]/10'
                : 'border-[#1a0040] text-[#5B4F70] hover:text-[#C084FC] hover:border-[#9D00FF]/50'
            }`}
            style={{ background: showGifPicker ? undefined : '#06000F' }}
          >
            GIF
          </button>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder={joined ? 'Type a message... Use @ to mention' : 'Connecting...'}
            maxLength={500}
            disabled={isSending || !joined}
            className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder:text-[#5B4F70] border border-[#1a0040] focus:border-[#9D00FF] focus:outline-none transition-colors disabled:opacity-50"
            style={{ background: '#06000F' }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isSending || !joined}
            className="px-5 py-3 rounded-xl font-semibold text-sm text-white flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_16px_rgba(157,0,255,0.4)]"
            style={{ background: 'linear-gradient(135deg, #9D00FF, #FF0080)' }}
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
        <div className="flex items-center justify-between max-w-4xl mx-auto mt-2 px-1">
          <p className="text-[10px] text-[#5B4F70]">{input.length}/500</p>
          <p className="text-[10px] text-[#5B4F70]">Messages auto-clear when you leave</p>
        </div>
      </form>
    </div>
  );
}