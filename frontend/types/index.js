// Types - VoiceED
// Type definitions using JSDoc for JavaScript

/**
 * @typedef {Object} RegisterData
 * @property {string} fullName - User's full legal name
 * @property {string} displayName - User's display name (3-20 characters)
 * @property {string} email - User's email address
 * @property {string} password - User's password
 * @property {string} confirmPassword - Password confirmation
 * @property {string} schoolId - User's school ID number
 * @property {string} birthday - User's birthday in ISO format (YYYY-MM-DD)
 * @property {boolean} termsAccepted - Whether user accepted terms
 */

/**
 * @typedef {Object} LoginCredentials
 * @property {string} username
 * @property {string} password
 */

/**
 * @typedef {Object} CurrentUser
 * @property {string} id
 * @property {string} username
 * @property {string} email
 * @property {string} [full_name]
 * @property {string} [gender]
 * @property {string} [birthday]
 * @property {string} [school_id]
 * @property {string} createdAt
 */

export {};
