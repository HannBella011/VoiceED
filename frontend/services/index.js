// Services Barrel Export - VoiceED
// Re-export all service modules

export { authService } from './auth';
export {
  reportsService,
  submitReportAuthenticated,
  submitReportAnonymous,
  submitReportGuest,
  trackReport,
  getMyReports,
  getReport,
  getAdminStats,
  adminListReports,
  adminGetReport,
  adminUpdateReportStatus,
  adminAssignReport,
  adminRejectReport,
  adminUpdateReport,
  adminAddTimelineEntry,
  getAvailableAssignees,
  adminListUsers,
  adminGetUser,
  adminUpdateUser,
  adminDeleteUser,
  uploadAttachments,
  deleteAttachment,
} from './reports';
export { wellnessService } from './wellness';
export { inspireService } from './inspire';
export { shareService } from './share';
export { usersService } from './users';

// Re-export the main API client for backward compatibility
export { apiClient, useApi } from './api';
