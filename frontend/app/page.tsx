'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getResults, getJobs, runJob, deleteJob } from '@/lib/api';

interface Result {
  id: number;
  job_id: number;
  url: string;
  title: string | null;
  status: string;
  scraped_at: string;
  headings: any;
  links: any;
}

interface InferredJob {
  id: number;
  url: string;
  title: string;
  lastRun: string;
  successCount: number;
  totalCount: number;
}

interface DBJob {
  id: number;
  url: string;
  title: string;
}

export default function Dashboard() {
  const [results, setResults] = useState<Result[]>([]);
  const [inferredJobs, setInferredJobs] = useState<InferredJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningJobId, setRunningJobId] = useState<number | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<number | null>(null);
  const [jobNamesMap, setJobNamesMap] = useState<Record<number, string>>({});

  const fetchData = async () => {
    try {
      // Fetch both live profiles and execution metrics matrices in parallel pipelines
      const [resultsRes, jobsRes] = await Promise.all([
        getResults(undefined, 50),
        getJobs(100, 0)
      ]);

      const telemetryData: Result[] = resultsRes.data || [];
      const activeJobsData: DBJob[] = jobsRes.data || [];

      // Build a dynamic lookup dictionary using live Postgres rows
      const namesDictionary: Record<number, string> = {};
      activeJobsData.forEach((job) => {
        namesDictionary[job.id] = job.title;
      });
      setJobNamesMap(namesDictionary);
      setResults(telemetryData);

      processJobsLayout(telemetryData, activeJobsData, namesDictionary);
    } catch (err) {
      console.warn("API Pipeline error caught. Running in simulation mode.");
    } finally {
      setLoading(false);
    }
  };

  const processJobsLayout = (dataFeed: Result[], activeJobs: DBJob[], namesLookup: Record<number, string>) => {
    const uniqueJobsMap = new Map<number, InferredJob>();
    
    // First, populate using empty base models from the true registered jobs query
    activeJobs.forEach((job) => {
      uniqueJobsMap.set(job.id, {
        id: job.id,
        url: job.url,
        title: job.title || `Scraper Profile #${job.id}`,
        lastRun: 'never',
        successCount: 0,
        totalCount: 0,
      });
    });

    // Layer in metric tallies dynamically from execution telemetry records
    dataFeed.forEach((res) => {
      const isSuccess = res.status === 'success' || res.status === 'completed';
      const displayTitle = namesLookup[res.job_id] || res.title || `Scraper Profile #${res.job_id}`;

      if (!uniqueJobsMap.has(res.job_id)) {
        uniqueJobsMap.set(res.job_id, {
          id: res.job_id,
          url: res.url,
          title: displayTitle,
          lastRun: res.scraped_at,
          successCount: isSuccess ? 1 : 0,
          totalCount: 1,
        });
      } else {
        const current = uniqueJobsMap.get(res.job_id)!;
        current.totalCount += 1;
        if (isSuccess) current.successCount += 1;
        
        if (current.lastRun === 'never' || new Date(res.scraped_at) > new Date(current.lastRun)) {
          current.lastRun = res.scraped_at;
        }
      }
    });

    // Absolute fallback if database matrices render completely empty clusters
    if (uniqueJobsMap.size === 0) {
      uniqueJobsMap.set(1, {
        id: 1,
        url: "https://quotes.toscrape.com",
        title: "quots 2",
        lastRun: new Date().toISOString(),
        successCount: 0,
        totalCount: 0,
      });
    }

    setInferredJobs(Array.from(uniqueJobsMap.values()).sort((a, b) => b.id - a.id));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunJob = async (jobId: number) => {
    setRunningJobId(jobId);
    try {
      await runJob(jobId);
      setTimeout(fetchData, 2500);
    } catch (err) {
      console.error(err);
      alert(`Pipeline error on node #${jobId}`);
    } finally {
      setRunningJobId(null);
    }
  };

  const handleDeleteJob = async (jobId: number) => {
    if (!confirm("Are you sure you want to delete this scraper profile? This will drop all associated historical execution logs!")) {
      return;
    }

    setDeletingJobId(jobId);
    try {
      await deleteJob(jobId);
      setInferredJobs(prev => prev.filter(job => job.id !== jobId));
      // Clean up telemetry feed to match the sudden backend cascade removal safely
      setResults(prev => prev.filter(res => res.job_id !== jobId));
    } catch (err) {
      console.error(err);
      alert(`Failed to request runtime removal on node #${jobId}`);
    } finally {
      setDeletingJobId(null);
    }
  };

  const successfulRuns = results.filter(r => r.status === 'success' || r.status === 'completed').length;
  const globalSuccessRate = results.length ? Math.round((successfulRuns / results.length) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-semibold text-gray-400">Syncing operational dashboard telemetry...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-10 min-h-screen bg-transparent">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-gray-800">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Scraping Operations Center</h1>
          <p className="text-sm text-gray-400 mt-1">Live background cron analytics, automation profiles, and pipeline metrics feed.</p>
        </div>
        <Link
          href="/job"
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-sm text-sm self-start md:self-center flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Scraper Profile
        </Link>
      </div>

      {/* Aggregate Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Active Target Profiles</p>
          <p className="text-3xl font-extrabold mt-1">{inferredJobs.length}</p>
        </div>
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Engine Invocations</p>
          <p className="text-3xl font-extrabold mt-1">{results.length}</p>
        </div>
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Target Node Accuracy</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-3xl font-extrabold">{globalSuccessRate}%</p>
            <span className="text-xs font-semibold text-gray-400">({successfulRuns}/{results.length} builds)</span>
          </div>
        </div>
      </div>

      {/* Registered Scrapers */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Registered Scraper Interfaces</h2>
        
        <div className="grid gap-4">
          {inferredJobs.map((job) => {
            const isThisJobRunning = runningJobId === job.id;
            const isThisJobDeleting = deletingJobId === job.id;
            const successRate = job.totalCount > 0 ? Math.round((job.successCount / job.totalCount) * 100) : 0;

            return (
              <div 
                key={job.id} 
                className="border rounded-2xl p-5 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-5 border-gray-200 hover:border-gray-700 shadow-sm transition-all group"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-lg font-bold group-hover:text-blue-500 transition-colors">{job.title}</h3>
                    <span className="text-[10px] bg-gray-100 text-gray-900 border border-gray-200 px-2 py-0.5 rounded-md font-mono font-bold">
                      NODE_ID: {job.id}
                    </span>
                    {isThisJobRunning && (
                      <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-md font-medium animate-pulse flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Worker Active
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs font-mono break-all max-w-3xl text-gray-400">{job.url}</p>
                  
                  <div className="flex items-center gap-4 text-xs text-gray-400 pt-1">
                    <div>Health Metric: <span className="font-bold text-gray-500">{job.totalCount > 0 ? `${successRate}% pass` : '0 runs logged'}</span></div>
                    <div className="w-1 h-1 rounded-full bg-gray-700"></div>
                    <div>Last Query: <span className="font-medium text-gray-500">{job.totalCount > 0 && job.lastRun !== 'never' ? new Date(job.lastRun).toLocaleDateString() : 'never'}</span></div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end md:self-center pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 w-full md:w-auto justify-between md:justify-end">
                  <Link 
                    href={`/results/${job.id}`} 
                    className="text-blue-500 text-xs font-bold hover:text-blue-600 transition-colors flex items-center gap-1 bg-blue-50/60 hover:bg-blue-50 px-3.5 py-2 rounded-xl"
                  >
                    Historical Logs
                  </Link>

                  <button
                    onClick={() => handleRunJob(job.id)}
                    disabled={runningJobId !== null || deletingJobId !== null}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      isThisJobRunning
                        ? 'bg-amber-500 text-white cursor-wait'
                        : 'bg-gray-900 text-gray-100 hover:bg-gray-800 disabled:bg-gray-100 disabled:text-gray-400 shadow-none'
                    }`}
                  >
                    {isThisJobRunning ? 'Processing...' : 'Run Worker Now'}
                  </button>

                  <button
                    onClick={() => handleDeleteJob(job.id)}
                    disabled={runningJobId !== null || deletingJobId !== null}
                    title="Delete Scraper Profile"
                    className="p-2 text-red-500 bg-red-50 hover:bg-red-100 disabled:bg-gray-100 disabled:text-gray-400 transition-all rounded-xl"
                  >
                    {isThisJobDeleting ? (
                      <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Telemetry Feed */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">System Activity Telemetry Feed</h2>
        <div className="space-y-3">
          {results.length === 0 ? (
            <p className="text-xs text-gray-500 italic pl-1">No transaction items found inside history matrices.</p>
          ) : (
            results.map((res) => {
              const isSuccess = res.status === 'success' || res.status === 'completed';
              const logTitle = jobNamesMap[res.job_id] || res.title || 'Asynchronous Core Yield';

              let parsedQuotesLength = 0;
              try {
                const arrayBlock = typeof res.headings === 'string' ? JSON.parse(res.headings) : res.headings;
                if (Array.isArray(arrayBlock)) parsedQuotesLength = arrayBlock.length;
              } catch (e) {}

              return (
                <div 
                  key={res.id} 
                  className="bg-white border border-gray-200 rounded-xl p-4.5 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-gray-300 transition-all"
                >
                  <div className="space-y-1">
                    <p className="font-bold text-sm">
                      Job Index #{res.job_id} – {logTitle}
                    </p>
                    <p className="text-xs font-mono break-all max-w-2xl text-gray-400">{res.url}</p>
                    {parsedQuotesLength > 0 && (
                      <div className="mt-2 text-[10px] text-blue-500 font-bold bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                        <span>📦</span> {parsedQuotesLength} dataset rows bound successfully inside headings
                      </div>
                    )}
                  </div>

                  <div className="text-left sm:text-right text-[11px] text-gray-400 whitespace-nowrap space-y-1 w-full sm:w-auto flex sm:flex-col justify-between sm:justify-center items-center sm:items-end border-t sm:border-t-0 pt-2.5 sm:pt-0 border-gray-100">
                    <span className="sm:order-1 font-medium">{new Date(res.scraped_at).toLocaleString()}</span>
                    <span className={`capitalize px-2 py-0.5 rounded-md font-bold text-[10px] border sm:order-2 ${
                      isSuccess
                        ? 'bg-green-50 text-green-700 border-green-200' 
                        : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {res.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

    </div>
  );
}