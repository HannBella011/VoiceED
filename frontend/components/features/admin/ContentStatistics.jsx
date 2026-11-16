'use client';
import styles from '@/app/admin/admin.module.css';

const metrics = {
  resources: 'Resources Shared',
  stories: 'Stories Published',
  quotes: 'Quotes Published',
  comments: 'Comments',
  other_posts: 'Other Posts',
};
export default function ContentStatistics({ data }) {
  return (
    <section aria-label="Content statistics">
      <h2>Content Overview</h2>
      <div className={styles.stats}>
        {Object.entries(metrics).map(([key, label]) => (
          <div className="stat-card" key={key}>
            <span className="stat-value">{data?.content[key] ?? '—'}</span>
            <span className="stat-label">{label}</span>
          </div>
        ))}
        <div className="stat-card">
          <span className="stat-value">{data?.moderation.actions ?? '—'}</span>
          <span className="stat-label">Moderation Actions</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{data?.moderation.removed_content ?? '—'}</span>
          <span className="stat-label">Content Removed</span>
        </div>
      </div>
    </section>
  );
}
