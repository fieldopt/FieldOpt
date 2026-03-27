import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const apiClient = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		'Content-Type': 'application/json',
	},
});

export const api = {
	getTechnicians: () => apiClient.get('/technicians/'),
	getTechnician: (id) => apiClient.get(`/technicians/${id}`),
	createTechnician: (data) => apiClient.post('/technicians/', data),
	updateTechLocation: (id, data) => apiClient.patch(`/technicians/${id}/location`, data),
	
	getJobs: () => apiClient.get('/jobs/'),
	getJob: (id) => apiClient.get(`/jobs/${id}`),
	createJob: (data) => apiClient.post('/jobs/', data),
	updateJobStatus: (id, status) => apiClient.patch(`/jobs/${id}/status`, { status }),
	getJobsSummary: () => apiClient.get('/jobs/summary'),
	
	createAssignment: (data) => apiClient.post('/assignments/', data),
	getJobAssignment: (jobId) => apiClient.get(`/assignments/job/${jobId}`),
	
	autoRoute: (data = {}) => apiClient.post('/routing/auto-route', data),
	getBestTech: (jobId) => apiClient.get(`/routing/best-tech/${jobId}`),
};

export default api;
