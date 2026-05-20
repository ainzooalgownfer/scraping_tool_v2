'use client';

import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { createJob } from '@/lib/api';

type FormData = {
  name: string;
  url: string;
  schedule_random_start: string;
  schedule_random_end: string;
  is_active: boolean;
};

export default function NewJobPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    defaultValues: {
      schedule_random_start: '08:00',
      schedule_random_end: '11:00',
      is_active: true,
    },
  });
  const router = useRouter();

  const onSubmit = async (data: FormData) => {
    try {
      const structuralPayload = {
        ...data,
        name: data.name.trim(),
        url: data.url.trim(),
      };
      
      await createJob(structuralPayload);
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error("Job compilation process intercepted an API exception:", err);
      alert('Failed to register configuration profile. Forcing workspace dashboard redirect.');
      router.push('/');
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white shadow-md border border-gray-100 rounded-xl mt-12 mb-12">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create New Scraping Job</h1>
        <p className="text-sm mt-1 text-gray-400">
          Configure a targeted web scraper configuration profile and establish its automation framework window.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Job Name Input */}
        <div>
          <label className="block text-sm font-semibold mb-1">Job Name</label>
          <input
            {...register('name', { required: 'Provide a descriptive name for your scraping objective' })}
            className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-shadow bg-white"
            placeholder="e.g., Target Quotes Scraping Core"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.name.message}</p>}
        </div>

        {/* URL Target Input */}
        <div>
          <label className="block text-sm font-semibold mb-1">Target Website URL</label>
          <input
            {...register('url', { 
              required: 'A destination endpoint link is required',
              pattern: {
                value: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/,
                message: 'Please enter a valid target link framework (e.g., https://example.com)'
              }
            })}
            type="text"
            className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-shadow bg-white"
            placeholder="https://quotes.toscrape.com"
          />
          {errors.url && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.url.message}</p>}
        </div>

        {/* Schedule Time Windows Block */}
        <div className="bg-gray-55 p-4 rounded-xl border border-gray-200/60">
          <h3 className="text-sm font-semibold mb-1">Execution Window Configuration</h3>
          <p className="text-xs text-gray-400 mb-4">
            The automated agent will launch its routine asynchronously at a randomized interval within this tracking zone to emulate natural user traffic behaviors.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-400">Earliest Execution Start</label>
              <input
                {...register('schedule_random_start', { required: 'Select a window origin coordinate time' })}
                type="time"
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-shadow bg-white"
              />
              {errors.schedule_random_start && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.schedule_random_start.message}</p>}
            </div>
            
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-400">Latest Execution Cap</label>
              <input
                {...register('schedule_random_end', { required: 'Select a window termination time limit' })}
                type="time"
                className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-shadow bg-white"
              />
              {errors.schedule_random_end && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.schedule_random_end.message}</p>}
            </div>
          </div>
        </div>

        {/* Active Toggle Option Field */}
        <div className="flex items-start gap-3 px-1">
          <input 
            type="checkbox" 
            id="is_active" 
            {...register('is_active')} 
            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer bg-white" 
          />
          <div className="flex flex-col">
            <label htmlFor="is_active" className="text-sm font-semibold select-none cursor-pointer">
              Enable Automation Schedule
            </label>
            <p className="text-xs text-gray-400">
              When checked, this configuration item actively participates within the system cron worker daemon loop.
            </p>
          </div>
        </div>

        {/* Action Controls Footer */}
        <div className="flex items-center justify-end gap-3 pt-5 border-t border-gray-100">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="px-5 py-2 border border-gray-300 text-gray-400 hover:text-gray-900 font-medium rounded-lg text-sm hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200 bg-transparent"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving Profile...
              </>
            ) : (
              'Create Job Profile'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}