// Admin endpoint to view user feedback
// Usage: GET /api/admin/feedback?key=YOUR_ADMIN_KEY

import { getFeedbackData } from '../../lib/feedbackStore';

const ADMIN_KEY = process.env.ADMIN_GENERATION_KEY;

export default async function handler(req, res) {
  const { method, query } = req;

  if (method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify admin key
  if (query.key !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // This is a placeholder - in production you'd read from a database
    // For now, we'll return instructions on how to view feedback
    res.status(200).json({
      message: 'Feedback data is stored in localStorage on each client device.',
      instructions: 'To view aggregated feedback, you need to implement a database storage solution.',
      suggestion: 'For now, you can add this to your browser console to see your own feedback:',
      code: 'console.table(JSON.parse(localStorage.getItem("ie_feedback") || "[]"))',
      
      // If you want to implement server-side storage, here's the structure:
      feedbackSchema: {
        imageId: 'timestamp-based ID',
        prompt: 'the prompt used',
        style: 'realistic | illustration | silhouette',
        rating: 'good | bad',
        issue: 'cropped | duplicate | blurry | wrong_subject | background | missing_prop | other',
        timestamp: 'ISO date string'
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
