import { prisma } from "@/app/lib/prisma";
import { hasProjectAccess } from "./project";

export async function hasVersionAccess(versionId: number, user: any) {
    const projectId = await prisma.version.findFirst({
        where: {
            id: Number(versionId),
        },
        select: {
            projectId: true,
        },
    }).then((version: any) => {
        return version?.projectId;
    })

    const promiseisProjectMember = hasProjectAccess(projectId!, user);
    const [isMember] = await Promise.all([promiseisProjectMember]);
    return !!isMember;
}

export async function getVersionId(projectId: number, versionNum: number) {
    const versionId = await prisma.version.findFirst({
        where: {
            projectId: Number(projectId),
            versionNum: Number(versionNum),
        },
        select: {
            id: true,
        },
    }).then((version: any) => {
        return version!.id;
    })
    return versionId;
}

export async function getVersionById(versionId: number) {
    const {projectId, versionNum} = await prisma.version.findFirst({
        where: {
            id: Number(versionId),
        },
    }).then((version: any) => {
        return {projectId: version!.projectId, versionNum: version!.versionNum};
    })
    return {projectId, versionNum};
}