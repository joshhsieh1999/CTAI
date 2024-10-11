import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { hasProjectAccess } from '@/app/lib/validation/project';
import { getServerSession } from 'next-auth';
import { env } from 'process';

/**
 * Handles the GET request for retrieving project information.
 * Gets the project information based on the provided projectId.
 * @param req - The request object.
 * @param params - The parameters object containing the projectId.
 * @returns A Response object with the project information or an error message.
 */
export async function GET(req: Request, { params }: { params: { projectId: number } }) {
    // Handle GET request
    const { projectId } = params;
    const session = await getServerSession(authOptions)!;
    if (!session) {
        return new Response("Unauthorized", { status: 403 })
    }
    const { user } = session;

    if (!projectId) {
        return new Response(JSON.stringify({ error: 'projectId is required' }), { status: 422 })
    }

    if (!(await hasProjectAccess(projectId, user))) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
    }

    try {
        const projects = await prisma.project.findUnique({
            where: {
                id: Number(projectId),
            },
        });
        return new Response(JSON.stringify(projects), { status: 200 })
    } catch (error) {
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
    }
}

/**
 * Handles the DELETE request for a project.
 * Deletes a project based on the provided projectId.
 * @param req - The request object.
 * @param params - The parameters object containing the projectId.
 * @returns A response indicating the success or failure of the delete operation.
 */
export async function DELETE(req: Request, { params }: { params: { projectId: number } }) {
    // Handle DELETE request
    const { projectId } = params;
    const session = await getServerSession(authOptions)!;
    if (!session) {
        return new Response("Unauthorized", { status: 403 })
    }
    const { user } = session;

    if (!projectId) {
        return new Response(JSON.stringify({ error: 'projectId is required' }), { status: 422 })
    }

    if (!(await hasProjectAccess(projectId, user))) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
    }

    try {
        const organizationId = await prisma.project.findUnique({
            where: {
                id: Number(projectId),
            },
            select: {
                CVATOrganizationId: true
            }
        }).then((data: any) => {
            return data.CVATOrganizationId
        });

        await deleteCVATOrganization(organizationId, user.CVATAuthToken)
        await prisma.project.delete({
            where: {
                id: Number(projectId),
            },
        });
        return new Response(JSON.stringify({ message: 'Project deleted' }), { status: 200 })
    } catch (error) {
        console.error(error)    
        return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
    }
}

async function deleteCVATOrganization(organizationId: number, CVATHeaderKey: string) {

    // Default options are marked with *
    await fetch(`${env.CVAT_URL}/api/organizations/${organizationId}`!, {
        method: 'DELETE', // *GET, POST, PUT, DELETE, etc.
        headers: {
            'Authorization': `Token ${CVATHeaderKey}`
        },
        credentials: 'include', // include, *same-origin, omit
    }).then(async (response) => {
        if (!response.ok) {
            throw new Error('CVAT failed', { cause: `${response.statusText}: ${await response.text()}` });
        }
    });
}
