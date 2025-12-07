// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
// ============================================================================
// Email Service
// ============================================================================
// Handles email sending via Resend API with HTML formatting

import type { EmailData, EmailResult, SnapshotDecision } from './types.ts';
import { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Send email via Resend API
 * 
 * @param emailData - Email configuration and content
 * @param resendApiKey - Resend API key from environment
 * @returns Result object with success status
 */
export async function sendEmail(
  emailData: EmailData,
  resendApiKey: string
): Promise<EmailResult> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailData.type === 'week_no_update' || emailData.type === 'sync_failed'
          ? 'Majeggstics Alerts <alerts@updates.resend.dev>' // Use Resend's sandbox for alerts
          : 'Majeggstics Dashboard <notifications@updates.resend.dev>',
        to: emailData.recipient,
        subject: emailData.subject,
        text: emailData.bodyText,
        html: emailData.bodyHtml,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.message || `HTTP ${response.status}`,
        responseData: result,
      };
    }

    return {
      success: true,
      messageId: result.id,
      responseData: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Log email to database
 * 
 * @param supabase - Supabase client
 * @param emailData - Email data
 * @param result - Email sending result
 */
export async function logEmail(
  supabase: SupabaseClient,
  emailData: EmailData,
  result: EmailResult
): Promise<void> {
  try {
    const { error } = await supabase
      .from('email_log')
      .insert({
        email_type: emailData.type,
        recipient: emailData.recipient,
        subject: emailData.subject,
        body_preview: emailData.bodyText.substring(0, 200),
        success: result.success,
        response_data: result.responseData,
        error_message: result.error,
        related_snapshot_date: emailData.relatedSnapshotDate,
        metadata: emailData.metadata,
      });

    if (error) {
      console.error('Failed to log email:', error);
    }
  } catch (error) {
    console.error('Error logging email:', error);
  }
}

/**
 * Create snapshot saved email (success case)
 */
export function createSnapshotSavedEmail(
  recipient: string,
  snapshotDate: string,
  playerCount: number,
  decision: SnapshotDecision,
  dbResults: {
    snapshotsInserted: number;
    snapshotsErrors: number;
    eggdayInserted: number;
    eggdayErrors: number;
  }
): EmailData {
  const subject = `✅ Snapshot saved - ${snapshotDate} - ${playerCount} players`;
  
  const bodyText = `
New snapshot saved successfully.

=== Sync Details ===
- Total Players Received: ${decision.totalPlayersReceived}
- Non-Excluded Players: ${decision.totalNonExcludedPlayers}
- Excluded Players: ${decision.excludedPlayerCount}
- Sync Percentage: ${decision.syncPercentage.toFixed(2)}%
- Players in Sync Window: ${decision.playersInSyncWindow}
- Snapshot Date: ${snapshotDate}

=== Timing ===
- Lowest Update Time: ${decision.lowestUpdatedAt?.toISOString()}
- Time Since Update: ${decision.timeSinceLowestUpdateHours.toFixed(2)} hours
- Hours Since Last Save: ${decision.hoursSinceLastSave === Infinity ? 'Never' : decision.hoursSinceLastSave.toFixed(2)}

=== Save Decision ===
- Reason: ${decision.reason}

=== Database Results ===
- Player Snapshots: ${dbResults.snapshotsInserted} inserted, ${dbResults.snapshotsErrors} errors
- Eggday Gains: ${dbResults.eggdayInserted} inserted, ${dbResults.eggdayErrors} errors

View dashboard: https://majeggstics-dashboard.vercel.app/
`.trim();

  const bodyHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .section { background: white; padding: 15px; margin: 15px 0; border-radius: 6px; border-left: 4px solid #10b981; }
    .section h3 { margin-top: 0; color: #059669; }
    .metric { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .metric:last-child { border-bottom: none; }
    .metric-label { font-weight: 500; }
    .metric-value { color: #059669; font-weight: 600; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Snapshot Saved Successfully</h1>
    </div>
    <div class="content">
      <div class="section">
        <h3>Sync Details</h3>
        <div class="metric"><span class="metric-label">Total Players Received:</span><span class="metric-value">${decision.totalPlayersReceived}</span></div>
        <div class="metric"><span class="metric-label">Non-Excluded Players:</span><span class="metric-value">${decision.totalNonExcludedPlayers}</span></div>
        <div class="metric"><span class="metric-label">Excluded Players:</span><span class="metric-value">${decision.excludedPlayerCount}</span></div>
        <div class="metric"><span class="metric-label">Sync Percentage:</span><span class="metric-value">${decision.syncPercentage.toFixed(2)}%</span></div>
        <div class="metric"><span class="metric-label">Players in Sync Window:</span><span class="metric-value">${decision.playersInSyncWindow}</span></div>
        <div class="metric"><span class="metric-label">Snapshot Date:</span><span class="metric-value">${snapshotDate}</span></div>
      </div>
      
      <div class="section">
        <h3>Timing</h3>
        <div class="metric"><span class="metric-label">Lowest Update Time:</span><span class="metric-value">${decision.lowestUpdatedAt?.toISOString()}</span></div>
        <div class="metric"><span class="metric-label">Time Since Update:</span><span class="metric-value">${decision.timeSinceLowestUpdateHours.toFixed(2)} hours</span></div>
        <div class="metric"><span class="metric-label">Hours Since Last Save:</span><span class="metric-value">${decision.hoursSinceLastSave === Infinity ? 'Never' : decision.hoursSinceLastSave.toFixed(2)}</span></div>
      </div>
      
      <div class="section">
        <h3>Database Results</h3>
        <div class="metric"><span class="metric-label">Player Snapshots Inserted:</span><span class="metric-value">${dbResults.snapshotsInserted}</span></div>
        <div class="metric"><span class="metric-label">Player Snapshots Errors:</span><span class="metric-value">${dbResults.snapshotsErrors}</span></div>
        <div class="metric"><span class="metric-label">Eggday Gains Inserted:</span><span class="metric-value">${dbResults.eggdayInserted}</span></div>
        <div class="metric"><span class="metric-label">Eggday Gains Errors:</span><span class="metric-value">${dbResults.eggdayErrors}</span></div>
      </div>
      
      <div style="text-align: center;">
        <a href="https://majeggstics-dashboard.vercel.app/" class="button">View Dashboard</a>
      </div>
    </div>
    <div class="footer">
      Majeggstics Dashboard - Automated Snapshot System
    </div>
  </div>
</body>
</html>
`.trim();

  return {
    type: 'snapshot_saved',
    recipient,
    subject,
    bodyText,
    bodyHtml,
    relatedSnapshotDate: snapshotDate,
    metadata: {
      playerCount,
      syncPercentage: decision.syncPercentage,
      snapshotsInserted: dbResults.snapshotsInserted,
      eggdayInserted: dbResults.eggdayInserted,
    },
  };
}

/**
 * Create partial sync warning email
 */
export function createPartialSyncEmail(
  recipient: string,
  snapshotDate: string,
  playerCount: number,
  decision: SnapshotDecision,
  dbResults: {
    snapshotsInserted: number;
    snapshotsErrors: number;
    eggdayInserted: number;
    eggdayErrors: number;
  }
): EmailData {
  const missingCount = decision.missingPlayers?.length || 0;
  const subject = `⚠️ Snapshot saved (partial sync) - ${decision.syncPercentage.toFixed(1)}% - ${missingCount} missing players`;
  
  const missingPlayersList = decision.missingPlayers
    ?.map(p => `  - ${p.ign} (${p.discord_id}): Updated ${p.timeDifferenceHours.toFixed(2)} hours after others`)
    .join('\n') || '';
  
  const bodyText = `
Snapshot saved after detecting partial synchronization.

⚠️ WARNING: Not all players were synchronized during the update event.

=== Sync Details ===
- Total Players Received: ${decision.totalPlayersReceived}
- Non-Excluded Players: ${decision.totalNonExcludedPlayers}
- Sync Percentage: ${decision.syncPercentage.toFixed(2)}%
- Players in Sync Window: ${decision.playersInSyncWindow}
- Missing Players: ${missingCount}
- Attempts: ${decision.pendingAttemptCount} (waited 15 minutes, still partial)
- Snapshot Date: ${snapshotDate}

=== Missing Players ===
${missingPlayersList || 'None'}

💡 ACTION REQUIRED:
Consider adding missing players to the excluded_players table if their save data is consistently problematic.

=== Database Results ===
- Player Snapshots: ${dbResults.snapshotsInserted} inserted, ${dbResults.snapshotsErrors} errors
- Eggday Gains: ${dbResults.eggdayInserted} inserted, ${dbResults.eggdayErrors} errors

View dashboard: https://majeggstics-dashboard.vercel.app/
`.trim();

  const missingPlayersHtml = decision.missingPlayers
    ?.map(p => `<div class="metric"><span class="metric-label">${p.ign} (${p.discord_id})</span><span class="metric-value">${p.timeDifferenceHours.toFixed(2)} hours late</span></div>`)
    .join('') || '<p>None</p>';

  const bodyHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .warning { background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .section { background: white; padding: 15px; margin: 15px 0; border-radius: 6px; border-left: 4px solid #f59e0b; }
    .section h3 { margin-top: 0; color: #d97706; }
    .metric { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .metric:last-child { border-bottom: none; }
    .metric-label { font-weight: 500; }
    .metric-value { color: #d97706; font-weight: 600; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Snapshot Saved (Partial Sync)</h1>
    </div>
    <div class="content">
      <div class="warning">
        <strong>⚠️ WARNING:</strong> Not all players were synchronized during the update event. Snapshot saved after ${decision.pendingAttemptCount} attempts.
      </div>
      
      <div class="section">
        <h3>Sync Details</h3>
        <div class="metric"><span class="metric-label">Total Players Received:</span><span class="metric-value">${decision.totalPlayersReceived}</span></div>
        <div class="metric"><span class="metric-label">Non-Excluded Players:</span><span class="metric-value">${decision.totalNonExcludedPlayers}</span></div>
        <div class="metric"><span class="metric-label">Sync Percentage:</span><span class="metric-value">${decision.syncPercentage.toFixed(2)}%</span></div>
        <div class="metric"><span class="metric-label">Players in Sync Window:</span><span class="metric-value">${decision.playersInSyncWindow}</span></div>
        <div class="metric"><span class="metric-label">Missing Players:</span><span class="metric-value">${missingCount}</span></div>
        <div class="metric"><span class="metric-label">Snapshot Date:</span><span class="metric-value">${snapshotDate}</span></div>
      </div>
      
      <div class="section">
        <h3>Missing Players</h3>
        ${missingPlayersHtml}
      </div>
      
      <div class="section">
        <h3>💡 Action Required</h3>
        <p>Consider adding missing players to the <code>excluded_players</code> table if their save data is consistently problematic.</p>
      </div>
      
      <div class="section">
        <h3>Database Results</h3>
        <div class="metric"><span class="metric-label">Player Snapshots Inserted:</span><span class="metric-value">${dbResults.snapshotsInserted}</span></div>
        <div class="metric"><span class="metric-label">Eggday Gains Inserted:</span><span class="metric-value">${dbResults.eggdayInserted}</span></div>
      </div>
      
      <div style="text-align: center;">
        <a href="https://majeggstics-dashboard.vercel.app/" class="button">View Dashboard</a>
      </div>
    </div>
    <div class="footer">
      Majeggstics Dashboard - Automated Snapshot System
    </div>
  </div>
</body>
</html>
`.trim();

  return {
    type: 'partial_sync',
    recipient,
    subject,
    bodyText,
    bodyHtml,
    relatedSnapshotDate: snapshotDate,
    metadata: {
      playerCount,
      syncPercentage: decision.syncPercentage,
      missingCount,
      attemptCount: decision.pendingAttemptCount,
    },
  };
}

/**
 * Create week no update alert email
 */
export function createWeekNoUpdateEmail(
  recipient: string,
  decision: SnapshotDecision,
  hoursSinceLastSave: number,
  lastSavedAt: string | null
): EmailData {
  const subject = `🚨 Alert: No snapshot saved in 7+ days`;
  
  const bodyText = `
No snapshot has been saved in over 7 days.

=== Last Save ===
- Last Saved: ${lastSavedAt || 'Never'}
- Hours Since Save: ${hoursSinceLastSave === Infinity ? 'Never' : hoursSinceLastSave.toFixed(2)}

=== Recent Decision ===
- Lowest Update Time: ${decision.lowestUpdatedAt?.toISOString() || 'N/A'}
- Sync Percentage: ${decision.syncPercentage.toFixed(2)}%
- Players in Sync Window: ${decision.playersInSyncWindow} / ${decision.totalNonExcludedPlayers}
- Time Since Update: ${decision.timeSinceLowestUpdateHours.toFixed(2)} hours
- Reason: ${decision.reason}

💡 ACTION REQUIRED:
- Check if the bot API is functioning correctly
- Verify that players are being updated
- Review player data integrity

View dashboard: https://majeggstics-dashboard.vercel.app/
`.trim();

  const bodyHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .alert { background: #fee2e2; border: 2px solid #dc2626; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .section { background: white; padding: 15px; margin: 15px 0; border-radius: 6px; border-left: 4px solid #dc2626; }
    .section h3 { margin-top: 0; color: #b91c1c; }
    .metric { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .metric:last-child { border-bottom: none; }
    .metric-label { font-weight: 500; }
    .metric-value { color: #b91c1c; font-weight: 600; }
    .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
    .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚨 Alert: No Snapshot in 7+ Days</h1>
    </div>
    <div class="content">
      <div class="alert">
        <strong>🚨 ALERT:</strong> No snapshot has been saved in over 7 days. This may indicate an issue with the bot API or player data updates.
      </div>
      
      <div class="section">
        <h3>Last Save</h3>
        <div class="metric"><span class="metric-label">Last Saved:</span><span class="metric-value">${lastSavedAt || 'Never'}</span></div>
        <div class="metric"><span class="metric-label">Hours Since Save:</span><span class="metric-value">${hoursSinceLastSave === Infinity ? 'Never' : hoursSinceLastSave.toFixed(2)}</span></div>
      </div>
      
      <div class="section">
        <h3>Recent Decision</h3>
        <div class="metric"><span class="metric-label">Lowest Update Time:</span><span class="metric-value">${decision.lowestUpdatedAt?.toISOString() || 'N/A'}</span></div>
        <div class="metric"><span class="metric-label">Sync Percentage:</span><span class="metric-value">${decision.syncPercentage.toFixed(2)}%</span></div>
        <div class="metric"><span class="metric-label">Players in Sync:</span><span class="metric-value">${decision.playersInSyncWindow} / ${decision.totalNonExcludedPlayers}</span></div>
        <div class="metric"><span class="metric-label">Time Since Update:</span><span class="metric-value">${decision.timeSinceLowestUpdateHours.toFixed(2)} hours</span></div>
        <div class="metric"><span class="metric-label">Reason:</span><span class="metric-value" style="font-size: 0.9em;">${decision.reason}</span></div>
      </div>
      
      <div class="section">
        <h3>💡 Action Required</h3>
        <ul>
          <li>Check if the bot API is functioning correctly</li>
          <li>Verify that players are being updated</li>
          <li>Review player data integrity</li>
        </ul>
      </div>
      
      <div style="text-align: center;">
        <a href="https://majeggstics-dashboard.vercel.app/" class="button">View Dashboard</a>
      </div>
    </div>
    <div class="footer">
      Majeggstics Dashboard - Automated Snapshot System
    </div>
  </div>
</body>
</html>
`.trim();

  return {
    type: 'week_no_update',
    recipient,
    subject,
    bodyText,
    bodyHtml,
    metadata: {
      hoursSinceLastSave,
      syncPercentage: decision.syncPercentage,
    },
  };
}
