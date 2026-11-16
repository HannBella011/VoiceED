// ReportForm - VoiceED
// Main report submission form component

'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { submitReportAuthenticated, submitReportAnonymous } from '@/services';

const CATEGORIES = [
  { value: 'academic', label: 'Academic Concern', icon: 'fas fa-book' },
  { value: 'harassment', label: 'Harassment or Bullying', icon: 'fas fa-user-slash' },
  {
    value: 'safety',
    label: 'Facility/Safety Hazard',
    icon: 'fas fa-exclamation-triangle',
  },
  { value: 'discrimination', label: 'Discrimination', icon: 'fas fa-balance-scale' },
  { value: 'mental-health', label: 'Mental Health Concern', icon: 'fas fa-brain' },
  { value: 'violence', label: 'Violence or Threat', icon: 'fas fa-fist-raised' },
  { value: 'other', label: 'Other', icon: 'fas fa-ellipsis-h' },
];

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

export function ReportForm({ isAnonymous, onBack, onSuccess }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: undefined,
    is_anonymous: isAnonymous,
    location: '',
    incident_date: '',
    reporter_email: '',
  });

  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [fileErrors, setFileErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [rightNow, setRightNow] = useState(false);

  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // Validate file
  const validateFile = useCallback((file) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `${file.name}: File type not allowed. Only PNG, JPG, JPEG, PDF allowed.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: File size exceeds 25 MB limit.`;
    }
    return null;
  }, []);

  // Handle file selection
  const handleFilesChange = useCallback(
    (selectedFiles) => {
      const newFiles = Array.from(selectedFiles);
      const newErrors = [];
      const validFiles = [];

      for (const file of newFiles) {
        const error = validateFile(file);
        if (error) {
          newErrors.push(error);
        } else {
          validFiles.push(file);
        }
      }

      setFiles((prev) => [...prev, ...validFiles]);
      setFileErrors(newErrors);
    },
    [validateFile]
  );

  // Handle drag and drop
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current?.classList.add('drag-over');
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current?.classList.remove('drag-over');
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZoneRef.current?.classList.remove('drag-over');

      if (e.dataTransfer.files.length > 0) {
        handleFilesChange(e.dataTransfer.files);
      }
    },
    [handleFilesChange]
  );

  // Remove file
  const removeFile = useCallback((index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Handle input change
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Report title is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.category) {
      newErrors.category = 'Please select a category';
    }
    if (!formData.location?.trim()) {
      newErrors.location = 'Location is required';
    }
    if (
      isAnonymous &&
      formData.reporter_email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.reporter_email)
    ) {
      newErrors.reporter_email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validateForm()) return;
    if (files.length === 0 && !confirm('Submit without attachments?')) return;

    setIsSubmitting(true);

    try {
      let report;
      if (isAnonymous) {
        report = await submitReportAnonymous(formData, files);
      } else {
        report = await submitReportAuthenticated(formData, files);
      }

      onSuccess(report);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Failed to submit report. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle "Right Now" checkbox
  const handleRightNowChange = (checked) => {
    setRightNow(checked);
    if (checked) {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      const isoString = now.toISOString().slice(0, 16);
      handleChange('incident_date', isoString);
    } else {
      handleChange('incident_date', '');
    }
  };

  // Get category icon
  const getCategoryIcon = (category) => {
    const cat = CATEGORIES.find((c) => c.value === category);
    return cat?.icon || 'fas fa-tag';
  };

  return (
    <form onSubmit={handleSubmit} className="report-form" encType="multipart/form-data">
      {submitError && (
        <div className="form-error-banner" role="alert">
          <i className="fas fa-exclamation-circle"></i>
          {submitError}
        </div>
      )}

      {/* Report Title */}
      <div className="form-group">
        <label htmlFor="reportTitle" className="form-label">
          Report Title <span className="required">*</span>
        </label>
        <input
          type="text"
          id="reportTitle"
          className={`form-input ${errors.title ? 'error' : ''}`}
          placeholder="Brief, descriptive title for your report"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          maxLength={200}
          required
          disabled={isSubmitting}
        />
        {errors.title && <span className="form-error">{errors.title}</span>}
      </div>

      {/* Category */}
      <div className="form-group">
        <label htmlFor="incidentCategory" className="form-label">
          Incident Category <span className="required">*</span>
        </label>
        <div className="category-select-wrapper">
          <select
            id="incidentCategory"
            className={`form-input ${errors.category ? 'error' : ''}`}
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            required
            disabled={isSubmitting}
          >
            <option value="">Select category...</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
          <i className="fas fa-chevron-down select-arrow"></i>
        </div>
        {errors.category && <span className="form-error">{errors.category}</span>}
      </div>

      {/* Date & Time */}
      <div className="form-group">
        <label htmlFor="incidentDate" className="form-label">
          Date & Time of Incident
        </label>
        <div className="datetime-input-group">
          <input
            type="datetime-local"
            id="incidentDate"
            className="form-input"
            value={formData.incident_date}
            onChange={(e) => {
              handleChange('incident_date', e.target.value);
              setRightNow(false);
            }}
            disabled={isSubmitting || rightNow}
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              id="rightNowToggle"
              checked={rightNow}
              onChange={(e) => handleRightNowChange(e.target.checked)}
              disabled={isSubmitting}
            />
            <span>Right Now (current time)</span>
          </label>
        </div>
      </div>

      {/* Location */}
      <div className="form-group">
        <label htmlFor="incidentLocation" className="form-label">
          Location <span className="required">*</span>
        </label>
        <input
          type="text"
          id="incidentLocation"
          className={`form-input ${errors.location ? 'error' : ''}`}
          placeholder="Where did this happen? (Building, room, area, etc.)"
          value={formData.location}
          onChange={(e) => handleChange('location', e.target.value)}
          maxLength={255}
          required
          disabled={isSubmitting}
        />
        {errors.location && <span className="form-error">{errors.location}</span>}
      </div>

      {/* Description */}
      <div className="form-group">
        <label htmlFor="incidentDescription" className="form-label">
          Description <span className="required">*</span>
        </label>
        <textarea
          id="incidentDescription"
          className={`form-textarea ${errors.description ? 'error' : ''}`}
          placeholder="Please describe what happened in detail. Include names, dates, times, and any other relevant information."
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={6}
          required
          disabled={isSubmitting}
        />
        {errors.description && <span className="form-error">{errors.description}</span>}
        <p className="form-hint">
          Be as specific as possible. This helps us respond effectively.
        </p>
      </div>

      {/* Anonymous Email (only for anonymous) */}
      {isAnonymous && (
        <div className="form-group">
          <label htmlFor="reporterEmail" className="form-label">
            Email Address (Optional)
          </label>
          <input
            type="email"
            id="reporterEmail"
            className={`form-input ${errors.reporter_email ? 'error' : ''}`}
            placeholder="your@email.com (for updates and tracking code delivery)"
            value={formData.reporter_email}
            onChange={(e) => handleChange('reporter_email', e.target.value)}
            disabled={isSubmitting}
          />
          {errors.reporter_email && (
            <span className="form-error">{errors.reporter_email}</span>
          )}
          <p className="form-hint">
            If provided, you'll receive email updates and your tracking code. Your email
            is never shared with administrators.
          </p>
        </div>
      )}

      {/* File Upload */}
      <div className="form-group">
        <label className="form-label">Evidence Attachments (Optional)</label>

        <div
          ref={dropZoneRef}
          className={`file-upload-area ${files.length > 0 ? 'has-files' : ''} ${fileErrors.length > 0 ? 'error' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="file-input"
            multiple
            accept="image/*,.pdf"
            onChange={(e) => e.target.files && handleFilesChange(e.target.files)}
            disabled={isSubmitting}
            style={{ display: 'none' }}
          />

          <div className="file-upload-label">
            <i className="fas fa-cloud-upload-alt"></i>
            <p>Drag and drop files here or click to browse</p>
            <span className="file-types">
              Supports: PNG, JPG, JPEG, PDF • Max 25 MB per file
            </span>
          </div>
        </div>

        {fileErrors.length > 0 && (
          <div className="file-errors" role="alert">
            {fileErrors.map((error, i) => (
              <div key={i} className="file-error-item">
                <i className="fas fa-times-circle"></i>
                {error}
              </div>
            ))}
          </div>
        )}

        {files.length > 0 && (
          <div className="selected-files" role="list">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}-${file.size}`}
                className="selected-file-item"
                role="listitem"
              >
                <div className="file-info">
                  <i
                    className={`file-icon ${file.type.startsWith('image/') ? 'fas fa-image' : 'fas fa-file-pdf'}`}
                  ></i>
                  <div className="file-details">
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{formatFileSize(file.size)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="file-remove-btn"
                  onClick={() => removeFile(index)}
                  disabled={isSubmitting}
                  aria-label={`Remove ${file.name}`}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Data Handling Statement */}
      <div className="data-handling-statement">
        <i className="fas fa-shield-alt"></i>
        <span>
          Your safety is our priority. All reports are encrypted.
          {isAnonymous
            ? 'Your identity will never be disclosed or tracked.'
            : 'If anonymous, your identity will not be shared with anyone.'}
        </span>
      </div>

      {/* Submit Buttons */}
      <div className="form-actions">
        <button
          type="button"
          className="btn btn--secondary"
          onClick={onBack}
          disabled={isSubmitting}
        >
          <i className="fas fa-arrow-left"></i> Back
        </button>
        <button
          type="submit"
          className="btn btn--primary submit-btn"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <i className="fas fa-spinner fa-spin"></i> Submitting...
            </>
          ) : (
            <>
              <i className="fas fa-paper-plane"></i> Submit Report
            </>
          )}
        </button>
      </div>
    </form>
  );
}

export default ReportForm;
