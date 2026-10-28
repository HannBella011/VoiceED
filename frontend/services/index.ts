// Services Barrel Export - VoiceED
// Re-export all service modules

export { authService } from './auth';
export { reportsService, type Report, type CreateReportData, type UpdateReportData, type ReportFilters } from './reports';
export { wellnessService, type WellnessTip, type JournalEntry, type CreateJournalEntryData, type WellnessFilters } from './wellness';
export { inspireService, type InspireStory, type InspireQuote, type CreateStoryData, type CreateQuoteData, type InspireFilters } from './inspire';
export { shareService, type SharedMaterial, type CreateMaterialData, type ShareFilters } from './share';
export { usersService, type User, type UpdateUserData } from './users';

// Re-export the main API client for backward compatibility
export { apiClient, useApi } from './api';