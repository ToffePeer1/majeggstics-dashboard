import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import LoadingSpinner from '@/components/LoadingSpinner'

// ─── Types ───────────────────────────────────────────────────────────────────

interface LastDecisionResult {
  shouldSave: boolean
  reason: string
  syncPercentage: number
  isPendingSync?: boolean
}

interface PendingMissingPlayer {
  discord_id: string
  ign: string
  updatedAt: string
}

interface PendingSyncData {
  players: unknown[]
  timestamp: string
  syncPercentage: number
  attemptCount: number
  missingPlayers: PendingMissingPlayer[]
}

interface SnapshotStatus {
  last_saved_at: string | null
  last_decision_at: string | null
  last_decision_result: LastDecisionResult | null
  pending_sync_data: PendingSyncData | null
  pending_sync_first_attempt: string | null
  pending_sync_attempt_count: number | null
  last_email_sent_at: string | null
  last_email_type: string | null
}

interface SnapshotResult {
  inserted: number
  errors: number
}

interface ActionResult {
  success: boolean
  dryRun?: boolean
  playerCount?: number
  snapshotDate?: string
  snapshots?: SnapshotResult
  eggdayGains?: SnapshotResult
  emailSent?: boolean
  message?: string
  error?: string
}

interface SnapshotListItem {
  snapshot_date: string
  record_count: number
  imported_at: string
}

type OwnerAction = 'force-update' | 'dry-run' | 'get-status' | 'mark-saved'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '1rem',
        padding: '0.6rem 0.75rem',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--color-bg)',
      }}
    >
      <span
        style={{
          color: 'var(--color-text-secondary)',
          minWidth: '160px',
          flexShrink: 0,
          fontSize: '0.875rem',
          fontWeight: '500',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: '0.875rem', color: 'var(--color-text)' }}>{value}</span>
    </div>
  )
}

function StatusRows({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
        background: 'var(--color-bg-secondary)',
        borderRadius: 'var(--radius-md)',
        padding: '0.5rem',
      }}
    >
      {children}
    </div>
  )
}

function ActionResultCard({ result }: { result: ActionResult }) {
  const isSuccess = result.success && !result.error
  return (
    <div
      className="card"
      style={{
        border: '1px solid var(--color-border)',
        borderLeft: `4px solid ${isSuccess ? 'var(--color-success)' : 'var(--color-danger)'}`,
      }}
    >
      <h2 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
        {result.dryRun ? 'Dry Run Result' : 'Update Result'}
      </h2>
      <StatusRows>
        <StatusRow label="Success" value={isSuccess ? '✅ Yes' : '❌ No'} />
        {result.snapshotDate && <StatusRow label="Snapshot date" value={result.snapshotDate} />}
        {result.playerCount !== undefined && (
          <StatusRow label="Players fetched" value={String(result.playerCount)} />
        )}
        {result.snapshots && (
          <StatusRow
            label="Snapshots"
            value={`${result.snapshots.inserted} inserted, ${result.snapshots.errors} errors`}
          />
        )}
        {result.eggdayGains && result.eggdayGains.inserted > 0 && (
          <StatusRow
            label="Eggday gains"
            value={`${result.eggdayGains.inserted} inserted, ${result.eggdayGains.errors} errors`}
          />
        )}
        {result.emailSent !== undefined && (
          <StatusRow label="Email sent" value={result.emailSent ? '✅ Yes' : '❌ No'} />
        )}
        {result.message && <StatusRow label="Message" value={result.message} />}
        {result.error && <StatusRow label="Error" value={result.error} />}
      </StatusRows>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OwnerPanel() {
  const { getAuthenticatedClient } = useAuth()

  const [status, setStatus] = useState<SnapshotStatus | null>(null)
  const [statusLoading, setStatusLoading] = useState(true)
  const [statusError, setStatusError] = useState<string | null>(null)

  const [actionLoading, setActionLoading] = useState<OwnerAction | null>(null)
  const [actionResult, setActionResult] = useState<ActionResult | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [snapshots, setSnapshots] = useState<SnapshotListItem[]>([])
  const [snapshotsLoading, setSnapshotsLoading] = useState(true)
  const [selectedSnapshot, setSelectedSnapshot] = useState<string>('')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteResult, setDeleteResult] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // ── Owner actions ─────────────────────────────────────────────────────────

  const callAction = useCallback(
    async (action: OwnerAction) => {
      const supabase = getAuthenticatedClient()
      if (!supabase) return

      if (action === 'get-status') {
        setStatusLoading(true)
        setStatusError(null)
      } else {
        setActionLoading(action)
        setActionError(null)
        setActionResult(null)
      }

      try {
        const { data, error } = await supabase.functions.invoke('owner-actions', {
          body: { action },
        })

        if (error) throw error

        if (action === 'get-status') {
          setStatus((data as { data: SnapshotStatus }).data)
        } else {
          setActionResult(data as ActionResult)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        if (action === 'get-status') setStatusError(message)
        else setActionError(message)
      } finally {
        if (action === 'get-status') setStatusLoading(false)
        else setActionLoading(null)
      }
    },
    [getAuthenticatedClient]
  )

  // ── Snapshot list ─────────────────────────────────────────────────────────

  const loadSnapshots = useCallback(async () => {
    const supabase = getAuthenticatedClient()
    if (!supabase) return

    setSnapshotsLoading(true)
    try {
      const { data, error } = await supabase
        .from('snapshot_metadata')
        .select('snapshot_date, record_count, imported_at')
        .order('snapshot_date', { ascending: false })

      if (error) throw error

      const list = (data ?? []) as SnapshotListItem[]
      setSnapshots(list)
      if (list.length > 0) setSelectedSnapshot(list[0].snapshot_date)
    } catch {
      setSnapshots([])
    } finally {
      setSnapshotsLoading(false)
    }
  }, [getAuthenticatedClient])

  // ── Delete snapshot ───────────────────────────────────────────────────────

  const deleteSnapshot = useCallback(async () => {
    const supabase = getAuthenticatedClient()
    if (!supabase || !selectedSnapshot) return

    setDeleteLoading(true)
    setDeleteError(null)
    setDeleteResult(null)
    setDeleteConfirm(false)

    try {
      const { data, error } = await supabase.functions.invoke('delete-snapshot', {
        body: { snapshot_date: selectedSnapshot },
      })

      if (error) throw error

      setDeleteResult((data as { message: string }).message)
      await loadSnapshots()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setDeleteLoading(false)
    }
  }, [getAuthenticatedClient, selectedSnapshot, loadSnapshots])

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    callAction('get-status')
    loadSnapshots()
  }, [callAction, loadSnapshots])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="container">
      <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Owner Panel</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
        Dashboard management tools.
      </p>

      {/* Status card */}
      <div
        className="card"
        style={{ marginBottom: '1.5rem', border: '1px solid var(--color-border)' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600' }}>Snapshot Status</h2>
          <button
            className="button button-secondary"
            style={{ border: '1px solid var(--color-border)' }}
            onClick={() => callAction('get-status')}
            disabled={statusLoading}
          >
            {statusLoading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {statusLoading ? (
          <LoadingSpinner text="Loading status…" />
        ) : statusError ? (
          <p style={{ color: 'var(--color-danger)' }}>{statusError}</p>
        ) : status ? (
          <StatusRows>
            <StatusRow
              label="Last saved"
              value={status.last_saved_at ? formatDate(status.last_saved_at) : 'Never'}
            />
            <StatusRow
              label="Last decision"
              value={status.last_decision_at ? formatDate(status.last_decision_at) : 'Never'}
            />
            {status.last_decision_result && (
              <>
                <StatusRow
                  label="Decision outcome"
                  value={
                    status.last_decision_result.shouldSave
                      ? '✅ Saved'
                      : `❌ ${status.last_decision_result.reason}`
                  }
                />
                <StatusRow
                  label="Sync %"
                  value={`${status.last_decision_result.syncPercentage.toFixed(1)}%`}
                />
              </>
            )}
            {status.pending_sync_data !== null && (
              <StatusRow
                label="Pending sync"
                value={`⏳ Attempt ${status.pending_sync_attempt_count ?? 0} — ${status.pending_sync_data.syncPercentage.toFixed(
                  1
                )}% synced${
                  status.pending_sync_data.missingPlayers.length > 0
                    ? ` (missing: ${status.pending_sync_data.missingPlayers.map((p) => p.ign).join(', ')})`
                    : ''
                }`}
              />
            )}
            <StatusRow
              label="Last email"
              value={
                status.last_email_sent_at
                  ? `${formatDate(status.last_email_sent_at)} (${status.last_email_type ?? 'unknown'})`
                  : 'None sent'
              }
            />
          </StatusRows>
        ) : (
          <p style={{ color: 'var(--color-text-muted)' }}>No status data available.</p>
        )}
      </div>

      {/* Actions card */}
      <div
        className="card"
        style={{ marginBottom: '1.5rem', border: '1px solid var(--color-border)' }}
      >
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>Actions</h2>

        {actionError && (
          <p style={{ color: 'var(--color-danger)', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {actionError}
          </p>
        )}

        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <button
              className="button button-primary"
              onClick={() => callAction('force-update')}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'force-update' ? 'Saving…' : '⚡ Force Weekly Update'}
            </button>
            <p
              style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}
            >
              Saves a snapshot now, skipping sync conditions.
            </p>
          </div>

          <div>
            <button
              className="button button-secondary"
              style={{ border: '1px solid var(--color-border)' }}
              onClick={() => callAction('dry-run')}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'dry-run' ? 'Running…' : '🔍 Dry Run'}
            </button>
            <p
              style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}
            >
              Fetches data without writing to the database.
            </p>
          </div>

          <div>
            <button
              className="button button-secondary"
              style={{ border: '1px solid var(--color-border)' }}
              onClick={async () => {
                await callAction('mark-saved')
                await callAction('get-status')
              }}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'mark-saved' ? 'Marking…' : '📌 Mark as Saved Now'}
            </button>
            <p
              style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}
            >
              Stamps last_saved_at to now without re-saving data.
            </p>
          </div>
        </div>
      </div>

      {/* Action result */}
      {actionResult && (
        <div style={{ marginBottom: '1.5rem' }}>
          <ActionResultCard result={actionResult} />
        </div>
      )}

      {/* Delete snapshot card */}
      <div className="card" style={{ border: '1px solid var(--color-border)' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
          Delete Snapshot
        </h2>

        {snapshotsLoading ? (
          <LoadingSpinner text="Loading snapshots…" />
        ) : snapshots.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No snapshots found.</p>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                gap: '1rem',
                alignItems: 'flex-end',
                flexWrap: 'wrap',
                marginBottom: '1rem',
              }}
            >
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    marginBottom: '0.4rem',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Snapshot
                </label>
                <select
                  className="select"
                  value={selectedSnapshot}
                  onChange={(e) => {
                    setSelectedSnapshot(e.target.value)
                    setDeleteConfirm(false)
                    setDeleteResult(null)
                    setDeleteError(null)
                  }}
                >
                  {snapshots.map((s) => (
                    <option key={s.snapshot_date} value={s.snapshot_date}>
                      {s.snapshot_date} — {s.record_count} players
                    </option>
                  ))}
                </select>
              </div>

              {!deleteConfirm ? (
                <button
                  className="button button-danger"
                  onClick={() => setDeleteConfirm(true)}
                  disabled={!selectedSnapshot || deleteLoading}
                >
                  Delete
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="button button-danger"
                    onClick={deleteSnapshot}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? 'Deleting…' : 'Confirm delete'}
                  </button>
                  <button
                    className="button button-secondary"
                    style={{ border: '1px solid var(--color-border)' }}
                    onClick={() => setDeleteConfirm(false)}
                    disabled={deleteLoading}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {deleteResult && (
              <p style={{ fontSize: '0.875rem', color: 'var(--color-success)' }}>
                ✅ {deleteResult}
              </p>
            )}
            {deleteError && (
              <p style={{ fontSize: '0.875rem', color: 'var(--color-danger)' }}>❌ {deleteError}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
