import React from 'react';
import type { GitHubUser } from '../types';

const ShieldIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-brand-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
  </svg>
);

interface HeaderProps {
    user: GitHubUser | null;
    onSignIn: () => void;
    onSignOut: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onSignIn, onSignOut }) => {
  return (
    <header className="bg-brand-primary/80 backdrop-blur-sm sticky top-0 z-10 border-b border-brand-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldIcon />
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-text tracking-tight">
            Bob - The AI Code Reviewer
          </h1>
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <a href={user.html_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 group">
                <img src={user.avatar_url} alt={user.login} className="w-8 h-8 rounded-full border-2 border-brand-secondary group-hover:border-brand-accent transition-colors"/>
                <span className="text-brand-text font-semibold hidden sm:inline group-hover:text-brand-accent transition-colors">{user.login}</span>
              </a>
              <button onClick={onSignOut} className="text-sm text-brand-subtle hover:text-brand-text hover:underline">
                Sign Out
              </button>
            </>
          ) : (
             <button onClick={onSignIn} className="bg-brand-secondary hover:bg-slate-600 text-brand-text font-bold py-2 px-4 rounded-lg transition-colors">
                Sign in with GitHub
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
