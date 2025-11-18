"""
Distance Calculation Logic
Calculate distances between coordinates for routing
"""
import math
from typing import Tuple


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
	"""
	Calculate distance between two coordinates using Haversine formula
	Returns distance in miles
	
	Args:
		lat1, lon1: First coordinate
		lat2, lon2: Second coordinate
	
	Returns:
		Distance in miles
	"""
	# Earth radius in miles
	R = 3959.0
	
	# Convert to radians
	lat1_rad = math.radians(lat1)
	lat2_rad = math.radians(lat2)
	delta_lat = math.radians(lat2 - lat1)
	delta_lon = math.radians(lon2 - lon1)
	
	# Haversine formula
	a = (math.sin(delta_lat / 2) ** 2 +
		 math.cos(lat1_rad) * math.cos(lat2_rad) *
		 math.sin(delta_lon / 2) ** 2)
	c = 2 * math.asin(math.sqrt(a))
	
	distance = R * c
	return distance


def calculate_travel_time(distance_miles: float, speed_mph: float = 30.0) -> int:
	"""
	Calculate travel time based on distance and speed
	
	Args:
		distance_miles: Distance in miles
		speed_mph: Average speed in mph (default 30)
	
	Returns:
		Travel time in minutes
	"""
	hours = distance_miles / speed_mph
	minutes = int(hours * 60)
	return minutes


def get_closest_location(
	from_lat: float,
	from_lon: float,
	locations: list[Tuple[float, float]]
) -> Tuple[int, float]:
	"""
	Find the closest location from a list
	
	Args:
		from_lat, from_lon: Starting coordinate
		locations: List of (lat, lon) tuples
	
	Returns:
		Tuple of (index, distance) for closest location
	"""
	if not locations:
		return -1, 0.0
	
	min_distance = float('inf')
	min_index = -1
	
	for i, (lat, lon) in enumerate(locations):
		distance = haversine_distance(from_lat, from_lon, lat, lon)
		if distance < min_distance:
			min_distance = distance
			min_index = i
	
	return min_index, min_distance
