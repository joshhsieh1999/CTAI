import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { toGETQueryString } from '@/app/lib/utils';
import { inSameOrganization } from '@/app/lib/validation/organizations';
import { getServerSession } from 'next-auth';
import { env } from 'process';
import z from 'zod';

const memberDataSchema = z.object({
    memberId: z.number(),
})

/**
 * Retrieves the members of a project with the given projectId
 * @param req - The request object.
 * @param params - The parameters object containing the projectId.
 * @returns A response object with the members of the project.
 */
export async function GET(req: Request, { params }: { params: { projectId: number } }) {
    const { projectId } = params;
    if (!projectId) {
        return new Response(JSON.stringify({ error: 'projectId is required' }), { status: 422 })
    }

    try {
        const members = await prisma.projectMember.findMany({
            include: { member: true },
            where: {
                projectId: Number(projectId),
            },
        });
        return new Response(JSON.stringify(members), { status: 200 })
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
    }
}

/**
 * Handles the POST request to add a member to a project.
 * 
 * @param req - The request object.
 * @param params - The parameters object containing the projectId.
 * @returns A response object indicating the success or failure of the operation.
 */
export async function POST(req: Request, { params }: { params: { projectId: number } }) {
    const { projectId } = params;
    const session = await getServerSession(authOptions);
    if (!projectId) {
        return new Response(JSON.stringify({ error: 'projectId is required' }), { status: 422 })
    }

    const json = await req.json()
    const { memberId } = memberDataSchema.parse(json);
    if (!memberId) {
        return new Response(JSON.stringify({ error: 'memberId is required' }), { status: 422 })
    }

    const isCreator = await isProjectCreator(projectId, session!!.user.id);
    if (!isCreator) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
    }

    if(!(await inSameOrganization(session!!.user.id, memberId))){
        return new Response(JSON.stringify({ error: 'Users are not in the same organization' }), { status: 422 })
    }

    try {
        const key = await CVATInviteUserToProject(projectId, memberId, session!!.user.CVATAuthToken);
        const projectMember = await prisma.projectMember.create({
            data: {
                projectId: Number(projectId),
                memberId: Number(memberId),
                CVATMembershipId: key,
            },
        });
        return new Response(JSON.stringify(projectMember), { status: 200 })
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
    }
}

/**
 * Deletes a member from a project.
 * 
 * @param req - The request object.
 * @param params - The parameters object containing the projectId.
 * @returns A response object indicating the success or failure of the operation.
 */
export async function DELETE(req: Request, { params }: { params: { projectId: number } }) {
    const { projectId } = params;
    const session = await getServerSession(authOptions);
    if (!projectId) {
        return new Response(JSON.stringify({ error: 'projectId is required' }), { status: 422 })
    }

    const json = await req.json()
    const { memberId } = memberDataSchema.parse(json);
    if (!memberId) {
        return new Response(JSON.stringify({ error: 'memberId is required' }), { status: 422 })
    }
    const isCreator = await isProjectCreator(projectId, session!!.user.id);
    if (!isCreator) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
    }

    try {
        await CVATRemoveFromProject(projectId, memberId, session!!.user.CVATAuthToken);
        const projectMember = await prisma.projectMember.delete({
            where: {
                projectId_memberId: {
                    projectId: Number(projectId),
                    memberId: Number(memberId),
                },
            },
        });
        return new Response(JSON.stringify(projectMember), { status: 200 })
    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
    }
}

async function isProjectCreator(projectId: number, userId: number) {
    const project = await prisma.project.findFirst({
        where: {
            id: Number(projectId),
            creatorId: Number(userId),
        },
    });
    return !!project;
}

async function CVATInviteUserToProject(projectId: number, memberId: number, CVATAuthToken: string) {

    const promiseOrgData = prisma.project.findUnique({
        where: {
            id: Number(projectId),
        },
        select: {
            CVATOrganizationId: true,
            CVATOrganizationSlug: true,
        },
    }).then((data: any) => {
        return data!;
    });

    const promiseMemEmail = prisma.user.findUnique({
        where: {
            id: Number(memberId),
        },
        select: {
            email: true,
        },
    }).then((data: any) => {
        return data!;
    })

    const [{ CVATOrganizationId, CVATOrganizationSlug }, { email }] = await Promise.all([promiseOrgData, promiseMemEmail]);

    const inviteData = {
        role: "supervisor",
        email: email,
    };

    await fetch(`${env.CVAT_URL}/api/invitations?org=${CVATOrganizationSlug}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${CVATAuthToken}`,
        },
        credentials: 'include',
        body: JSON.stringify(inviteData),
    }).then(async (response) => {
        if (!response.ok) {
            throw new Error('CVAT failed', { cause: `${response.statusText}: ${await response.text()}` });
        }
    });

    const getParams = {
        org: CVATOrganizationSlug!,
        page: 1,
        page_size: 10,
        role: "supervisor",
        user: email!,
    };

    const getParamsString = toGETQueryString(getParams)
    const response = await fetch(`${env.CVAT_URL}/api/memberships?${getParamsString}`, {
        method: 'GET',
        headers: {
            'Authorization': `Token ${CVATAuthToken}`,
        },
        credentials: 'include',
    }).then(async (response) => {
        if (!response.ok) {
            throw new Error('CVAT failed', { cause: `${response.statusText}: ${await response.text()}` });
        }
        else{
            return await response.json()
        }
    });
    const CVATMembershipId = response.results[0].id;
    return CVATMembershipId;
}

async function CVATRemoveFromProject(projectId: number, memberId: number, CVATAuthToken: string) {

    const CVATMembershipId = await prisma.projectMember.findUnique({
        where: {
            projectId_memberId: {
                projectId: Number(projectId),
                memberId: Number(memberId),
            },
        },
        select: {
            CVATMembershipId: true,
        },
    }).then((data: any) => {
        return data.CVATMembershipId;
    });

    await fetch(`${env.CVAT_URL}/api/memberships/${CVATMembershipId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Token ${CVATAuthToken}`,
        },
        credentials: 'include',
    }).then(async (response) => {
        if (!response.ok) {
            throw new Error('CVAT failed', { cause: `${response.statusText}: ${await response.text()}` });
        }
    });
}