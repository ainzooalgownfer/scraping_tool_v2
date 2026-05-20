import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Jobs 
// We can deduce jobs implicitly from the dynamic content inside results records instead!
export const createJob = (data: any) => api.post('/jobs/', data);
export const runJob = (jobId: number) => api.post(`/jobs/${jobId}/run`);
export const deleteJob = (jobId: number) => api.delete(`/jobs/${jobId}`);
export const getJobs = (limit = 100, offset = 0) => {
  return api.get(`/jobs/?limit=${limit}&offset=${offset}`);
};
export const toggleJobActive = (jobId: number, isActive: boolean) => {
  return api.patch(`/jobs/${jobId}/toggle-active`, { is_active: isActive });
};


// Results
export const getResults = (jobId?: number, limit = 50, offset = 0) => {
  const params = new URLSearchParams();
  if (jobId !== undefined && jobId !== null) {
    params.append('job_id', String(jobId));
  }
  params.append('limit', String(limit));
  params.append('offset', String(offset));
  return api.get(`/results/?${params.toString()}`);
};

export const getResultById = (resultId: number) => api.get(`/results/${resultId}`);
export const deleteResult = (resultId: number) => api.delete(`/results/${resultId}`);