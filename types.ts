export interface CodeIssue {
  severity: 1 | 2 | 3 | 4 | 5;
  file_path: string;
  description: string;
  suggestion: string;
}

export interface ReviewResult {
  summary: string;
  overall_score: number;
  breakage_risk: string;
  issues: CodeIssue[];
}

export interface GitHubUser {
  login: string;
  avatar_url: string;
  html_url: string;
}