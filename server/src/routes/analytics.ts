import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { computeAnalytics } from "../utils/analytics";

const router = Router();
router.use(requireAuth);

// GET /analytics - aggregate analytics across all queues owned by the manager
router.get("/", async (req, res) => {
  const managerId = req.manager!.managerId;

  const queues = await prisma.queue.findMany({
    where: { managerId },
    select: { id: true, name: true },
  });
  const queueIds = queues.map((q) => q.id);

  const overall = await computeAnalytics(queueIds);

  const perQueue = await Promise.all(
    queues.map(async (q) => {
      const stats = await computeAnalytics([q.id]);
      return {
        id: q.id,
        name: q.name,
        currentWaiting: stats.currentWaiting,
        avgWaitTimeMinutes: stats.avgWaitTimeMinutes,
        servedToday: stats.servedToday,
        cancelledToday: stats.cancelledToday,
      };
    })
  );

  res.json({ ...overall, queueCount: queues.length, perQueue });
});

export default router;
