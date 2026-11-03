// Types - VoiceED
// Type definitions using JSDoc for JavaScript

/**
 * @typedef {Object} RegisterData
 * @property {string} username
 * @property {string} email
 * @property {string} password
 * @property {string} confirmPassword
 * @property {string} [fullName]
 * @property {string} [gender]
 * @property {Object} [birthday]
 * @property {string} birthday.month
 * @property {string} birthday.day
 * @property {string} birthday.year
 * @property {boolean} termsAccepted
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
 * @property {string} createdAt
 */

export { };
