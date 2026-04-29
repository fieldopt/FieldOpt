"""
WebSocket connection manager and broadcast helper.

ConnectionManager tracks active WebSocket connections and fans out
DispatchEvents to all of them as JSON.

Usage (in the tick loop):
    from backend.simulation.broadcaster import manager
    dispatch_loop.start(strategy, on_events=manager.broadcast_events)
"""
from __future__ import annotations

import dataclasses
import logging
from datetime import datetime

from fastapi import WebSocket

from backend.simulation.strategy import DispatchEvent

logger = logging.getLogger(__name__)


def _serialize_event(event: DispatchEvent) -> dict:
    d = dataclasses.asdict(event)
    # datetime → ISO string for JSON transport
    for k, v in d.items():
        if isinstance(v, datetime):
            d[k] = v.isoformat()
    return d


class ConnectionManager:
    def __init__(self) -> None:
        self._connections: set[WebSocket] = set()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._connections.add(ws)
        logger.debug("WS client connected (%d total)", len(self._connections))

    def disconnect(self, ws: WebSocket) -> None:
        self._connections.discard(ws)
        logger.debug("WS client disconnected (%d remaining)", len(self._connections))

    async def broadcast_events(self, events: list[DispatchEvent]) -> None:
        if not self._connections or not events:
            return
        payload = [_serialize_event(e) for e in events]
        dead: set[WebSocket] = set()
        for ws in self._connections:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.add(ws)
        self._connections -= dead

    @property
    def connection_count(self) -> int:
        return len(self._connections)


manager = ConnectionManager()
