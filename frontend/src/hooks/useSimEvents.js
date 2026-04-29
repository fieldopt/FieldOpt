import { useEffect, useRef } from 'react';

/**
 * Connects to the simulation WebSocket and calls onEvent for each DispatchEvent.
 * Reconnects automatically with exponential backoff (max 30s).
 * No-ops when onEvent is null/undefined.
 */
export function useSimEvents(onEvent) {
	const onEventRef = useRef(onEvent);
	useEffect(() => { onEventRef.current = onEvent; }, [onEvent]);

	useEffect(() => {
		let ws = null;
		let attempt = 0;
		let stopped = false;

		const connect = () => {
			if (stopped) return;
			const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
			ws = new WebSocket(`${proto}//${location.host}/api/v1/simulation/ws`);

			ws.onopen = () => { attempt = 0; };

			ws.onmessage = (e) => {
				try {
					const events = JSON.parse(e.data);
					if (Array.isArray(events) && onEventRef.current) {
						events.forEach(onEventRef.current);
					}
				} catch { /* ignore malformed */ }
			};

			ws.onclose = () => {
				if (!stopped) {
					const delay = Math.min(1000 * 2 ** attempt++, 30000);
					setTimeout(connect, delay);
				}
			};
		};

		connect();
		return () => {
			stopped = true;
			ws?.close();
		};
	}, []); // stable — reconnect logic handles server restarts
}
