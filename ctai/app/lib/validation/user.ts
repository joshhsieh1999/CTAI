import { Session } from "next-auth";
import { inSameOrganization } from "./organizations";
import { prisma } from "../prisma";

export async function hasUserAccess(user: Session["user"], userId: number) {
    return user.id == userId || (user.roleId == 1 && await inSameOrganization(userId, user.id))
}

export async function getProjectIds(userId: number) {

    const p1 = prisma.projectMember.findMany({
      where: {
        memberId: userId,
      },
    }).then((rows: any) => {
      return rows.map((row: any) => row.projectId)
    })
  
    const p2 = prisma.project.findMany({
      where: {
        creatorId: userId,
      },
    }).then((rows: any) => {
      return rows.map((row: any) => row.id)
    })
  
  
    const [projectIds1, projectIds2] = await Promise.all([p1, p2])
    const projectIds = projectIds1.concat(projectIds2)
  
    return projectIds
  }