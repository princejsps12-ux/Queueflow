import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function daysAgo(days: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function minutesLater(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

async function main() {
  console.log("Clearing existing data...");
  await prisma.token.deleteMany();
  await prisma.queue.deleteMany();
  await prisma.manager.deleteMany();

  console.log("Creating demo manager...");
  const passwordHash = await bcrypt.hash("password123", 10);
  const manager = await prisma.manager.create({
    data: {
      email: "demo@queueflow.dev",
      passwordHash,
      name: "Demo Manager",
    },
  });

  console.log("Creating queues...");
  const frontDesk = await prisma.queue.create({
    data: { name: "Front Desk", managerId: manager.id },
  });
  const pharmacy = await prisma.queue.create({
    data: { name: "Pharmacy Counter", managerId: manager.id },
  });

  // --- Front Desk: history spread over the last 6 days, plus live waiting/serving tokens ---
  let tokenNumber = 1;
  for (let day = 6; day >= 1; day--) {
    const servedCount = 2 + (day % 3);
    for (let i = 0; i < servedCount; i++) {
      const created = daysAgo(day, 9 + i);
      const served = minutesLater(created, 8 + i * 3);
      await prisma.token.create({
        data: {
          queueId: frontDesk.id,
          tokenNumber: tokenNumber++,
          personName: `Guest ${tokenNumber}`,
          position: 0,
          status: "SERVED",
          createdAt: created,
          servedAt: served,
        },
      });
    }
    if (day % 2 === 0) {
      const created = daysAgo(day, 14);
      await prisma.token.create({
        data: {
          queueId: frontDesk.id,
          tokenNumber: tokenNumber++,
          personName: `Guest ${tokenNumber}`,
          position: 0,
          status: "CANCELLED",
          createdAt: created,
          cancelledAt: minutesLater(created, 5),
        },
      });
    }
  }

  const servingCreated = daysAgo(0, 8);
  await prisma.token.create({
    data: {
      queueId: frontDesk.id,
      tokenNumber: tokenNumber++,
      personName: "Alex Rivera",
      position: 0,
      status: "SERVING",
      createdAt: servingCreated,
      servedAt: minutesLater(servingCreated, 6),
    },
  });

  const waitingNames = ["Jordan Lee", "Priya Nair", "Sam Okafor", null];
  for (let i = 0; i < waitingNames.length; i++) {
    await prisma.token.create({
      data: {
        queueId: frontDesk.id,
        tokenNumber: tokenNumber++,
        personName: waitingNames[i],
        position: i,
        status: "WAITING",
        createdAt: minutesLater(new Date(), -1 * (waitingNames.length - i) * 4),
      },
    });
  }

  // --- Pharmacy Counter: a lighter queue, mostly waiting ---
  let pharmacyTokenNumber = 1;
  for (let day = 3; day >= 1; day--) {
    const created = daysAgo(day, 11);
    await prisma.token.create({
      data: {
        queueId: pharmacy.id,
        tokenNumber: pharmacyTokenNumber++,
        personName: `Patient ${pharmacyTokenNumber}`,
        position: 0,
        status: "SERVED",
        createdAt: created,
        servedAt: minutesLater(created, 12),
      },
    });
  }
  for (let i = 0; i < 2; i++) {
    await prisma.token.create({
      data: {
        queueId: pharmacy.id,
        tokenNumber: pharmacyTokenNumber++,
        personName: i === 0 ? "Morgan Diaz" : null,
        position: i,
        status: "WAITING",
        createdAt: minutesLater(new Date(), -1 * (2 - i) * 6),
      },
    });
  }

  console.log("Seed complete.");
  console.log("Demo login -> email: demo@queueflow.dev / password: password123");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
