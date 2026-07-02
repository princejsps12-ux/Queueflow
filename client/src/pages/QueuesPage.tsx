import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { queuesApi } from "../api/endpoints";
import type { QueueSummary } from "../api/types";
import { getApiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { EmptyState } from "../components/EmptyState";

export function QueuesPage() {
  const { showToast } = useToast();
  const [queues, setQueues] = useState<QueueSummary[] | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadQueues() {
    try {
      const data = await queuesApi.list();
      setQueues(data);
    } catch (err) {
      showToast(getApiErrorMessage(err, "Failed to load queues"), "error");
    }
  }

  useEffect(() => {
    loadQueues();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setError(null);
    setIsCreating(true);
    try {
      await queuesApi.create(newName.trim());
      setNewName("");
      setShowForm(false);
      showToast("Queue created", "success");
      await loadQueues();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create queue"));
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Queues</h1>
          <p className="text-sm text-slate-500">Manage all of your active service queues.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + New Queue
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 flex items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-slate-700">
            Queue name
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Front Desk"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <button
            type="submit"
            disabled={isCreating || !newName.trim()}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCreating ? "Creating..." : "Create"}
          </button>
        </form>
      )}
      {error && <p className="mb-4 text-sm text-rose-600">{error}</p>}

      {queues === null ? (
        <LoadingSpinner label="Loading queues..." />
      ) : queues.length === 0 ? (
        <EmptyState
          title="No queues yet"
          description="Create your first queue to start adding people to it."
          action={
            !showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Create a queue
              </button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {queues.map((q) => (
            <Link
              key={q.id}
              to={`/queues/${q.id}`}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <h3 className="text-base font-semibold text-slate-900">{q.name}</h3>
              <p className="mt-1 text-xs text-slate-400">
                Created {new Date(q.createdAt).toLocaleDateString()}
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700">
                  {q.waitingCount} waiting
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
