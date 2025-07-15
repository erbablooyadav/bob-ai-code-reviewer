import { GITHUB_CLIENT_ID } from '../config';

const BACKEND_AUTH_URL = 'http://localhost:8080/v1/auth/github';
const REDIRECT_URI = window.location.origin;
const CODE_VERIFIER_KEY = 'github_code_verifier';

// 🔐 Step 1: Generate a random code verifier
const generateCodeVerifier = (): string => {
    const randomBytes = new Uint8Array(32);
    window.crypto.getRandomValues(randomBytes);
    return btoa(String.fromCharCode(...randomBytes))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
};

// 🧠 Step 2: Generate the code challenge from verifier (SHA256)
const generateCodeChallenge = async (verifier: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
};

// 🔗 Step 3: Generate GitHub authorization URL
export const generateGitHubAuthUrl = async (): Promise<string> => {
    if (!GITHUB_CLIENT_ID) {
        throw new Error("GitHub Client ID is not configured.");
    }

    const verifier = generateCodeVerifier();
    localStorage.setItem(CODE_VERIFIER_KEY, verifier);
    const challenge = await generateCodeChallenge(verifier);

    const params = new URLSearchParams({
        client_id: GITHUB_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        scope: 'repo read:user',
        response_type: 'code',
        code_challenge: challenge,
        code_challenge_method: 'S256',
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
};

// 🔄 Step 4: Exchange the GitHub code for access token via backend
export const exchangeCodeForToken = async (code: string): Promise<string> => {
    const verifier = localStorage.getItem(CODE_VERIFIER_KEY);
    localStorage.removeItem(CODE_VERIFIER_KEY);

    if (!verifier) {
        throw new Error("Code verifier missing. Session might've expired.");
    }

    const requestBody = {
        code,
        verifier,
        redirect_uri: REDIRECT_URI,
    };

    const response = await fetch(BACKEND_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error("Token exchange failed:", response.status, errorText);
        throw new Error(`GitHub authentication failed. Server responded with ${response.status}`);
    }

    const data = await response.json();

    if (!data.access_token) {
        console.error("Access token missing:", data);
        throw new Error("Access token not found. Try signing in again.");
    }

    return data.access_token;
};