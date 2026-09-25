import {
  getPredictionBreakdown,
  getPredictionHistoryWithUsers,
  getPredictionOverview,
  getDailyPredictionTrend
} from '../models/PredictionHistory.js';
import { getRecentUsers, getUserCountsByRole } from '../models/User.js';

function normalizePredictionLabel(prediction) {
  const value = String(prediction || '').toLowerCase();
  if (value.includes('healthy')) return 'healthy';
  if (value.includes('moderate')) return 'moderate';
  if (value.includes('stress') || value.includes('poor') || value.includes('unhealthy')) {
    return 'risk';
  }
  return 'other';
}

function buildTeamSummaries(recentActivity) {
  const grouped = new Map();

  recentActivity.forEach((item) => {
    const key = item.role || 'user';
    const current = grouped.get(key) || {
      team: key === 'admin' ? 'Admin operators' : 'User analysts',
      status: 'Stable',
      scans: 0,
      totalConfidence: 0,
      lastIssue: 'No blockers'
    };

    current.scans += 1;
    current.totalConfidence += Number(item.confidence || 0);

    const predictionType = normalizePredictionLabel(item.prediction);
    if (predictionType === 'risk') {
      current.status = 'Attention';
      current.lastIssue = item.prediction;
    } else if (predictionType === 'moderate' && current.status !== 'Attention') {
      current.status = 'Watch';
      current.lastIssue = item.prediction;
    }

    grouped.set(key, current);
  });

  return Array.from(grouped.values()).map((item) => ({
    ...item,
    avgConfidence: item.scans ? item.totalConfidence / item.scans : 0
  }));
}

export async function getAdminOverview(req, res, next) {
  try {
    const [overview, breakdown, trend, recentActivity, userCounts, recentUsers] = await Promise.all([
      getPredictionOverview(),
      getPredictionBreakdown(),
      getDailyPredictionTrend(7),
      getPredictionHistoryWithUsers(8),
      getUserCountsByRole(),
      getRecentUsers(6)
    ]);

    const roleCounts = userCounts.reduce(
      (acc, item) => ({ ...acc, [item.role]: item.count }),
      { admin: 0, user: 0 }
    );

    const riskDistribution = breakdown.reduce(
      (acc, item) => {
        const bucket = normalizePredictionLabel(item.prediction);
        acc[bucket] = (acc[bucket] || 0) + Number(item.count || 0);
        return acc;
      },
      { healthy: 0, moderate: 0, risk: 0, other: 0 }
    );

    const summary = {
      totalUsers: roleCounts.admin + roleCounts.user,
      adminUsers: roleCounts.admin,
      userAccounts: roleCounts.user,
      totalPredictions: overview.total_predictions || 0,
      avgConfidence: overview.avg_confidence || 0,
      predictionsLast7Days: overview.predictions_last_7_days || 0,
      predictionsLast24Hours: overview.predictions_last_24_hours || 0,
      activeUsers: overview.active_users || 0,
      latestPredictionAt: overview.latest_prediction_at || null
    };

    res.json({
      summary,
      trend: trend.map((item) => ({
        label: item.label,
        total: Number(item.total || 0),
        avgConfidence: Number(item.avg_confidence || 0)
      })),
      riskDistribution,
      predictionBreakdown: breakdown.map((item) => ({
        prediction: item.prediction,
        count: Number(item.count || 0),
        avgConfidence: Number(item.avg_confidence || 0)
      })),
      recentActivity: recentActivity.map((item) => ({
        id: item.id,
        prediction: item.prediction,
        confidence: Number(item.confidence || 0),
        createdAt: item.created_at,
        user: {
          id: item.user_id,
          name: item.name,
          email: item.email,
          role: item.role
        },
        imageUrl: `/${item.image_path.replace(/^[.\\/]+/, '')}`
      })),
      teamSummaries: buildTeamSummaries(recentActivity),
      recentUsers
    });
  } catch (err) {
    next(err);
  }
}
