import { prisma } from '@/app/lib/prisma';

/**
 * Retrieves a project member by their ID.
 * @param req - The request object.
 * @param params - The parameters object containing the project ID and member ID.
 * @returns A response object with the project member details or an error message.
 */
export async function GET(req: Request, {params}: {params: any}) {
    const { projectId, memberId } = params;
    if (!projectId || !memberId) {
        return new Response(JSON.stringify({ error: 'projectId and memberId is required' }), { status: 422 })
    }

    try {
        const projects = await prisma.projectMember.findUnique({
            where: {
                projectId_memberId: {
                    projectId: projectId,
                    memberId: memberId
                }
            },
        });
        return new Response(JSON.stringify(projects), { status: 200 })
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
    }
}