import request from '../../../config/request';

const BASE = '/events';

export const recommendEvents = async (opts = {}) => {
  const params = new URLSearchParams();
  if (opts.userId) params.append('userId', opts.userId);
  if (opts.limit) params.append('limit', opts.limit);
  const res = await request.get(`${BASE}/recommend?${params.toString()}`);
  return res.data;
};

export const checkInEvent = async (eventId, body) => {
  const res = await request.post(`${BASE}/${eventId}/checkin`, body);
  return res.data;
};

export default { recommendEvents, checkInEvent };
