import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent } from 'react';
import { Bot, ImagePlus, MessageCircle, Send, X } from 'lucide-react';
import { askAi } from '../services/api';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
}

const initialMessage: ChatMessage = {
  id: 0,
  role: 'assistant',
  content: 'Xin chào! Tôi có thể giúp bạn hiểu rõ hơn về tình hình tài chính của mình.',
};

export function AiChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([initialMessage]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  function readImage(file: File) {
    if (!file.type.startsWith('image/')) return;
    if (file.size > 10 * 1024 * 1024) {
      setPendingImage(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPendingImage(typeof reader.result === 'string' ? reader.result : null);
    reader.readAsDataURL(file);
  }

  function handlePaste(event: ClipboardEvent<HTMLElement>) {
    const image = Array.from(event.clipboardData.items).find((item) => item.type.startsWith('image/'));
    if (image) {
      event.preventDefault();
      const file = image.getAsFile();
      if (file) readImage(file);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if ((!trimmedMessage && !pendingImage) || isLoading) return;

    setMessage('');
    const imageToSend = pendingImage;
    setPendingImage(null);
    setMessages((current) => [
      ...current,
      { id: Date.now(), role: 'user', content: trimmedMessage || 'Hãy phân tích ảnh này.', image: imageToSend || undefined },
    ]);
    setIsLoading(true);

    try {
      const response = await askAi({ message: trimmedMessage || 'Hãy phân tích ảnh này.', image: imageToSend || undefined });
      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, role: 'assistant', content: response.data },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: 'assistant',
          content: 'Xin lỗi, hiện tại tôi không thể kết nối. Vui lòng thử lại sau.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {isOpen && (
        <section
          onPaste={handlePaste}
          aria-label="AI financial assistant"
          className="flex h-[min(580px,calc(100vh-7rem))] w-[min(370px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#dce9e5] bg-white shadow-[0_20px_60px_rgba(23,33,43,.18)] animate-in"
        >
          <header className="flex items-center justify-between bg-[#075c57] px-4 py-3.5 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                <Bot size={19} />
              </span>
              <div>
                <h2 className="text-sm font-extrabold">Financial assistant</h2>
                <p className="mt-0.5 text-[11px] font-semibold text-[#b9e2d9]">SmartFin AI</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close AI assistant"
              title="Close assistant"
              onClick={() => setIsOpen(false)}
              className="rounded-lg p-2 text-[#b9e2d9] transition hover:bg-white/10 hover:text-white"
            >
              <X size={18} />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-[#f7faf9] p-4" aria-live="polite">
            {messages.map((chatMessage) => (
              <div
                key={chatMessage.id}
                className={`flex ${chatMessage.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[84%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13px] leading-5 ${
                    chatMessage.role === 'user'
                      ? 'rounded-br-md bg-[#087f74] text-white'
                      : 'rounded-bl-md border border-[#e3ebe8] bg-white text-[#34434c] shadow-sm'
                  }`}
                >
                  {chatMessage.image && <img src={chatMessage.image} alt="User attachment" className="mb-2 max-h-40 rounded-xl object-cover" />}
                  {chatMessage.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-[#e3ebe8] bg-white px-3.5 py-3 shadow-sm" aria-label="AI đang gõ">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#087f74] [animation-delay:-.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#087f74] [animation-delay:-.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#087f74]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="border-t border-[#e3ebe8] bg-white p-3">
            {pendingImage && (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-[#dce9e5] bg-[#f7faf9] px-2 py-2">
                <img src={pendingImage} alt="Selected attachment" className="h-12 w-12 rounded-lg object-cover" />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#71808c]">Ảnh đã sẵn sàng để gửi</span>
                <button type="button" aria-label="Remove image" title="Remove image" onClick={() => setPendingImage(null)} className="rounded-lg p-1.5 text-[#9aa7af] hover:bg-white hover:text-[#d76756]"><X size={15} /></button>
              </div>
            )}
            <div className="flex gap-2">
            <button type="button" aria-label="Attach image" title="Attach image" onClick={() => imageInputRef.current?.click()} disabled={isLoading} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e3ebe8] text-[#71808c] transition hover:border-[#087f74] hover:text-[#087f74] disabled:opacity-40"><ImagePlus size={17} /></button>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) readImage(file); }} />
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask about your finances..."
              aria-label="Message for AI assistant"
              maxLength={2000}
              disabled={isLoading}
              className="min-w-0 flex-1 rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] px-3 py-2.5 text-sm outline-none transition placeholder:text-[#a8b3b0] focus:border-[#087f74] focus:ring-2 focus:ring-[#e4f4f0] disabled:opacity-60"
            />
            <button
              type="submit"
              aria-label="Send message"
              title="Send message"
              disabled={(!message.trim() && !pendingImage) || isLoading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#087f74] text-white transition hover:bg-[#075c57] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={16} />
            </button>
            </div>
          </form>
        </section>
      )}

      <button
        type="button"
        aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
        title={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#087f74] text-white shadow-[0_10px_28px_rgba(8,127,116,.35)] transition duration-200 hover:-translate-y-1 hover:bg-[#075c57] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#087f74] focus-visible:ring-offset-2"
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={23} />}
      </button>
    </div>
  );
}

export default AiChatWidget;
