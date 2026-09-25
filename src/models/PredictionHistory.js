import { query } from '../config/db.js';

export async function createPredictionHistory({ userId, imagePath, prediction, confidence }) {
  const result = await query(
    `INSERT INTO prediction_history (user_id, image_path, prediction, confidence)
     VALUES ($1, $2, $3, $4)
     RETURNING id, user_id, image_path, prediction, confidence, created_at`,
    [userId, imagePath, prediction, confidence]
  );
  return result.rows[0];
}

export async function getPredictionHistoryByUser(userId) {
  const result = await query(
    `SELECT id, image_path, prediction, confidence, created_at
     FROM prediction_history
     WHERE user_id = $1
     ORDER BY created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function getPredictionHistoryWithUsers(limit = 8) {
  const result = await query(
    `SELECT ph.id, ph.image_path, ph.prediction, ph.confidence, ph.created_at,
            u.id AS user_id, u.name, u.email, u.role
     FROM prediction_history ph
     INNER JOIN users u ON u.id = ph.user_id
     ORDER BY ph.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function getPredictionOverview() {
  const result = await query(
    `SELECT
       COUNT(*)::int AS total_predictions,
       COALESCE(AVG(confidence), 0)::float8 AS avg_confidence,
       COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS predictions_last_7_days,
       COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS predictions_last_24_hours,
       COUNT(DISTINCT user_id)::int AS active_users,
       MAX(created_at) AS latest_prediction_at
     FROM prediction_history`
  );
  return result.rows[0];
}

export async function getPredictionBreakdown() {
  const result = await query(
    `SELECT prediction, COUNT(*)::int AS count, COALESCE(AVG(confidence), 0)::float8 AS avg_confidence
     FROM prediction_history
     GROUP BY prediction
     ORDER BY count DESC, prediction ASC`
  );
  return result.rows;
}

export async function getDailyPredictionTrend(days = 7) {
  const result = await query(
    `SELECT
       TO_CHAR(day_bucket, 'Mon DD') AS label,
       COALESCE(activity.total, 0)::int AS total,
       COALESCE(activity.avg_confidence, 0)::float8 AS avg_confidence
     FROM generate_series(
       date_trunc('day', NOW()) - (($1::int - 1) * INTERVAL '1 day'),
       date_trunc('day', NOW()),
       INTERVAL '1 day'
     ) AS day_bucket
     LEFT JOIN (
       SELECT
         date_trunc('day', created_at) AS created_day,
         COUNT(*) AS total,
         AVG(confidence) AS avg_confidence
       FROM prediction_history
       WHERE created_at >= date_trunc('day', NOW()) - (($1::int - 1) * INTERVAL '1 day')
       GROUP BY created_day
     ) AS activity
       ON activity.created_day = day_bucket
     ORDER BY day_bucket ASC`,
    [days]
  );
  return result.rows;
}

