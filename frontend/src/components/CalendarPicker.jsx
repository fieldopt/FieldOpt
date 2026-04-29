import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
	'July', 'August', 'September', 'October', 'November', 'December'];

function sameDay(a, b) {
	return a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate();
}

export default function CalendarPicker({ value, onChange, onClose, anchorRef }) {
	const [cursor, setCursor] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));
	const ref = useRef(null);
	const today = new Date();

	// Position below the anchor element
	const [pos, setPos] = useState({ top: 0, left: 0 });
	useEffect(() => {
		if (anchorRef?.current) {
			const r = anchorRef.current.getBoundingClientRect();
			setPos({ top: r.bottom + 6, left: r.left + r.width / 2 });
		}
	}, [anchorRef]);

	// Close on outside click
	useEffect(() => {
		const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
		document.addEventListener('mousedown', handler);
		return () => document.removeEventListener('mousedown', handler);
	}, [onClose]);

	const prevMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
	const nextMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));

	// Build grid: leading blanks + days of month
	const firstDow = cursor.getDay();
	const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
	const cells = [];
	for (let i = 0; i < firstDow; i++) cells.push(null);
	for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));

	return createPortal(
		<div ref={ref} className="cal-picker" style={{ position: 'fixed', top: pos.top, left: pos.left, transform: 'translateX(-50%)' }}>
			<div className="cal-header">
				<button className="cal-nav" onClick={prevMonth}>◂</button>
				<span className="cal-month-label">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</span>
				<button className="cal-nav" onClick={nextMonth}>▸</button>
			</div>
			<div className="cal-grid">
				{DAYS.map((d) => <span key={d} className="cal-dow">{d}</span>)}
				{cells.map((d, i) => {
					if (!d) return <span key={`blank-${i}`} />;
					const isSelected = sameDay(d, value);
					const isToday = sameDay(d, today);
					return (
						<button
							key={d.getDate()}
							className={`cal-day${isSelected ? ' cal-day--selected' : ''}${isToday ? ' cal-day--today' : ''}`}
							onClick={() => { onChange(d); onClose(); }}
						>
							{d.getDate()}
						</button>
					);
				})}
			</div>
			<div className="cal-footer">
				<button className="cal-today-btn" onClick={() => { onChange(new Date()); onClose(); }}>Today</button>
			</div>
		</div>,
		document.body
	);
}
