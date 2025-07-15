
import React from 'react';

interface CodeInputProps {
  value: string;
  onChange: (value: string) => void;
}

export const CodeInput: React.FC<CodeInputProps> = ({ value, onChange }) => {
  return (
    <div className="h-[60vh] lg:h-auto lg:flex-grow flex flex-col bg-brand-secondary rounded-lg border border-slate-600 shadow-inner">
      <div className="flex-shrink-0 bg-slate-900/50 px-4 py-2 border-b border-slate-600 rounded-t-lg">
        <h2 className="text-sm font-semibold text-brand-subtle">Your Code</h2>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste your code snippet here..."
        className="w-full h-full p-4 bg-transparent font-mono text-sm text-brand-text resize-none focus:outline-none focus:ring-0"
        spellCheck="false"
      />
    </div>
  );
};
