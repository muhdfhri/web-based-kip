import express from 'express';
import http from 'http';

const router = express.Router();

/**
 * GET /api/security/logsheet/event-logs
 * Fetch event logs from AI Security microservice (:4101)
 */
router.get('/event-logs', async (req, res) => {
  const { station, stationSlug, category, page = 1, limit = 11, startDate, endDate } = req.query;
  const targetStation = stationSlug || station || req.params.station || 'all-stations';

  try {
    const { aiLogs, pagination } = await new Promise((resolve) => {
      let path = targetStation && targetStation !== 'all-stations'
        ? `/api/security-ai/analytics/detection-logs?station_slug=${encodeURIComponent(targetStation)}&page=${page}&limit=${limit}`
        : `/api/security-ai/analytics/detection-logs?page=${page}&limit=${limit}`;

      if (category && category !== 'ALL') path += `&category=${encodeURIComponent(category)}`;
      if (startDate) path += `&start_date=${encodeURIComponent(startDate)}`;
      if (endDate) path += `&end_date=${encodeURIComponent(endDate)}`;

      const reqAi = http.request({
        hostname: '127.0.0.1',
        port: 4101,
        path,
        method: 'GET'
      }, (resAi) => {
        let body = '';
        resAi.on('data', chunk => body += chunk);
        resAi.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve({
              aiLogs: parsed.data || [],
              pagination: parsed.pagination || { total: (parsed.data || []).length, page: parseInt(page, 10), totalPages: 1 }
            });
          } catch {
            resolve({ aiLogs: [], pagination: { total: 0, page: parseInt(page, 10), totalPages: 1 } });
          }
        });
      });

      reqAi.on('error', (err) => {
        console.warn('[Logsheet Gateway] Warning: Could not fetch logs from Security AI (:4101):', err.message);
        resolve({ aiLogs: [], pagination: { total: 0, page: parseInt(page, 10), totalPages: 1 } });
      });

      reqAi.end();
    });

    const formattedLogs = aiLogs.map(item => ({
      id: `ai_${item.id}`,
      timestamp: item.detected_at,
      station: (item.station_slug || 'SECURITY').toUpperCase(),
      station_slug: item.station_slug,
      category: item.category || 'AI',
      camera_code: item.camera_code,
      camera_name: item.camera_name || item.camera_code,
      tag_name: item.camera_name || item.camera_code,
      old_value: '---',
      new_value: item.detection_detail || 'DETECTION_EVENT',
      plate_no: item.plate_no || null,
      detection_detail: item.detection_detail,
      confidence_score: item.confidence_score ? `${Math.round(item.confidence_score * 100)}%` : '---',
      severity: 'WARNING',
      source: item.camera_code,
      snapshot_path: item.snapshot_path,
      image_url: item.snapshot_path ? `http://localhost:4101${item.snapshot_path}` : null,
      shift: 'SHIFT_1'
    }));

    res.json({
      success: true,
      data: formattedLogs,
      pagination: pagination || {
        total: formattedLogs.length,
        page: parseInt(page, 10),
        totalPages: Math.ceil(formattedLogs.length / limit) || 1
      }
    });
  } catch (error) {
    console.error('[Logsheet Gateway] Error fetching event logs:', error);
    res.status(500).json({ success: false, message: 'Gagal mengambil data logsheet' });
  }
});

export default router;
