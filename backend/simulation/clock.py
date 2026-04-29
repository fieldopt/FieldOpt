"""
Simulation clock singleton.

Usage:
    from backend.simulation.clock import clock

    clock.use_real_time()                            # default mode
    clock.start_simulation(virtual_start, speed=200) # start sim
    clock.pause() / clock.resume()
    clock.set_speed(500)
    t = clock.now()                                  # datetime, always tz-aware UTC
"""
import time
from datetime import datetime, timedelta, timezone
from enum import Enum


class ClockMode(str, Enum):
	REAL = "real"
	SIMULATED = "simulated"


class SimulationClock:
	def __init__(self):
		self._mode = ClockMode.REAL
		self._speed: float = 1.0
		self._is_paused: bool = False
		self._virtual_start: datetime | None = None
		self._wall_start: float | None = None        # monotonic seconds when sim started or last resumed
		self._accumulated_virtual: float = 0.0      # simulated seconds accrued before current wall segment

	def now(self) -> datetime:
		if self._mode == ClockMode.REAL:
			return datetime.now(timezone.utc)

		if self._is_paused or self._wall_start is None:
			elapsed_virtual = self._accumulated_virtual
		else:
			elapsed_wall = time.monotonic() - self._wall_start
			elapsed_virtual = self._accumulated_virtual + elapsed_wall * self._speed

		return self._virtual_start + timedelta(seconds=elapsed_virtual)

	def use_real_time(self) -> None:
		self._mode = ClockMode.REAL
		self._is_paused = False
		self._virtual_start = None
		self._wall_start = None
		self._accumulated_virtual = 0.0
		self._speed = 1.0

	def start_simulation(self, virtual_start: datetime, speed: float = 200.0) -> None:
		if virtual_start.tzinfo is None:
			raise ValueError("virtual_start must be timezone-aware")
		if speed <= 0:
			raise ValueError("speed must be > 0")
		self._virtual_start = virtual_start
		self._speed = speed
		self._accumulated_virtual = 0.0
		self._wall_start = time.monotonic()
		self._is_paused = False
		self._mode = ClockMode.SIMULATED

	def pause(self) -> None:
		if self._mode != ClockMode.SIMULATED or self._is_paused:
			return
		elapsed_wall = time.monotonic() - self._wall_start
		self._accumulated_virtual += elapsed_wall * self._speed
		self._wall_start = None
		self._is_paused = True

	def resume(self) -> None:
		if self._mode != ClockMode.SIMULATED or not self._is_paused:
			return
		self._wall_start = time.monotonic()
		self._is_paused = False

	def set_speed(self, new_speed: float) -> None:
		if self._mode != ClockMode.SIMULATED:
			raise RuntimeError("Cannot set speed in real time mode")
		if new_speed <= 0:
			raise ValueError("speed must be > 0")
		if not self._is_paused and self._wall_start is not None:
			elapsed_wall = time.monotonic() - self._wall_start
			self._accumulated_virtual += elapsed_wall * self._speed
			self._wall_start = time.monotonic()
		self._speed = new_speed

	@property
	def mode(self) -> ClockMode:
		return self._mode

	@property
	def speed(self) -> float:
		return self._speed

	@property
	def is_paused(self) -> bool:
		return self._is_paused


clock = SimulationClock()
