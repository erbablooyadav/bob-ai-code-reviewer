import React from 'react';
import type { ReviewResult, CodeIssue } from '../types';
import { Loader } from './Loader';

const getSeverityInfo = (severity: CodeIssue['severity']) => {
    switch (severity) {
        case 1: return { color: 'bg-red-500', text: 'Critical', textColor: 'text-red-400' };
        case 2: return { color: 'bg-orange-500', text: 'High', textColor: 'text-orange-400' };
        case 3: return { color: 'bg-yellow-500', text: 'Medium', textColor: 'text-yellow-400' };
        case 4: return { color: 'bg-blue-500', text: 'Low', textColor: 'text-blue-400' };
        case 5: return { color: 'bg-gray-500', text: 'Info', textColor: 'text-gray-400' };
        default: return { color: 'bg-gray-600', text: 'Unknown', textColor: 'text-gray-500' };
    }
};

const ScoreGauge: React.FC<{ score: number }> = ({ score }) => {
  const scoreColor = score > 85 ? 'text-green-400' : score > 60 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="flex flex-col items-center">
        <div className={`text-6xl font-bold ${scoreColor}`}>{score}</div>
        <div className="text-sm font-semibold text-brand-subtle">Overall Score</div>
    </div>
  );
};

const IssueCard: React.FC<{ issue: CodeIssue }> = ({ issue }) => {
    const { color, text, textColor } = getSeverityInfo(issue.severity);
    return (
        <div className="bg-brand-secondary/50 rounded-lg p-4 border border-slate-700">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                     <span className={`w-3 h-3 rounded-full ${color}`}></span>
                     <span className={`font-semibold ${textColor}`}>{text} Priority</span>
                </div>
                <span className="font-mono text-xs bg-slate-700 px-2 py-1 rounded">{issue.file_path}</span>
            </div>
            <div className="ml-5">
              <p className="text-brand-text mb-2">{issue.description}</p>
              <div className="bg-slate-900/70 p-3 rounded-md border border-slate-600">
                  <p className="text-sm font-semibold text-sky-300 mb-1">Suggestion</p>
                  <p className="text-sm text-brand-subtle leading-relaxed">{issue.suggestion}</p>
              </div>
            </div>
        </div>
    );
};

interface ReviewOutputProps {
  review: ReviewResult | null;
  isLoading: boolean;
  error: string | null;
  loadingMessage: string;
}

export const ReviewOutput: React.FC<ReviewOutputProps> = ({ review, isLoading, error, loadingMessage }) => {
    const renderContent = () => {
        if (isLoading) {
            return <div className="flex flex-col items-center justify-center h-full min-h-[250px] p-8"><Loader /><p className="mt-4 text-brand-subtle">{loadingMessage}</p></div>;
        }
        if (error) {
            return <div className="flex flex-col items-center justify-center h-full min-h-[250px] p-8 text-center text-red-400"><h3 className="text-lg font-semibold">An Error Occurred</h3><p className="mt-2 text-sm">{error}</p></div>;
        }
        if (review) {
            const sortedIssues = [...review.issues].sort((a, b) => a.severity - b.severity);
            return (
                <div className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-center text-center md:text-left">
                        <div className="md:col-span-1 flex justify-center">
                            <ScoreGauge score={review.overall_score} />
                        </div>
                        <div className="md:col-span-2">
                             <h3 className="text-lg font-semibold text-brand-accent mb-2">Summary</h3>
                             <p className="text-brand-text mb-4">{review.summary}</p>
                             <h4 className="font-semibold text-brand-subtle">Breakage Risk: <span className="font-bold text-brand-text">{review.breakage_risk}</span></h4>
                        </div>
                    </div>

                    <div className="border-t border-brand-secondary my-6"></div>

                    <div>
                        <h3 className="text-xl font-bold mb-4">Identified Issues ({review.issues.length})</h3>
                        {sortedIssues.length > 0 ? (
                           <div className="space-y-4">
                               {sortedIssues.map((issue, index) => <IssueCard key={index} issue={issue} />)}
                           </div>
                        ) : (
                           <div className="text-center p-8 bg-brand-secondary rounded-lg">
                               <p className="text-green-400 font-semibold">Excellent! No issues found.</p>
                               <p className="text-brand-subtle mt-2">This PR meets all quality and security standards.</p>
                           </div>
                        )}
                    </div>
                </div>
            );
        }
        return <div className="flex flex-col items-center justify-center h-full min-h-[250px] p-8 text-center"><h3 className="text-lg font-semibold text-brand-text">Awaiting Analysis</h3><p className="mt-2 text-sm text-brand-subtle">Enter a GitHub PR link and click "Review PR" to start.</p></div>;
    };

    return (
        <div className="h-full flex flex-col">
          <div className="flex-shrink-0 bg-slate-900/50 px-4 py-2 border-b border-brand-secondary rounded-t-lg">
             <h2 className="text-sm font-semibold text-brand-subtle">Bob's Feedback</h2>
          </div>
          <div className="flex-grow overflow-y-auto">
             {renderContent()}
          </div>
        </div>
    );
};
