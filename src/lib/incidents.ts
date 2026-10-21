import { prisma } from "./prisma";
import { INCIDENT_WINDOW_DAYS } from "./blacklist";

// จำนวนเหตุการณ์ (ยกเลิก/ติดต่อไม่ได้) ในช่วงล่าสุด ต่อลูกค้า (ไม่ระบุ partnerIds = ทุกคน)
export async function recentIncidentCounts(partnerIds?: string[]) {
  const since = new Date(Date.now() - INCIDENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const groups = await prisma.customerIncident.groupBy({
    by: ["partnerId"],
    where: { createdAt: { gte: since }, ...(partnerIds ? { partnerId: { in: partnerIds } } : {}) },
    _count: { _all: true },
  });
  return new Map(groups.map((g) => [g.partnerId, g._count._all]));
}
