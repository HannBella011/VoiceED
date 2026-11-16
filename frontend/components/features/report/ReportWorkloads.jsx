'use client';
import { useEffect, useState } from 'react';
import { adminService } from '@/services/admin';
import { superService } from '@/services/super';
import styles from '@/app/admin/admin.module.css';

const statuses = {
  total: 'Total Assigned Reports',
  submitted: 'Submitted',
  assigned: 'Assigned',
  under_review: 'Under Review',
  in_progress: 'In Progress',
  awaiting_additional_info: 'Awaiting Additional Info',
  resolved: 'Resolved',
  closed: 'Closed',
};
export default function ReportWorkloads({
  currentUser,
  revision = 0,
  oversight = false,
}) {
  const [result, setResult] = useState(null),
    [error, setError] = useState(''),
    [page, setPage] = useState(1),
    [refresh, setRefresh] = useState(0);
  const owner = `${currentUser.id}:${currentUser.role}:${page}:${oversight}`;
  const visible = result?.owner === owner ? result.data : null;
  useEffect(() => {
    const update = () => setRefresh((value) => value + 1);
    window.addEventListener('focus', update);
    window.addEventListener('pageshow', update);
    return () => {
      window.removeEventListener('focus', update);
      window.removeEventListener('pageshow', update);
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setError('');
    setResult(null);
    const request = oversight
      ? superService.workloads({ page, limit: 10 }, { signal: controller.signal })
      : adminService.workload({ signal: controller.signal });
    request
      .then((data) => {
        if (!controller.signal.aborted) setResult({ owner, data });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      });
    return () => controller.abort();
  }, [owner, oversight, page, revision, refresh]);
  const href = (id, status = 'total') =>
    `/admin/reports?assignee_id=${encodeURIComponent(id)}${status === 'total' ? '' : `&status=${status}`}`;
  return (
    <section aria-label={oversight ? 'Assignment oversight' : 'Your assigned reports'}>
      <h2>{oversight ? 'Administrator Workloads' : 'Your Assigned Reports'}</h2>
      {error ? (
        <p role="alert">
          {error}{' '}
          <button
            className="btn btn--secondary btn--sm"
            onClick={() => setRefresh((value) => value + 1)}
          >
            Retry
          </button>
        </p>
      ) : !visible ? (
        <p role="status">Loading assigned reports…</p>
      ) : oversight ? (
        <>
          <div className={styles.workloadTable}>
            <table>
              <thead>
                <tr>
                  <th>Administrator</th>
                  <th>Total</th>
                  <th>Submitted</th>
                  <th>Assigned</th>
                  <th>Under Review</th>
                  <th>In Progress</th>
                  <th>Awaiting Info</th>
                  <th>Resolved</th>
                  <th>Closed</th>
                </tr>
              </thead>
              <tbody>
                {visible.items.map((item) => (
                  <tr key={item.id}>
                    <th scope="row">
                      <a href={href(item.id)}>{item.name}</a>
                      {!item.is_active && <small> Suspended</small>}
                    </th>
                    {Object.keys(statuses).map((status) => (
                      <td key={status}>
                        <a
                          href={href(item.id, status)}
                          aria-label={`${item.name}: ${statuses[status]}`}
                        >
                          {item[status] || 0}
                        </a>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.pagination}>
            <button
              className="btn btn--secondary btn--sm"
              disabled={page === 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous workloads
            </button>
            <span>
              Page {page} of {visible.total_pages}
            </span>
            <button
              className="btn btn--secondary btn--sm"
              disabled={page >= visible.total_pages}
              onClick={() => setPage((value) => value + 1)}
            >
              Next workloads
            </button>
          </div>
        </>
      ) : (
        <div className={styles.stats}>
          {Object.entries(statuses).map(([key, label]) => (
            <a className="stat-card" key={key} href={href(currentUser.id, key)}>
              <span className="stat-value">{visible[key] || 0}</span>
              <span className="stat-label">{label}</span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
