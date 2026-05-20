'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getResults, deleteResult } from '@/lib/api'; 

interface ResultRecord {
  id: number;
  job_id: number;
  url: string;
  title: string | null;
  status: string;
  scraped_at: string;
  error_message: string | null;
  headings: any; 
  links: any;
}

export default function JobResultsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [results, setResults] = useState<ResultRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingResultId, setDeletingResultId] = useState<number | null>(null); // Track inline loading indicator state

  useEffect(() => {
    if (id) {
      getResults(Number(id), 20, 0)
        .then((res) => {
          setResults(res.data || []);
        })
        .catch((err) => {
          console.error("Failed to query runtime telemetry history block:", err);
        })
        .finally(() => setLoading(false));
    }
  }, [id]);

  // Handle deleting a single scraped log row
  const handleDeleteResult = async (resultId: number) => {
    if (!confirm("Are you sure you want to delete this specific execution log entry?")) {
      return;
    }

    setDeletingResultId(resultId);
    try {
      await deleteResult(resultId);
      // Instantly remove from the client view list without forcing a full database table refetch
      setResults((prev) => prev.filter((rec) => rec.id !== resultId));
    } catch (err) {
      console.error(err);
      alert(`Failed to delete execution record #${resultId}`);
    } finally {
      setDeletingResultId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <p className="text-sm font-semibold text-gray-400">Querying telemetry historic segments...</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8 min-h-screen bg-transparent">
      
      {/* Return Controls Navigation Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-800">
        <div>
          <button 
            onClick={() => router.push('/')}
            className="text-xs text-blue-500 hover:text-blue-400 font-semibold flex items-center gap-1.5 transition-colors"
          >
            ← Back to Operations Hub
          </button>
          <h1 className="text-2xl font-extrabold mt-2 text-gray-100">Results for Job #{id}</h1>
        </div>
      </div>

      {/* Primary Historical Execution List */}
      <div className="space-y-6">
        {results.length === 0 ? (
          <div className="p-10 border border-dashed border-gray-800 rounded-2xl text-center text-gray-400">
            No execution logs found for this job target.
          </div>
        ) : (
          results.map((record) => {
            const isThisDeleting = deletingResultId === record.id;

            // Parse headings (quotes) and links safely whether they arrive as an object or a string string
            let quotesArray: any[] = [];
            try {
              quotesArray = typeof record.headings === 'string' ? JSON.parse(record.headings) : record.headings;
              if (!Array.isArray(quotesArray)) quotesArray = [];
            } catch (e) {
              quotesArray = [];
            }

            let linksArray: string[] = [];
            try {
              linksArray = typeof record.links === 'string' ? JSON.parse(record.links) : record.links;
              if (!Array.isArray(linksArray)) linksArray = [];
            } catch (e) {
              linksArray = [];
            }

            return (
              <div key={record.id} className="border border-gray-800 rounded-2xl bg-white p-6 shadow-md space-y-5">
                
                {/* Header Metadata Strip */}
                <div className="flex justify-between items-start gap-4 flex-wrap">
                  <div className="space-y-1 flex-1 min-w-[200px]">
                    <h2 className="text-lg font-bold text-gray-900">{record.title || 'Quotes to Scrape'}</h2>
                    <p className="text-xs font-mono text-gray-400 break-all">{record.url}</p>
                    <span className="inline-block mt-1 font-mono text-[10px] text-gray-400 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded">
                      RUN_ID: {record.id}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-right text-xs whitespace-nowrap self-start md:self-auto">
                    <div className="space-y-1.5">
                      <div className="text-gray-400 font-medium">
                        {new Date(record.scraped_at).toLocaleString()}
                      </div>
                      <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 uppercase tracking-wider">
                        {record.status}
                      </span>
                    </div>

                    {/* Trash Button for Individual Result Removal */}
                    <button
                      onClick={() => handleDeleteResult(record.id)}
                      disabled={deletingResultId !== null}
                      title="Delete This Record Entry"
                      className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 disabled:bg-gray-100 disabled:text-gray-300 transition-all rounded-xl"
                    >
                      {isThisDeleting ? (
                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Extracted Content Layout */}
                <div className="border-t border-gray-100 pt-4 space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Extracted Quotes ({quotesArray.length})</h3>
                  
                  {quotesArray.length > 0 ? (
                    <div className="space-y-3">
                      {quotesArray.map((quote, idx) => (
                        <div key={idx} className="bg-gray-50 border border-gray-200/60 p-4 rounded-xl space-y-2">
                          <p className="text-sm font-medium text-gray-900 italic">“{quote.text || quote}”</p>
                          {quote.author && (
                            <div className="flex items-center justify-between text-xs flex-wrap gap-2 pt-1">
                              <span className="font-bold text-gray-600">— {quote.author}</span>
                              {quote.tags && Array.isArray(quote.tags) && (
                                <div className="flex items-center gap-1.5">
                                  {quote.tags.map((tag: string, tIdx: number) => (
                                    <span key={tIdx} className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[10px] font-semibold border border-blue-100">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic pl-1">No structural quotes captured in this run.</p>
                  )}

                  {/* Discovered Links Navigation Index */}
                  {linksArray.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                        Discovered Profile Links ({linksArray.length})
                      </p>
                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-200/60 max-h-40 overflow-y-auto space-y-1 font-mono text-[11px] text-gray-500">
                        {linksArray.map((link, lIdx) => (
                          <div key={lIdx} className="truncate hover:text-blue-600 cursor-pointer break-all select-all">
                            🔗 {link}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}