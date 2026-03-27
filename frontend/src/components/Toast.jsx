import { useEffect, useState } from 'react';

export default function Toast({ message, type = 'info' }) {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		// Trigger enter animation
		requestAnimationFrame(() => setVisible(true));
		const timer = setTimeout(() => setVisible(false), 2600);
		return () => clearTimeout(timer);
	}, []);

	return (
		<div className={`toast toast--${type}${visible ? ' toast--visible' : ''}`}>
			<span className="toast-icon">
				{type === 'success' && '✓'}
				{type === 'error' && '✕'}
				{type === 'warning' && '!'}
				{type === 'info' && 'i'}
			</span>
			{message}
		</div>
	);
}
