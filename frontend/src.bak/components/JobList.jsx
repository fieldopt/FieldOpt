import { Clock, MapPin, AlertCircle } from 'lucide-react';

const statusColors = {
	pending: 'bg-yellow-100 text-yellow-800',
	assigned: 'bg-blue-100 text-blue-800',
	in_progress: 'bg-purple-100 text-purple-800',
	completed: 'bg-green-100 text-green-800',
	cancelled: 'bg-red-100 text-red-800',
	on_hold: 'bg-gray-100 text-gray-800',
};

const priorityColors = {
	1: 'text-red-600 font-bold',
	2: 'text-orange-600 font-semibold',
	3: 'text-yellow-600',
	4: 'text-blue-600',
	5: 'text-gray-600',
};

export default function JobList({ jobs, onJobClick }) {
	return (
		<div className="space-y-2">
			{jobs.length === 0 ? (
				<div className="text-center py-8 text-gray-500">
					<p>No jobs found</p>
				</div>
			) : (
				jobs.map(job => (
					<div
						key={job.id}
						onClick={() => onJobClick && onJobClick(job)}
						className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border-l-4"
						style={{ borderLeftColor: job.priority === 1 ? '#dc2626' : '#3b82f6' }}
					>
						<div className="flex justify-between items-start mb-2">
							<h3 className="font-bold text-lg">{job.customer_name}</h3>
							<span className={`px-2 py-1 rounded text-xs ${statusColors[job.status]}`}>
								{job.status.replace('_', ' ').toUpperCase()}
							</span>
						</div>
						
						<div className="space-y-1 text-sm text-gray-600">
							<div className="flex items-center gap-2">
								<MapPin size={16} />
								<span>{job.service_address}</span>
							</div>
							
							{job.scheduled_date && (
								<div className="flex items-center gap-2">
									<Clock size={16} />
									<span>
										{new Date(job.scheduled_date).toLocaleDateString()}
										{job.time_slot_start && ` ${job.time_slot_start}-${job.time_slot_end}`}
									</span>
								</div>
							)}
							
							<div className="flex items-center gap-2">
								<AlertCircle size={16} />
								<span className={priorityColors[job.priority]}>
									Priority {job.priority} • {job.job_type}
								</span>
							</div>
						</div>
						
						{job.description && (
							<p className="mt-2 text-sm text-gray-500 line-clamp-2">
								{job.description}
							</p>
						)}
						
						{job.required_skills.length > 0 && (
							<div className="mt-2 flex flex-wrap gap-1">
								{job.required_skills.map(skill => (
									<span key={skill} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
										{skill}
									</span>
								))}
							</div>
						)}
					</div>
				))
			)}
		</div>
	);
}
