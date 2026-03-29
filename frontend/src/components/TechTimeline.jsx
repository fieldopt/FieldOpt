import { useMemo } from 'react';

const HOURS = Array.from({ length: 13 }, (_, i) => i + 6); // 6 AM to 6 PM
const HOUR_WIDTH = 80;
const JOB_HEIGHT = 24;
const JOB_GAP = 2;
const ROW_PADDING = 6;

function parseTime(timeStr) {
	if (!timeStr) return null;
	const [h, m] = timeStr.split(':').map(Number);
	return h + m / 60;
}

function fmtSlot(start, end) {
	if (!start || !end) return '';
	return `${start}–${end}`;
}

const STATUS_COLORS = {
	pending: 'var(--color-warning)',
	assigned: 'var(--color-info)',
	in_progress: 'var(--color-purple)',
	completed: 'var(--color-success)',
	cancelled: 'var(--color-danger)',
	on_hold: 'var(--color-on-hold)',
};

// Assign vertical lanes to overlapping jobs
function assignLanes(jobs) {
	const sorted = [...jobs].sort((a, b) => a.startHour - b.startHour);
	const lanes = []; // each lane is the endHour of the last job in that lane

	return sorted.map((job) => {
		const endHour = job.startHour + job.durationHours;
		// Find first lane where this job doesn't overlap
		let lane = lanes.findIndex((laneEnd) => job.startHour >= laneEnd);
		if (lane === -1) {
			lane = lanes.length;
			lanes.push(endHour);
		} else {
			lanes[lane] = endHour;
		}
		return { ...job, lane, totalLanes: 0 }; // totalLanes set after
	}).map((job) => ({ ...job, totalLanes: lanes.length }));
}

export default function TechTimeline({ technicians, jobs }) {
	const timelineData = useMemo(() => {
		return technicians.map((tech) => {
			const techJobs = jobs
				.filter((j) => j.assigned_tech_id === tech.id)
				.map((job) => {
					const start = parseTime(job.time_slot_start);
					const duration = job.estimated_duration / 60;
					return {
						...job,
						startHour: start ?? 8,
						durationHours: duration,
					};
				});

			const lanedJobs = assignLanes(techJobs);
			const maxLanes = lanedJobs.length > 0 ? Math.max(...lanedJobs.map((j) => j.totalLanes)) : 1;
			const rowHeight = ROW_PADDING * 2 + maxLanes * (JOB_HEIGHT + JOB_GAP);

			return {
				tech,
				jobs: lanedJobs,
				maxLanes,
				rowHeight: Math.max(rowHeight, 36),
				shiftStart: parseTime(tech.shift_start) ?? 8,
				shiftEnd: parseTime(tech.shift_end) ?? 17,
			};
		});
	}, [technicians, jobs]);

	const totalWidth = HOURS.length * HOUR_WIDTH;

	if (technicians.length === 0) {
		return (
			<div className="timeline-empty">
				Select a technician to view their timeline
			</div>
		);
	}

	return (
		<div className="timeline-container">
			{/* Hour headers */}
			<div className="timeline-header" style={{ width: totalWidth + 140 }}>
				<div className="timeline-label-col">Tech</div>
				{HOURS.map((hour) => (
					<div key={hour} className="timeline-hour-header" style={{ width: HOUR_WIDTH }}>
						{hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
					</div>
				))}
			</div>

			{/* Tech rows */}
			<div className="timeline-body" style={{ width: totalWidth + 140 }}>
				{timelineData.map(({ tech, jobs: techJobs, rowHeight, shiftStart, shiftEnd }) => (
					<div key={tech.id} className="timeline-row" style={{ height: rowHeight }}>
						<div className="timeline-label-col timeline-tech-name">
							{tech.name}
						</div>

						<div className="timeline-track" style={{ width: totalWidth }}>
							{HOURS.map((hour) => (
								<div key={hour} className="timeline-gridline" style={{ left: (hour - HOURS[0]) * HOUR_WIDTH, height: rowHeight }} />
							))}

							{/* Shift background */}
							<div
								className="timeline-shift"
								style={{
									left: (shiftStart - HOURS[0]) * HOUR_WIDTH,
									width: (shiftEnd - shiftStart) * HOUR_WIDTH,
									height: rowHeight - 4,
									top: 2,
								}}
							/>

							{/* Job blocks — stacked by lane */}
							{techJobs.map((job) => (
								<div
									key={job.id}
									className="timeline-job"
									title={`${job.customer_name}\n${job.job_type} — ${job.status}\n${fmtSlot(job.time_slot_start, job.time_slot_end)} (${job.estimated_duration}m)`}
									style={{
										left: (job.startHour - HOURS[0]) * HOUR_WIDTH,
										width: Math.max(job.durationHours * HOUR_WIDTH, 30),
										height: JOB_HEIGHT,
										top: ROW_PADDING + job.lane * (JOB_HEIGHT + JOB_GAP),
										backgroundColor: STATUS_COLORS[job.status] || 'var(--text-muted)',
									}}
								>
									<span className="timeline-job-label">
										{job.customer_name?.split(' ')[0]}
									</span>
									<span className="timeline-job-slot">
										{fmtSlot(job.time_slot_start, job.time_slot_end)}
									</span>
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
