import { prisma } from "@/app/lib/prisma";
import { inSameOrganization } from "./organizations";

export async function hasProjectAccess(projectId: number, user: any) {
    const creatorId = await prisma.project.findFirst({
        where: {
            id: Number(projectId),
        },
        select: {
            creatorId: true,
        },
    }).then((project: any) => {
        return project?.creatorId;
    })
    if (!creatorId) return false
    if (creatorId == user.id) return true
    const promiseIsAdmin = (user.roleId == 1 && inSameOrganization(creatorId, user.id));
    const promiseisProjectMember = await prisma.projectMember.findFirst({
        where: {
            projectId: Number(projectId),
            memberId: Number(user.id), // Updated to access the 'id' property of the 'user' object
        },
    });
    const [isAdmin, isMember] = await Promise.all([promiseIsAdmin, promiseisProjectMember]);
    return (!!isAdmin) || (!!isMember);
}

export async function isProjectOwner(projectId: number, userId: Number) {
    const creatorId = await prisma.project.findFirst({
        where: {
            id: Number(projectId),
        },
        select: {
            creatorId: true,
        },
    }).then((project: any) => {
        return project?.creatorId;
    })
    return creatorId == userId;
}
