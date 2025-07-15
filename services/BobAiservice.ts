import { GoogleGenAI, Type } from "@google/genai";
import type { ReviewResult } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const reviewSchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.STRING,
            description: "A high-level, 2-3 sentence summary of the code changes and the overall quality of the pull request.",
        },
        overall_score: {
            type: Type.NUMBER,
            description: "An overall quality score from 0 to 100, where 100 is a perfect, production-ready PR. Base this on code quality, security, and adherence to best practices.",
        },
        breakage_risk: {
            type: Type.STRING,
            description: "An assessment of the risk that this change could break existing functionality. Should be one of: 'Very Low', 'Low', 'Medium', 'High', 'Very High'.",
        },
        issues: {
            type: Type.ARRAY,
            description: "A list of all identified issues in the provided code diff.",
            items: {
                type: Type.OBJECT,
                properties: {
                    severity: {
                        type: Type.INTEGER,
                        description: "A severity score from 1 to 5. 1: Critical (e.g., security vulnerability, data loss). 2: High (e.g., major bug, performance issue). 3: Medium (e.g., non-obvious bug, bad practice). 4: Low (e.g., style/nitpick). 5: Informational (e.g., a note or suggestion).",
                    },
                    file_path: {
                        type: Type.STRING,
                        description: "The full path of the file where the issue was found, as seen in the diff (e.g., 'a/path/to/file.js').",
                    },
                    description: {
                        type: Type.STRING,
                        description: "A clear and concise description of the issue.",
                    },
                    suggestion: {
                        type: Type.STRING,
                        description: "An actionable suggestion or code example on how to fix the issue.",
                    },
                },
                required: ["severity", "file_path", "description", "suggestion"],
            },
        },
    },
    required: ["summary", "overall_score", "breakage_risk", "issues"],
};


export const reviewPRDiff = async (diff: string): Promise<ReviewResult> => {
    const systemInstruction = `You are an expert enterprise-level software architect and a world-class security engineer. Your task is to review a GitHub Pull Request diff.
    Your analysis must be comprehensive, focusing on:
    - **Security Vulnerabilities**: SQL injection, XSS, insecure dependencies, secret leaks, etc. (Severity 1-2)
    - **Code Quality & Best Practices**: Maintainability, readability, DRY principle, SOLID principles. (Severity 3-4)
    - **Potential Bugs & Edge Cases**: Logical errors, null pointer exceptions, race conditions. (Severity 2-3)
    - **Performance**: Inefficient algorithms, memory leaks, unnecessary database queries. (Severity 2-3)
    - **Breaking Changes**: Assess the risk of the changes causing regressions in other parts of the system.

    You must grade the PR on a scale of 0-100 and provide a list of issues with specific severity levels.
    Severity Levels:
    - 1 (Critical): Must be fixed before merge. Major security flaws or data corruption risks.
    - 2 (High): Likely to cause production issues or significant bugs. Strongly recommend fixing.
    - 3 (Medium): Violates best practices or introduces technical debt. Should be addressed.
    - 4 (Low): Minor issues, style nits, or suggestions for slight improvements.
    - 5 (Informational): A note or observation that isn't an issue but is worth mentioning.
    
    Analyze the entire provided diff and structure your response *strictly* according to the provided JSON schema. If no issues are found, return an empty array for 'issues' and a score of 100.`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Review the following git diff:\n\n${diff}`,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: reviewSchema,
                temperature: 0.2,
            },
        });

        if (!response.text) {
            throw new Error("No response text received from Gemini API.");
        }
        const jsonText = response.text.trim();
        const result: ReviewResult = JSON.parse(jsonText);
        return result;

    } catch (error) {
        console.error("Error during Gemini API call:", error);
        if (error instanceof Error && error.message.includes('SAFETY')) {
             throw new Error("The PR content could not be processed due to safety settings. Please ensure it does not contain any sensitive or harmful content.");
        }
        throw new Error("Failed to get review from AI. The model may be overloaded or the GitHub diff is invalid.");
    }
};