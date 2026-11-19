import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { ChatMessage } from '../../../shared/types';
import { useGame } from '../store';

interface ChatPanelProps {
  messages: ChatMessage[];
  className?: string;
  onClose?: () => void;
}

export function ChatPanel({ messages, className = '', onClose }: ChatPanelProps) {
  const sendChat = useGame((s) => s.sendChat);
  const connected = useGame((s) => s.connected);
  const meId = useGame((s) => s.room?.meId);
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    sendChat(text);
    setText('');
  };

  return (
    <div className={`glass flex flex-col overflow-hidden rounded-3xl ${className}`}>
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div>
          <h3 className="text-sm font-bold">Trò chuyện</h3>
          <p className="text-[11px] text-emerald-200/45">Chỉ trong phòng này</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-rose-400'}`}
            title={connected ? 'Đã kết nối' : 'Mất kết nối'}
          />
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-100/70 hover:bg-white/10"
            >
              Đóng
            </button>
          )}
        </div>
      </div>

      <div ref={scrollRef} className="chat-scroll flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {messages.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-emerald-100/40">
            Chưa có tin nhắn. Chào bạn bè một câu nhé!
          </p>
        )}
        {messages.map((message) => {
          if (message.system) {
            return (
              <div key={message.id} className="py-1 text-center text-[11px] text-emerald-200/40">
                {message.text}
              </div>
            );
          }
          const mine = message.playerId === meId;
          return (
            <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${mine ? 'text-right' : 'text-left'}`}>
                {!mine && (
                  <div className="mb-0.5 px-1 text-[10px] font-semibold text-emerald-200/60">
                    {message.nickname}
                  </div>
                )}
                <div
                  className={`inline-block rounded-2xl px-3 py-1.5 text-sm leading-snug ${
                    mine
                      ? 'rounded-br-sm bg-emerald-500/85 text-emerald-950'
                      : 'rounded-bl-sm bg-white/10 text-emerald-50'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-white/8 p-3">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={200}
          placeholder={connected ? 'Nhập tin nhắn...' : 'Đang kết nối...'}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-emerald-100/30 focus:border-emerald-400/50"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Gửi
        </button>
      </form>
    </div>
  );
}
