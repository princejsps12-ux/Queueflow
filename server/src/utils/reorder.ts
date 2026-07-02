import { Prisma, PrismaClient } from "@prisma/client";

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Rewrites WAITING token positions for a queue to a contiguous 0..n-1 sequence,
 * ordered by their current position. Called after any mutation that removes a
 * token from the waiting list, so no gaps or duplicate positions can accumulate.
 */
export async function reflowWaitingPositions(tx: Tx, queueId: string) {
  const waiting = await tx.token.findMany({
    where: { queueId, status: "WAITING" },
    orderBy: { position: "asc" },
  });

  for (let i = 0; i < waiting.length; i++) {
    if (waiting[i].position !== i) {
      await tx.token.update({ where: { id: waiting[i].id }, data: { position: i } });
    }
  }
}
