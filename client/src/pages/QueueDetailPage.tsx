import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { queuesApi, tokensApi } from "../api/endpoints";
import type { QueueDetail } from "../api/types";
import { getApiErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import { LoadingSpinner } from "../components/LoadingSpinner";
import { EmptyState } from "../components/EmptyState";

export function QueueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const [queue, setQueue] = useState<QueueDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [personName, setPersonName] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isServing, setIsServing] = useState(false);
  const [pendingTokenId, setPendingTokenId] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    if (!id) return;
    try {
      const data = await queuesApi.get(id);
      setQueue(data);
    } catch (err) {
      if ((err as { response?: { status?: number } })?.response?.status === 404) {
        setNotFound(true);
      } else {
        showToast(getApiErrorMessage(err, "Failed to load queue"), "error");
      }
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  async function handleAddToken(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    setIsAdding(true);
    try {
      await queuesApi.addToken(id, personName.trim() || null);
      setPersonName("");
      showToast("Token added to queue", "success");
      await loadQueue();
    } catch (err) {
      showToast(getApiErrorMessage(err, "Failed to add token"), "error");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleServeNext() {
    if (!id) return;
    setIsServing(true);
    try {
      await queuesApi.serveNext(id);
      showToast("Next token is now being served", "success");
      await loadQueue();
    } catch (err) {
      showToast(getApiErrorMessage(err, "Failed to serve next token"), "error");
    } finally {
      setIsServing(false);
    }
  }

  async function handleMove(tokenId: string, direction: "up" | "down") {
    setPendingTokenId(tokenId);
    try {
      await tokensApi.move(tokenId, direction);
      await loadQueue();
    } catch (err) {
      showToast(getApiErrorMessage(err, "Failed to move token"), "error");
    } finally {
      setPendingTokenId(null);
    }
  }

  async function handleCancel(tokenId: string) {
    setPendingTokenId(tokenId);
    try {
      await tokensApi.cancel(tokenId);
      showToast("Token cancelled", "info");
      await loadQueue();
    } catch (err) {
      showToast(getApiErrorMessage(err, "Failed to cancel token"), "error");
    } finally {
      setPendingTokenId(null);
    }
  }

  if (isLoading) return <LoadingSpinner label="Loading queue..." />;

  if (notFound || !queue) {
    return (
      <EmptyState
        title="Queue not found"
        description="This queue may have been removed, or you don't have access to it."
        action={
          <Link to="/queues" className="text-sm font-medium text-brand-600 hover:underline">
            Back to queues
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <Link to="/queues" className="text-xs font-medium text-slate-400 hover:text-brand-600">
            &larr; All queues
          </Link>
          <h1 className="mt-1 truncate text-2xl font-semibold text-slate-900">{queue.name}</h1>
        </div>
        <button
          onClick={handleServeNext}
          disabled={isServing || queue.waiting.length === 0}
          className="shrink-0 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          title={queue.waiting.length === 0 ? "No waiting tokens to serve" : undefined}
        >
          {isServing ? "Serving..." : "Serve Next →"}
        </button>
      </div>

      <section className="mb-6">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Now Serving
        </h2>
        {queue.serving ? (
          <div className="flex items-center justify-between rounded-xl border-2 border-brand-500 bg-brand-50 p-5 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                Token #{queue.serving.tokenNumber}
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {queue.serving.personName || "Walk-in guest"}
              </p>
            </div>
            <button
              onClick={() => handleCancel(queue.serving!.id)}
              disabled={pendingTokenId === queue.serving.id}
              className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-5 text-center text-sm text-slate-400">
            No one is being served right now
          </div>
        )}
      </section>

      <section className="mb-6">
        <form onSubmit={handleAddToken} className="flex items-end gap-3">
          <label className="flex flex-1 flex-col gap-1.5 text-sm font-medium text-slate-700">
            Add to queue
            <input
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="Person's name (optional)"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <button
            type="submit"
            disabled={isAdding}
            className="rounded-lg border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
          >
            {isAdding ? "Adding..." : "+ Add"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Waiting ({queue.waiting.length})
        </h2>
        {queue.waiting.length === 0 ? (
          <EmptyState title="No one is waiting" description="Add a token above to get started." />
        ) : (
          <ul className="flex flex-col gap-2">
            {queue.waiting.map((token, index) => (
              <li
                key={token.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                    {token.tokenNumber}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {token.personName || "Walk-in guest"}
                    </p>
                    <p className="text-xs text-slate-400">Position {index + 1}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <IconButton
                    label="Move up"
                    disabled={index === 0 || pendingTokenId === token.id}
                    onClick={() => handleMove(token.id, "up")}
                  >
                    <ArrowUpIcon />
                  </IconButton>
                  <IconButton
                    label="Move down"
                    disabled={index === queue.waiting.length - 1 || pendingTokenId === token.id}
                    onClick={() => handleMove(token.id, "down")}
                  >
                    <ArrowDownIcon />
                  </IconButton>
                  <button
                    onClick={() => handleCancel(token.id)}
                    disabled={pendingTokenId === token.id}
                    className="ml-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
  );
}
