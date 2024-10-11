import { authOptions } from "@/app/lib/auth";
import { prisma } from '@/app/lib/prisma';
import { hasVersionAccess } from '@/app/lib/validation/version';
import fs from 'fs';
import { getServerSession } from 'next-auth';
import path from 'path';
import { env } from "process";
import { v4 as uuidv4 } from 'uuid';
import z from "zod";

interface Task {
    id: number
    name: number
}

const datasetSchema = z.object({
    organizationSlug: z.optional(z.string()),
})

async function getFiles(dir: string): Promise<string[]> {
    const dirents = fs.readdirSync(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map(async (dirent: any) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? await getFiles(res) : res;
    }));
    return Array.prototype.concat(...files);
}

async function copyImages(tasksList: Task[], imageDir: string) {
    try {
        console.log("In Copying Images function -----------------");
        const CVATbaseDir = path.join(process.cwd(), 'ctai_dataset', 'data');

        for (let i = 0; i < tasksList.length; i++) {
            const taskId = tasksList[i].id;
            const taskPath = path.join(CVATbaseDir, String(taskId), 'raw');
            const files = await getFiles(taskPath);

            // check all sub-directories
            const subDirs = fs.readdirSync(taskPath, { withFileTypes: true })
                .filter((dirent: any) => dirent.isDirectory())
                .map((dirent: any) => path.join(taskPath, dirent.name));

            for (const subDir of subDirs) {
                console.log("SubDir", subDir, " exists...");
                const subDirFiles = await getFiles(subDir);
                files.push(...subDirFiles);
            }

            const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
            const filteredFiles = files.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return allowedExtensions.includes(ext);
            });

            await Promise.all(filteredFiles.map(async (file) => {
                const targetPath = path.join(imageDir, path.basename(file));
                fs.copyFileSync(file, targetPath);
            }));
        }
        console.log("Finish copying data")
    }
    catch (error) {
        console.error(error)
        return new Response(null, { status: 500 })
    }
}

async function downloadAnnotation(tasksList: Task[], annotationDir: string, CVATAuthToken: string) {
    try {
        console.log("In Downloading Annotation List function -----------------");
        for (let i = 0; i < tasksList.length; i++) {
            const taskId = tasksList[i].id;
            const taskName = tasksList[i].name;
            const filename = `${i}_${taskName}`;
            const startResponse = await fetch(`${env.CVAT_URL}/api/tasks/${taskId}/annotations?action=download&filename=${filename}.zip&format=YOLO+1.1&use_default_location=true`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Token ${CVATAuthToken}`,
                },
                credentials: 'include'
            });
            
            if (startResponse.status === 202) {
                let isDownloaded = false;
                while (!isDownloaded) {
                    console.log("fetch again");
                    const checkResponse = await fetch(`${env.CVAT_URL}/api/tasks/${taskId}/annotations?action=download&filename=${filename}.zip&format=YOLO+1.1&use_default_location=true`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Token ${CVATAuthToken}`,
                        },
                        credentials: 'include'
                    });

                    if (checkResponse.status === 200) {
                        console.log("Writing file...");
                        isDownloaded = true;
                        const downloadResponse = await checkResponse.arrayBuffer();
                        const filePath = path.join(annotationDir, `${filename}.zip`);
                        fs.writeFileSync(filePath, Buffer.from(downloadResponse));
                        console.log(`Write annotation file in: ${annotationDir}/${filename}.zip`);
                    } else {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
            } else {
                throw Error("Error fetching CVAT tasks annotations API");
            }
        }
        console.log("Finish download annotations")
    } catch (error) {
        console.error("Error when downloading annotations", error);
        return new Response(null, { status: 500 })
    }
}

/**
 * Handles the POST request for creating a dataset from CVAT.
 * First, it fetches the tasks list from CVAT and then copies the images and downloads the annotations.
 * Finally, it creates a dataset in the database and updates the version's datasetId.
 * @param req - The request object.
 * @param params - The parameters object containing the versionId.
 * @returns A Response object with the dataset creation result.
 */
export async function POST(req: Request, { params }: { params: { versionId: number } }) {
    try {
        const { versionId } = params;
        const session = await getServerSession(authOptions)!;
        if (!session) {
            return new Response("Unauthorized", { status: 403 })
        }
        const { user } = session;

        if (!(await hasVersionAccess(versionId, user))) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
        }

        // parse Body
        const json = await req.json()
        const postBody = datasetSchema.parse(json);

        const baseDir = path.join(process.cwd(), 'ctai_dataset', 'ctai');
        console.log("BaseDir: ", baseDir)
        const targetDir = path.join(baseDir, uuidv4());
        const imageDir = path.join(targetDir, 'images');
        const annotationDir = path.join(targetDir, 'annotations');

        // structure {baseDir}/ctai_dataset/ctai
        // exists or not, if not exist then create
        fs.mkdirSync(baseDir, { recursive: true });
        // fs.chmodSync(baseDir, 0o774);
        // create new random dir to store CVAT images
        fs.mkdirSync(targetDir);
        fs.chmodSync(targetDir, 0o774);
        fs.mkdirSync(imageDir);
        fs.chmodSync(imageDir, 0o774);
        fs.mkdirSync(annotationDir);
        fs.chmodSync(annotationDir, 0o774);

        // fetch tasksList
        const tasksList = await fetch(`${env.CVAT_URL}/api/tasks?org=${postBody.organizationSlug}&page=1&page_size=100`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${user.CVATAuthToken}`,
            },
            credentials: 'include'
        })
            .then(async (response) => {
                const CVATres = await response.text()
                if (!response.ok) {
                    console.error(CVATres);
                    throw new Error('Something went wrong when fetching CVAT Tasks List...');
                }
                return CVATres
            })
            .then(data => {
                return JSON.parse(data).results;
            })
            .catch(error => {
                console.error('Error fetching CVAT tasks:', error);
            });

        const [] = await Promise.all([copyImages(tasksList, imageDir), downloadAnnotation(tasksList, annotationDir, user.CVATAuthToken)]);
        
        // create dataset
        const dataset = await prisma.dataset.create({
            data: {
                labelType: "Object detection",
                dataPreprocess: "Preprocess Type lists",
                dataAugmentation: "Augmentation Type list",
                datasetSplit: "datasetSplit",
                filePath: targetDir,
            },
        })
        console.log("Finish creating dataset")
        // update version's dataset_id
        const res = await prisma.version.update({
            where: {
                id: Number(versionId),
            },
            data: {
                datasetId: dataset.id,
            }
        })
        console.log("Finish updating version's dataset_id")

        return new Response(JSON.stringify(res))
    } catch (error) {
        console.error(error)
        return new Response(null, { status: 500 })
    }
}

