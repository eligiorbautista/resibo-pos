/**
 * Formats a timestamp into a human-readable relative time string
 * Examples: "5 min ago", "2 hours ago", "3 days ago", "2 months ago", "1 year ago"
 */
export const formatRelativeTime = (timestamp: Date | string): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  
  // Convert to different time units
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  // Return appropriate format based on time elapsed
  if (diffSeconds < 60) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} min${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 30) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else if (diffMonths < 12) {
    return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  } else {
    return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
  }
};

/**
 * Formats a timestamp for display - shows full date if older than 1 day, otherwise relative time
 */
export const formatTimestamp = (timestamp: Date | string): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // If older than 1 day, show full date, otherwise show relative time
  if (diffDays >= 1) {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  return formatRelativeTime(timestamp);
};

