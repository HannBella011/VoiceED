'use client';
import { useRef, useState } from 'react';
import { inspireRequest } from '@/services/inspire';
import InspireDialog from './InspireDialog';

export default function PostAttachments({ attachments = [] }) {
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const request = useRef(0);
  const open = async (item) => {
    const sequence = ++request.current;
    setPreview({ item });
    setError('');
    try {
      const { url } = await inspireRequest(`/attachments/${item.id}/access`);
      if (sequence === request.current) setPreview({ item, url });
    } catch (error) {
      if (sequence === request.current) setError(error.message);
    }
  };
  const close = () => {
    request.current++;
    setPreview(null);
  };
  return (
    <>
      {attachments.length > 0 && (
        <div className="inspire-attachments">
          {attachments.map((item) => (
            <button
              type="button"
              key={item.id}
              className="post-interaction-btn"
              onClick={() => open(item)}
            >
              <i
                className={
                  item.mime_type === 'application/pdf'
                    ? 'fas fa-file-pdf'
                    : 'fas fa-image'
                }
              />{' '}
              {item.filename}
            </button>
          ))}
        </div>
      )}
      {preview && (
        <InspireDialog title={preview.item.filename} onClose={close}>
          {error ? (
            <p role="alert">
              {error}{' '}
              <button type="button" onClick={() => open(preview.item)}>
                Retry
              </button>
            </p>
          ) : !preview.url ? (
            <p role="status">Opening attachment…</p>
          ) : (
            <>
              {preview.item.mime_type === 'application/pdf' ? (
                <iframe
                  title={preview.item.filename}
                  src={preview.url}
                  sandbox=""
                  style={{ width: '100%', height: '55vh' }}
                />
              ) : (
                <img
                  src={preview.url}
                  alt={preview.item.filename}
                  style={{ maxWidth: '100%', maxHeight: '55vh' }}
                />
              )}
              <a href={preview.url} target="_blank" rel="noopener noreferrer">
                Open attachment
              </a>
            </>
          )}
        </InspireDialog>
      )}
    </>
  );
}
