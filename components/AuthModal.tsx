import React, { useState, useEffect } from 'react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPatLogin: (token: string) => Promise<void>;
  onGenerateGithubUrl: () => Promise<string>;
  error: string | null;
}

const GITHUB_PAT_URL = "https://github.com/settings/tokens/new?scopes=repo&description=Bob%20AI%20Code%20Reviewer";

const GitHubIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className={className} fill="currentColor">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"></path>
    </svg>
);


export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onPatLogin, onGenerateGithubUrl, error }) => {
  const [token, setToken] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPatInput, setShowPatInput] = useState(false);
  
  const [githubAuthUrl, setGithubAuthUrl] = useState<string>('#');
  const [ssoError, setSsoError] = useState<string | null>(null);
  const [isUrlLoading, setIsUrlLoading] = useState<boolean>(true);


  useEffect(() => {
    if (isOpen) {
      setIsUrlLoading(true);
      setSsoError(null);
      
      onGenerateGithubUrl()
        .then(url => {
          setGithubAuthUrl(url);
        })
        .catch(e => {
          if (e instanceof Error) {
            setSsoError(e.message);
          } else {
            setSsoError("Could not generate GitHub sign-in link.");
          }
        })
        .finally(() => {
          setIsUrlLoading(false);
        });
    }
  }, [isOpen, onGenerateGithubUrl]);


  if (!isOpen) {
    return null;
  }

  const handlePatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSsoError(null);
    setIsLoggingIn(true);
    await onPatLogin(token);
    setIsLoggingIn(false);
  };

  const handleClose = () => {
    setShowPatInput(false);
    setToken('');
    setSsoError(null);
    onClose();
  }
  
  const renderSsoError = () => {
    if (!ssoError) return null;
  
    const isConfigError = ssoError.includes("Client ID");
  
    return (
      <div className="text-red-400 text-sm text-center bg-red-900/20 p-3 rounded-lg border border-red-500/30">
        <p className="font-bold mb-1">{isConfigError ? "Configuration Required" : "Authentication Error"}</p>
        <p>{ssoError}</p>
        {isConfigError && (
          <p className="mt-2 text-xs text-slate-400">
            Please contact the application administrator. The GitHub OAuth App needs to be configured correctly to enable sign-in.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity" onClick={handleClose}>
      <div className="bg-brand-primary border border-brand-secondary rounded-lg shadow-xl p-8 w-full max-w-md m-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-brand-text mb-4 text-center">Connect GitHub</h2>
        <p className="text-brand-subtle mb-8 text-center">
          Sign in to analyze private repositories.
        </p>
        
        <div className="space-y-4">
            <a 
              href={isUrlLoading || ssoError ? '#' : githubAuthUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => { if (isUrlLoading || ssoError) e.preventDefault(); }}
              className={`w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-gray-200 transition-all duration-200 ease-in-out transform hover:scale-105 ${isUrlLoading || ssoError ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                <GitHubIcon className="w-6 h-6" />
                {isUrlLoading ? 'Preparing Sign-in...' : 'Sign in with GitHub (Recommended)'}
            </a>

            {renderSsoError()}

             <div className="relative flex py-3 items-center">
                <div className="flex-grow border-t border-brand-secondary"></div>
                <span className="flex-shrink mx-4 text-brand-subtle text-sm">OR</span>
                <div className="flex-grow border-t border-brand-secondary"></div>
            </div>
        </div>

        {!showPatInput ? (
             <button onClick={() => { setShowPatInput(true); setSsoError(null); }} className="w-full text-center text-brand-accent hover:underline text-sm py-2">
                Continue with a Personal Access Token
            </button>
        ) : (
            <form onSubmit={handlePatSubmit}>
              <p className="text-brand-subtle mb-4 text-sm">
                You can use a Personal Access Token (PAT) with the <code className="bg-slate-900 text-brand-accent p-1 rounded font-mono text-xs">repo</code> scope.
                <a href={GITHUB_PAT_URL} target="_blank" rel="noopener noreferrer" className="text-brand-accent hover:underline text-sm ml-2">
                    Create one here &rarr;
                </a>
              </p>
              <div className="mb-4">
                <label htmlFor="token-input" className="sr-only">Personal Access Token</label>
                <input
                  id="token-input"
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full p-3 bg-brand-secondary border border-slate-600 rounded-lg font-mono text-sm text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
                  placeholder="ghp_..."
                  required
                />
              </div>

              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

              <div className="flex items-center justify-end gap-4 mt-6">
                <button type="button" onClick={handleClose} className="text-brand-subtle hover:text-brand-text py-2 px-4 rounded-md">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!token || isLoggingIn}
                  className="bg-brand-accent text-white font-bold py-2 px-6 rounded-lg shadow-lg hover:bg-sky-500 disabled:bg-slate-500 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isLoggingIn ? 'Verifying...' : 'Save & Connect'}
                </button>
              </div>
            </form>
        )}
      </div>
    </div>
  );
};