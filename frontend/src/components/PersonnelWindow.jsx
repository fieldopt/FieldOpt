import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import FloatingWindow from './FloatingWindow';

/**
 * PersonnelWindow — WFX-style staff list.
 * Shows ALL techs (including off-shift), searchable by name/ID.
 *
 * Props:
 *   technicians    — full tech array from API
 *   onLocateTech   — callback(techId) to scroll main grid to this tech and select
 *   onContextMenu  — callback(event, tech) to show tech context menu
 *   onTechDetail   — callback(tech) to open tech info panel
 *   onClose        — close handler
 */
export default function PersonnelWindow({ technicians, onLocateTech, onContextMenu, onTechDetail, onClose }) {
	const [search, setSearch] = useState('');
	const inputRef = useRef(null);

	// Focus input after a delay so the P keystroke doesn't land in the input
	useEffect(() => {
		const t = setTimeout(() => inputRef.current?.focus(), 80);
		return () => clearTimeout(t);
	}, []);

	const filtered = useMemo(() => {
		if (!search.trim()) return technicians;
		const q = search.toLowerCase().trim();
		return technicians.filter((t) =>
			t.name.toLowerCase().includes(q) ||
			(t.employee_id && t.employee_id.toLowerCase().includes(q)) ||
			String(t.id).includes(q)
		);
	}, [technicians, search]);

	const handleLocate = useCallback((techId) => {
		onLocateTech?.(techId);
	}, [onLocateTech]);

	const handleRightClick = useCallback((e, tech) => {
		e.preventDefault();
		onContextMenu?.(e, tech);
	}, [onContextMenu]);

	const handleDoubleClick = useCallback((tech) => {
		onTechDetail?.(tech);
	}, [onTechDetail]);

	return (
		<FloatingWindow
			title={`Personnel — ${technicians.length} total`}
			onClose={onClose}
			defaultPos={{ x: 200, y: 60 }}
			defaultSize={{ w: 520, h: 460 }}
			minSize={{ w: 380, h: 280 }}
			className="fw-personnel"
		>
			{/* Search bar */}
			<div className="personnel-search">
				<input
					type="text"
					className="personnel-input"
					placeholder="Search by name or ID..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					ref={inputRef}
				/>
				{search && (
					<button className="personnel-clear" onClick={() => setSearch('')}>✕</button>
				)}
				<span className="personnel-count">{filtered.length} / {technicians.length}</span>
			</div>

			{/* Column headers */}
			<div className="personnel-header">
				<span className="personnel-id">ID</span>
				<span className="personnel-name">Name</span>
				<span className="personnel-status-col">Status</span>
				<span className="personnel-routes">Routes</span>
				<span className="personnel-skills">Skills</span>
				<span style={{ width: '24px' }} />
			</div>

			{/* Tech list */}
			<div className="personnel-list">
				{filtered.map((tech) => (
					<div
						key={tech.id}
						className="personnel-row"
						onContextMenu={(e) => handleRightClick(e, tech)}
						onDoubleClick={() => handleDoubleClick(tech)}
					>
						<span className="personnel-id">{tech.employee_id || tech.id}</span>
						<span className="personnel-name">{tech.name}</span>
						<span className="personnel-status-col">
							<span className={`status-badge status-badge--${tech.status}`}>
								{tech.status.replace(/_/g, ' ')}
							</span>
						</span>
						<span className="personnel-routes">
							{tech.assigned_routes?.join(', ') || '—'}
						</span>
						<span className="personnel-skills">
							{tech.skills?.join(', ') || '—'}
						</span>
						<button
							className="personnel-locate"
							onClick={() => handleLocate(tech.id)}
							title="Locate in grid"
						>
							⊕
						</button>
					</div>
				))}
				{filtered.length === 0 && (
					<div className="personnel-empty">
						{search ? `No techs matching "${search}"` : 'No technicians loaded'}
					</div>
				)}
			</div>
		</FloatingWindow>
	);
}
