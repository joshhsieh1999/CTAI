import { prisma } from "@/app/lib/prisma";

export async function inSameOrganization(userId1: number, userId2: number) {
    const promiseUser1 = prisma.user.findFirst({
        where: {
            id: Number(userId1),
        },
        select: {
            organizationId: true,
        },
    });
    const promiseUser2 = prisma.user.findFirst({
        where: {
            id: Number(userId2),
        },
        select: {
            organizationId: true,
        },
    });
    const [user1, user2] = await Promise.all([promiseUser1, promiseUser2]);
    return (user1!.organizationId === user2!.organizationId);
}
