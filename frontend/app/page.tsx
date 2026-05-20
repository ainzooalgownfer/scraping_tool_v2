'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getResults, getJobs, runJob, deleteJob, toggleJobActive } from '@/lib/api';

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
  is_active: boolean; 
}

interface DBJob {
  id: number;
  url: string;
  name: string; 
  is_active?: boolean; 
}

export default function Dashboard() {
  const [results, setResults] = useState<Result[]>([]);
  const [inferredJobs, setInferredJobs] = useState<InferredJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningJobId, setRunningJobId] = useState<number | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<number | null>(null);
  const [jobNamesMap, setJobNamesMap] = useState<Record<number, string>>({});

  // Utility to handle safe local time adjustments explicitly for UTC+2 (CEST)
  const formatToLocalTimezone = (utcString: string): string => {
    if (!utcString || utcString === 'never') return 'never';
    try {
      const dateObj = new Date(utcString);
      return dateObj.toLocaleString('fr-FR', {
        timeZone: 'Europe/Paris',
        hour12: false,
      });
    } catch (e) {
      return utcString;
    }
  };

  const fetchData = async () => {
    try {
      const [resultsRes, jobsRes] = await Promise.all([
        getResults(undefined, 50),
        getJobs(100, 0)
      ]);

      const telemetryData: Result[] = resultsRes.data || [];
      const activeJobsData: DBJob[] = jobsRes.data || [];

      const namesDictionary: Record<number, string> = {};
      activeJobsData.forEach((job) => {
        namesDictionary[job.id] = job.name; 
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
    
    activeJobs.forEach((job) => {
      const cleanTitle = job.name && job.name.trim() !== "" 
        ? job.name 
        : `Scraper Profile #${job.id}`;

      uniqueJobsMap.set(job.id, {
        id: job.id,
        url: job.url,
        title: cleanTitle, 
        lastRun: 'never',
        successCount: 0,
        totalCount: 0,
        is_active: job.is_active !== undefined ? job.is_active : true, 
      });
    });

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
          is_active: true,
        });
      } else {
        const current = uniqueJobsMap.get(res.job_id)!;
        current.totalCount += 1;
        if (isSuccess) current.successCount += 1;
        
        if (namesLookup[res.job_id]) {
          current.title = namesLookup[res.job_id];
        }

        if (current.lastRun === 'never' || new Date(res.scraped_at) > new Date(current.lastRun)) {
          current.lastRun = res.scraped_at;
        }
      }
    });

    if (uniqueJobsMap.size === 0) {
      uniqueJobsMap.set(1, {
        id: 1,
        url: "https://quotes.toscrape.com",
        title: "quots 2",
        lastRun: new Date().toISOString(),
        successCount: 0,
        totalCount: 0,
        is_active: true,
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

  const handleToggleActive = async (jobId: number, currentStatus: boolean) => {
    const nextStatus = !currentStatus;

    // 1. Optimistic UI change for immediate layout feedback
    setInferredJobs((prev) =>
      prev.map((job) => (job.id === jobId ? { ...job, is_active: nextStatus } : job))
    );

    try {
      // 2. Dispatch secure JSON body schema modification via Axios instance wrapper
      await toggleJobActive(jobId, nextStatus);
    } catch (err) {
      console.error('API Mutation Failure:', err);
      alert(`Failed to sync runtime active flag on Node #${jobId}`);
      
      // 3. Rollback UI instantly if database server transaction fails
      setInferredJobs((prev) =>
        prev.map((job) => (job.id === jobId ? { ...job, is_active: currentStatus } : job))
      );
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
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 relative flex items-center justify-center bg-white border border-gray-100 rounded-full shadow-sm animate-bounce">
            <img src="/logo.jpg" alt="App Logo" className="w-10 h-10 object-contain rounded-md" />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-semibold text-gray-400 mt-1">Syncing operational dashboard telemetry...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-10 min-h-screen bg-transparent">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <div className="p-1.5 bg-white border border-gray-200 rounded-xl shadow-sm max-w-fit shrink-0">
            <img src="/logo.jpg" alt="Operations Center Logo" className="w-9 h-9 object-contain rounded-lg" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Scraping Operations Center</h1>
            <p className="text-sm text-gray-400 mt-1">Live background cron analytics, automation profiles, and pipeline metrics feed.</p>
          </div>
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
          <p className="text-3xl font-extrabold mt-1 text-gray-900">{inferredJobs.length}</p>
        </div>
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Engine Invocations</p>
          <p className="text-3xl font-extrabold mt-1 text-gray-900">{results.length}</p>
        </div>
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Target Node Accuracy</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-3xl font-extrabold text-gray-900">{globalSuccessRate}%</p>
            <span className="text-xs font-semibold text-gray-400">({successfulRuns}/{results.length} builds)</span>
          </div>
        </div>
      </div>

      {/* Registered Scrapers */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Registered Scraper Interfaces</h2>
        
        <div className="grid gap-4">
          {inferredJobs.map((job) => {
            const isThisJobRunning = runningJobId === job.id;
            const isThisJobDeleting = deletingJobId === job.id;
            const successRate = job.totalCount > 0 ? Math.round((job.successCount / job.totalCount) * 100) : 0;

            return (
              <div 
                key={job.id} 
                className="border rounded-2xl p-5 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-5 border-gray-200 hover:border-gray-400 shadow-sm transition-all group"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-lg font-bold group-hover:text-blue-500 transition-colors text-gray-900">{job.title}</h3>
                    <span className="text-[10px] bg-gray-100 text-gray-900 border border-gray-200 px-2 py-0.5 rounded-md font-mono font-bold">
                      NODE_ID: {job.id}
                    </span>
                    
                    {/* Clickable Active Switch Toggle Button */}
                    <button
                      onClick={() => handleToggleActive(job.id, job.is_active)}
                      className={`text-[10px] border px-2 py-0.5 rounded-md font-bold transition-all flex items-center gap-1 cursor-pointer select-none active:scale-95 duration-100 shadow-sm ${
                        job.is_active 
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                          : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                      }`}
                      title={job.is_active ? "Click to PAUSE this node" : "Click to ACTIVATE this node"}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${job.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      {job.is_active ? 'ACTIVE' : 'PAUSED'}
                    </button>

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
                    <div>Last Query (UTC+2): <span className="font-medium text-gray-500">{job.totalCount > 0 && job.lastRun !== 'never' ? formatToLocalTimezone(job.lastRun).split(' ')[0] : 'never'}</span></div>
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
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 01Dec3.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5 0v8.5a.75.75 0 001.5 0v-8.5zm4.25.75a.75.75 0 00-1.5 0v8.5a.75.75 0 001.5 0v-8.5z" clipRule="evenodd" />
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
        <h2 className="text-xl font-bold text-gray-900">System Activity Telemetry Feed</h2>
        <div className="space-y-3">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-10 border border-dashed border-gray-200 rounded-2xl gap-3 bg-white">
              <img src="/logo.jpg" alt="No data" className="w-8 h-8 opacity-20 grayscale select-none pointer-events-none rounded" />
              <p className="text-xs text-gray-400 italic font-medium">No transaction items found inside history matrices.</p>
            </div>
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
                    <p className="font-bold text-sm text-gray-900">
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
                    <span className="sm:order-1 font-semibold text-gray-600">
                      {formatToLocalTimezone(res.scraped_at)}
                    </span>
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