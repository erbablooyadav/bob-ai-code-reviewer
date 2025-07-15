import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { UrlInput } from './components/UrlInput';
import { ReviewOutput } from './components/ReviewOutput';
import { AuthModal } from './components/AuthModal';
import { reviewPRDiff } from './services/BobAiservice';
import { generateGitHubAuthUrl, exchangeCodeForToken } from './services/authService';
import type { ReviewResult, GitHubUser } from './types';

const GITHUB_PR_URL_REGEX = /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/;
const GITHUB_TOKEN_KEY = 'github_pat';

const App: React.FC = () => {
  const [prUrl, setPrUrl] = useState<string>('');
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Auth state
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(true); // Start as true
  const [authError, setAuthError] = useState<string | null>(null);
  
  const verifyToken = useCallback(async (token: string): Promise<GitHubUser | null> => {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `token ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Invalid token or insufficient permissions.');
      }
      const userData: GitHubUser = await response.json();
      return userData;
    } catch (e) {
      console.error("Token verification failed:", e);
      return null;
    }
  }, []);

  const completeLogin = useCallback(async (token: string) => {
    localStorage.setItem(GITHUB_TOKEN_KEY, token);
    const userData = await verifyToken(token);
    if (userData) {
      setAuthToken(token);
      setUser(userData);
      setIsAuthModalOpen(false);
    } else {
      setAuthError("Verification failed. Please check your token and its permissions.");
      localStorage.removeItem(GITHUB_TOKEN_KEY);
    }
  }, [verifyToken]);
  
  useEffect(() => {
    const handleAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');

      if (code) {
        // Clear the code from the URL
        window.history.replaceState({}, document.title, window.location.pathname);
        setIsAuthModalOpen(false);
        setLoadingMessage("Authenticating with GitHub...");
        setIsLoading(true);
        try {
          const token = await exchangeCodeForToken(code);
          await completeLogin(token);
          // If in a popup, this tab can be closed. For now, user can close it manually.
          // In a new tab scenario, we might want to inform the user to return to the original tab.
          document.body.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background-color:#1e293b;color:#e2e8f0;"><h1>Authentication Successful!</h1><p>You can now close this tab and return to the application.</p></div>`;
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "An unknown authentication error occurred.";
          setError(`Failed to authenticate with GitHub: ${errorMessage} Please try again.`);
          console.error(err);
        } finally {
          setIsLoading(false);
          setLoadingMessage("");
        }
      } else {
        const storedToken = localStorage.getItem(GITHUB_TOKEN_KEY);
        if (storedToken) {
          const userData = await verifyToken(storedToken);
          if (userData) {
            setAuthToken(storedToken);
            setUser(userData);
          } else {
            localStorage.removeItem(GITHUB_TOKEN_KEY);
          }
        }
      }
      setIsAuthenticating(false);
    };

    handleAuth();
  }, [verifyToken, completeLogin]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(GITHUB_TOKEN_KEY);
    setAuthToken(null);
    setUser(null);
  }, []);

  // This effect syncs authentication state across browser tabs.
  useEffect(() => {
    const syncAuthAcrossTabs = (event: StorageEvent) => {
      // Check if the event is for our token and from another tab.
      if (event.key === GITHUB_TOKEN_KEY) {
        const token = event.newValue;
        if (token) {
          // A token was added in another tab, log in this tab.
          verifyToken(token).then(userData => {
            if (userData) {
              setAuthToken(token);
              setUser(userData);
              setIsAuthModalOpen(false); // Close auth modal if it's open
            } else {
              // The token from the other tab is invalid. Clean up.
              localStorage.removeItem(GITHUB_TOKEN_KEY);
            }
          });
        } else {
          // The token was removed in another tab, log out this tab.
          handleLogout();
        }
      }
    };

    window.addEventListener('storage', syncAuthAcrossTabs);
    return () => window.removeEventListener('storage', syncAuthAcrossTabs);
  }, [verifyToken, handleLogout]);


  const handlePatLogin = async (token: string) => {
    setAuthError(null);
    await completeLogin(token);
  };

  const handleReview = useCallback(async () => {
    const match = prUrl.match(GITHUB_PR_URL_REGEX);
    if (!match) {
      setError("Please enter a valid GitHub Pull Request URL.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setReview(null);
    
    const [, owner, repo, pullNumber] = match;

    try {
      setLoadingMessage('Fetching PR data from GitHub...');
      const diffUrl = `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}`;
      
      const headers: HeadersInit = {
        'Accept': 'application/vnd.github.v3.diff'
      };
      if (authToken) {
        headers['Authorization'] = `token ${authToken}`;
      }

      const diffResponse = await fetch(diffUrl, { headers });

      if (!diffResponse.ok) {
        if (diffResponse.status === 404) {
          throw new Error(`Could not find PR. If it's a private repository, please sign in with a valid GitHub token. Status: ${diffResponse.status}`);
        }
        if (diffResponse.status === 401 || diffResponse.status === 403) {
           throw new Error(`GitHub authorization failed. Your token may be invalid or lack 'repo' permissions. Status: ${diffResponse.status}`);
        }
        throw new Error(`Failed to fetch PR data from GitHub. Status: ${diffResponse.status}`);
      }
      
      const diffText = await diffResponse.text();

      if (!diffText.trim()) {
        throw new Error("The pull request seems to be empty or contains no code changes.");
      }

      setLoadingMessage('Bob is analyzing the changes...');
      const result = await reviewPRDiff(diffText);
      setReview(result);

    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred during the review process.");
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [prUrl, authToken]);
  
  if (isAuthenticating && !new URLSearchParams(window.location.search).get('code')) {
    return (
      <div className="min-h-screen bg-brand-primary text-brand-text font-sans flex items-center justify-center">
        {/* You can put a loader here if you want */}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-primary text-brand-text font-sans">
      <Header 
        user={user}
        onSignIn={() => setIsAuthModalOpen(true)}
        onSignOut={handleLogout}
      />
      <main className="p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
          <div className="bg-slate-900/50 rounded-lg border border-brand-secondary p-6 shadow-xl">
              <h2 className="text-xl font-bold text-brand-text mb-2">Analyze a Pull Request</h2>
              <p className="text-brand-subtle mb-6">
                Paste a GitHub PR or Sign In - Bob will review code quality, bugs, security risks, breaking changes & more. <span role="img" aria-label="cool">😎</span>
              </p>
              <div className="flex flex-col sm:flex-row items-end gap-4">
                  <div className="w-full">
                     <UrlInput value={prUrl} onChange={setPrUrl} disabled={isLoading} />
                  </div>
                   <button
                      onClick={handleReview}
                      disabled={isLoading || !prUrl}
                      className="w-full sm:w-auto flex-shrink-0 bg-brand-accent text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-sky-500 disabled:bg-slate-500 disabled:cursor-not-allowed transition-all duration-200 ease-in-out transform hover:scale-105"
                    >
                      {isLoading ? 'Analyzing...' : 'Review PR'}
                    </button>
              </div>
          </div>
          
          <div className="bg-slate-900/50 rounded-lg border border-brand-secondary min-h-[300px]">
             <ReviewOutput review={review} isLoading={isLoading} error={error} loadingMessage={loadingMessage} />
          </div>
        </div>
      </main>
      <footer className="text-center p-4 text-brand-subtle text-sm">
        <p>Powered by Bob AI. This tool analyzes GitHub pull requests for security issues.</p>
      </footer>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => { setIsAuthModalOpen(false); setAuthError(null); }}
        onPatLogin={handlePatLogin}
        onGenerateGithubUrl={generateGitHubAuthUrl}
        error={authError}
      />
    </div>
  );
};

export default App;