import { MessageSquare } from 'lucide-react';

type FeedbackListProps = {
  title: string;
  comments: string[];
};

export function FeedbackList({ title, comments }: FeedbackListProps) {
  return (
    <div className="tmcpa-card">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare size={14} style={{ color: 'var(--ink-3)' }} />
        <h4 className="serif" style={{ fontSize: 18 }}>
          {title}
        </h4>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {comments.length === 0 && (
          <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>
            No comments submitted.
          </p>
        )}
        {comments.map((c, i) => (
          <div
            key={i}
            style={{
              padding: '10px 12px',
              borderLeft: '2px solid var(--line-2)',
              fontSize: 13,
              color: 'var(--ink-2)',
            }}
          >
            &ldquo;{c}&rdquo;
          </div>
        ))}
      </div>
    </div>
  );
}
