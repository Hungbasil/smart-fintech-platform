import React, { useEffect, useRef, useState } from 'react';

type OtpInputProps = { value?: string; onChange: (value: string) => void; disabled?: boolean };

export const OtpInput: React.FC<OtpInputProps> = ({ value = '', onChange, disabled }) => {
  const [digits, setDigits] = useState<string[]>(() => Array.from({ length: 6 }, (_, index) => value[index] || ''));
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  useEffect(() => { setDigits(Array.from({ length: 6 }, (_, index) => value[index] || '')); }, [value]);
  const update = (next: string[], focus?: number) => { setDigits(next); onChange(next.join('')); if (focus !== undefined) refs.current[focus]?.focus(); };
  const handleChange = (index: number, input: string) => {
    const digit = input.replace(/\D/g, '').slice(-1);
    const next = [...digits]; next[index] = digit; update(next, digit && index < 5 ? index + 1 : undefined);
  };
  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) refs.current[index - 1]?.focus();
  };
  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault(); const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const next = Array.from({ length: 6 }, (_, index) => pasted[index] || ''); update(next, Math.min(pasted.length, 5));
  };
  return <div className="flex justify-center gap-2 sm:gap-3">{digits.map((digit, index) => <input key={index} ref={(element) => { refs.current[index] = element; }} inputMode="numeric" maxLength={1} value={digit} disabled={disabled} onChange={(event) => handleChange(index, event.target.value)} onKeyDown={(event) => handleKeyDown(index, event)} onPaste={handlePaste} className="h-12 w-11 rounded-xl border border-[#e3ebe8] bg-[#fbfdfc] text-center text-xl font-extrabold text-[#17212b] outline-none transition focus:border-[#087f74] focus:ring-2 focus:ring-[#e4f4f0] disabled:opacity-50" aria-label={`OTP digit ${index + 1}`} />)}</div>;
};