import React from 'react';

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}

export const UrlInput: React.FC<UrlInputProps> = ({ value, onChange, disabled }) => {
  return (
    <div className="flex flex-col gap-2">
       <label htmlFor="pr-url" className="text-sm font-medium text-brand-subtle">GitHub Pull Request URL</label>
      <input
        id="pr-url"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="e.g., https://github.com/owner/repo/pull/123"
        className="w-full p-3 bg-brand-secondary border border-slate-600 rounded-lg font-mono text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent disabled:opacity-50"
      />
    </div>
  );
};
