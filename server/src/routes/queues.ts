import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { reflowWaitingPositions } from "../utils/reorder";
import { computeAnalytics } from "../utils/analytics";

const router = Router();
router.use(requireAuth);

const createQueueSchema = z.object({
  name: z.string().trim().min(1, "Queue name is required").max(100),
});

const addTokenSchema = z.object({
  personName: z.string().trim().max(100).optional().nullable(),
});

// GET /queues - list all queues owned by the logged-in manager
router.get("/", async (req, res) => {
  const managerId = req.manager!.managerId;
  const queues = await prisma.queue.findMany({
    where: { managerId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { tokens: { where: { status: "WAITING" } } },
      },
    },
  });

  res.json(
    queues.map((q) => ({
      id: q.id,
      name: q.name,
      createdAt: q.createdAt,
      waitingCount: q._count.tokens,
    }))
  );
});

// POST /queues - create a new queue
router.post("/", async (req, res) => {
  const parsed = createQueueSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const queue = await prisma.queue.create({
    data: { name: parsed.data.name, managerId: req.manager!.managerId },
  });

  res.status(201).json(queue);
});

async function findOwnedQueue(queueId: string, managerId: string) {
  return prisma.queue.findFirst({ where: { id: queueId, managerId } });
}

// GET /queues/:id - get a queue with its tokens
router.get("/:id", async (req, res) => {
  const queue = await findOwnedQueue(req.params.id, req.manager!.managerId);
  if (!queue) {
    return res.status(404).json({ error: "Queue not found" });
  }

  const tokens = await prisma.token.findMany({
    where: { queueId: queue.id, status: { in: ["WAITING", "SERVING"] } },
    orderBy: [{ status: "asc" }, { position: "asc" }],
  });

  const waiting = tokens
    .filter((t) => t.status === "WAITING")
    .sort((a, b) => a.position - b.position);
  const serving = tokens.find((t) => t.status === "SERVING") ?? null;

  res.json({ ...queue, serving, waiting });
});

// POST /queues/:id/tokens - add a token to the bottom of the queue
router.post("/:id/tokens", async (req, res) => {
  const parsed = addTokenSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const queue = await findOwnedQueue(req.params.id, req.manager!.managerId);
  if (!queue) {
    return res.status(404).json({ error: "Queue not found" });
  }

  const personName = parsed.data.personName?.trim() || null;

  const token = await prisma.$transaction(async (tx) => {
    const [waitingCount, lastToken] = await Promise.all([
      tx.token.count({ where: { queueId: queue.id, status: "WAITING" } }),
      tx.token.findFirst({
        where: { queueId: queue.id },
        orderBy: { tokenNumber: "desc" },
      }),
    ]);

    return tx.token.create({
      data: {
        queueId: queue.id,
        tokenNumber: (lastToken?.tokenNumber ?? 0) + 1,
        personName,
        position: waitingCount,
        status: "WAITING",
      },
    });
  });

  res.status(201).json(token);
});

// POST /queues/:id/serve-next - promote the top WAITING token to SERVING
router.post("/:id/serve-next", async (req, res) => {
  const queue = await findOwnedQueue(req.params.id, req.manager!.managerId);
  if (!queue) {
    return res.status(404).json({ error: "Queue not found" });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const nextToken = await tx.token.findFirst({
        where: { queueId: queue.id, status: "WAITING" },
        orderBy: { position: "asc" },
      });

      if (!nextToken) {
        throw new Error("EMPTY_QUEUE");
      }

      const currentServing = await tx.token.findFirst({
        where: { queueId: queue.id, status: "SERVING" },
      });

      if (currentServing) {
        await tx.token.update({
          where: { id: currentServing.id },
          data: { status: "SERVED" },
        });
      }

      const updated = await tx.token.update({
        where: { id: nextToken.id },
        data: { status: "SERVING", servedAt: new Date() },
      });

      await reflowWaitingPositions(tx, queue.id);

      return updated;
    });

    res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === "EMPTY_QUEUE") {
      return res.status(400).json({ error: "No waiting tokens to serve" });
    }
    throw err;
  }
});

// GET /queues/:id/analytics - analytics scoped to a single queue
router.get("/:id/analytics", async (req, res) => {
  const queue = await findOwnedQueue(req.params.id, req.manager!.managerId);
  if (!queue) {
    return res.status(404).json({ error: "Queue not found" });
  }

  const stats = await computeAnalytics([queue.id]);
  res.json({ id: queue.id, name: queue.name, ...stats });
});

export default router;
