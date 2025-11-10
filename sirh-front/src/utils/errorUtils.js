// Safely convert various error shapes into a displayable string
export function toErrorMessage(err) {
  if (!err) return '';
  if (typeof err === 'string') return err;
  // Axios-style errors
  if (err.response) {
    const data = err.response.data;
    if (typeof data === 'string') return data;
    if (data && typeof data.message === 'string') return data.message;
  }
  // Common shapes
  if (typeof err.message === 'string') return err.message;
  if (typeof err.error === 'string') return err.error;
  if (err.error && typeof err.error.message === 'string') return err.error.message;
  if (err.data && typeof err.data.message === 'string') return err.data.message;
  try {
    return JSON.stringify(err);
  } catch {
    try {
      return String(err);
    } catch {
      return 'Une erreur est survenue';
    }
  }
}

export default toErrorMessage;
