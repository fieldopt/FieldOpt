import FloatingWindow from './FloatingWindow';

/**
 * JobDetailPanel — displays full job information.
 * Opened by double-clicking a job in the main grid or job search.
 *
 * Props:
 *   job     — the full job object
 *   onClose — close handler
 */
export default function JobDetailPanel({ job, onClose }) {
	if (!job) return null;

	const fmtDt = (iso) => {
		if (!iso) return '—';
		const d = new Date(iso);
		return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
	};

	return (
		<FloatingWindow
			title={`Job #${job.job_number || job.id} — ${job.customer_name}`}
			onClose={onClose}
			defaultPos={{ x: 240, y: 120 }}
			defaultSize={{ w: 440, h: 480 }}
			minSize={{ w: 340, h: 300 }}
			className="fw-job-detail"
			zIndex={1700}
		>
			<div className="jd-content">
				{/* Status + Type header */}
				<div className="jd-header-row">
					<span className={`status-badge status-badge--${job.status}`}>
						{job.status.replace(/_/g, ' ')}
					</span>
					<span className="jd-type">{job.job_type?.replace(/_/g, ' ')}</span>
					<span className="jd-priority">Pri {job.priority}</span>
				</div>

				{/* Customer */}
				<div className="jd-section">
					<div className="jd-section-title">Customer</div>
					<div className="jd-field"><span className="jd-label">Name</span><span className="jd-value">{job.customer_name}</span></div>
					{job.customer_phone && <div className="jd-field"><span className="jd-label">Phone</span><span className="jd-value">{job.customer_phone}</span></div>}
					{job.customer_email && <div className="jd-field"><span className="jd-label">Email</span><span className="jd-value">{job.customer_email}</span></div>}
				</div>

				{/* Location */}
				<div className="jd-section">
					<div className="jd-section-title">Service Location</div>
					<div className="jd-field"><span className="jd-label">Address</span><span className="jd-value">{job.service_address}</span></div>
					<div className="jd-field">
						<span className="jd-label">City / Zip</span>
						<span className="jd-value">{[job.service_city, job.service_zip].filter(Boolean).join(' ') || '—'}</span>
					</div>
					<div className="jd-field"><span className="jd-label">Route</span><span className="jd-value jd-mono">{job.route_criteria || '—'}</span></div>
					<div className="jd-field">
						<span className="jd-label">Lat / Lon</span>
						<span className="jd-value jd-mono">{job.latitude?.toFixed(4)}, {job.longitude?.toFixed(4)}</span>
					</div>
				</div>

				{/* Schedule */}
				<div className="jd-section">
					<div className="jd-section-title">Schedule</div>
					<div className="jd-field"><span className="jd-label">Date</span><span className="jd-value">{fmtDt(job.scheduled_date)?.split(' ')[0]}</span></div>
					<div className="jd-field">
						<span className="jd-label">Time Slot</span>
						<span className="jd-value jd-mono">
							{job.time_slot_start && job.time_slot_end ? `${job.time_slot_start}–${job.time_slot_end}` : '—'}
						</span>
					</div>
					<div className="jd-field"><span className="jd-label">Duration</span><span className="jd-value">{job.estimated_duration} min</span></div>
				</div>

				{/* Assignment */}
				<div className="jd-section">
					<div className="jd-section-title">Assignment</div>
					<div className="jd-field">
						<span className="jd-label">Tech</span>
						<span className="jd-value">{job.assigned_tech_name || 'Unassigned'}</span>
					</div>
				</div>

				{/* Skills */}
				<div className="jd-section">
					<div className="jd-section-title">Required Skills</div>
					<div className="jd-skills">
						{job.required_skills?.length > 0
							? job.required_skills.map((s) => <span key={s} className="skill-chip">{s}</span>)
							: <span className="jd-muted">None</span>
						}
					</div>
				</div>

				{/* Description / Notes */}
				{job.description && (
					<div className="jd-section">
						<div className="jd-section-title">Description</div>
						<div className="jd-text">{job.description}</div>
					</div>
				)}
				{job.special_instructions && (
					<div className="jd-section">
						<div className="jd-section-title">Special Instructions</div>
						<div className="jd-text jd-text--warning">{job.special_instructions}</div>
					</div>
				)}
				{job.notes && (
					<div className="jd-section">
						<div className="jd-section-title">Notes</div>
						<div className="jd-text">{job.notes}</div>
					</div>
				)}

				{/* Timestamps */}
				<div className="jd-section jd-timestamps">
					<div className="jd-field"><span className="jd-label">Created</span><span className="jd-value jd-mono">{fmtDt(job.created_at)}</span></div>
					{job.started_at && <div className="jd-field"><span className="jd-label">Started</span><span className="jd-value jd-mono">{fmtDt(job.started_at)}</span></div>}
					{job.completed_at && <div className="jd-field"><span className="jd-label">Completed</span><span className="jd-value jd-mono">{fmtDt(job.completed_at)}</span></div>}
				</div>
			</div>
		</FloatingWindow>
	);
}
