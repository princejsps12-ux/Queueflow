import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { reflowWaitingPositions } from "../utils/reorder";

const router = Router();
router.use(requireAuth);

const moveSchema = z.object({
  direction: z.enum(["up", "down"]),
});

async function findOwnedToken(tokenId: string, managerId: string) {
  return prisma.token.findFirst({
    where: { id: tokenId, queue: { managerId } },
  });
}

// PATCH /tokens/:id/move - swap position with the adjacent WAITING token
router.patch("/:id/move", async (req, res) => {
  const parsed = moveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const token = await findOwnedToken(req.params.id, req.manager!.managerId);
  if (!token) {
    return res.status(404).json({ error: "Token not found" });
  }
  if (token.status !== "WAITING") {
    return res.status(400).json({ error: "Only waiting tokens can be reordered" });
  }

  const { direction } = parsed.data;

  const neighbor = await prisma.token.findFirst({
    where: {
      queueId: token.queueId,
      status: "WAITING",
      position: direction === "up" ? { lt: token.position } : { gt: token.position },
    },
    orderBy: { position: direction === "up" ? "desc" : "asc" },
  });

  if (!neighbor) {
    return res.status(400).json({
      error: direction === "up" ? "Token is already at the top" : "Token is already at the bottom",
    });
  }

  await prisma.$transaction([
    prisma.token.update({ where: { id: token.id }, data: { position: neighbor.position } }),
    prisma.token.update({ where: { id: neighbor.id }, data: { position: token.position } }),
  ]);

  res.json({ success: true });
});

// PATCH /tokens/:id/cancel - cancel a WAITING or SERVING token
router.patch("/:id/cancel", async (req, res) => {
  const token = await findOwnedToken(req.params.id, req.manager!.managerId);
  if (!token) {
    return res.status(404).json({ error: "Token not found" });
  }
  if (token.status !== "WAITING" && token.status !== "SERVING") {
    return res.status(400).json({ error: "Only waiting or serving tokens can be cancelled" });
  }

  const wasWaiting = token.status === "WAITING";

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.token.update({
      where: { id: token.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    if (wasWaiting) {
      await reflowWaitingPositions(tx, token.queueId);
    }

    return result;
  });

  res.json(updated);
});

export default router;
