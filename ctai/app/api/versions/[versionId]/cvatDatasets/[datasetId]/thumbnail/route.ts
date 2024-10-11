import { authOptions } from "@/app/lib/auth";
import { prisma } from "@/app/lib/prisma";
import { hasVersionAccess } from "@/app/lib/validation/version";
import fs from 'fs';
import { getServerSession } from "next-auth";
import path from "path";


/**
 * Retrieves a set of random images from a dataset and returns them as a JSON response.
 * @param req - The HTTP request object.
 * @param params - The route parameters containing the versionId, projectId, and datasetId.
 * @returns A JSON response containing the number of images and the selected images.
 */
export async function GET(req: Request, { params }: { params: { versionId: number, projectId: number, datasetId: number } }) {
    try {
        const { versionId, projectId, datasetId } = params;
        const session = await getServerSession(authOptions)!;
        if (!session) {
            return new Response("Unauthorized", { status: 403 })
        }
        const { user } = session;

        if (!(await hasVersionAccess(versionId, user))) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 })
        }

        // query dataset from db
        const datasetDetail = await prisma.dataset.findUnique({
            where: {
                id: Number(datasetId),
            },
        })

        if (!datasetDetail) {
            return new Response('Dataset not found.', { status: 404 })
        }
        const directoryPath = path.resolve(datasetDetail!.filePath + "/images");
        console.log(directoryPath);
        const files = fs.readdirSync(directoryPath);
        const imageFiles = files.filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file));

        if (imageFiles.length === 0) {
            return new Response('No images found in the directory.', { status: 404 })
        }

        const selectedImages = [];
        const numImages = Math.min(imageFiles.length, 6); // max return 5 images
        
        for (let i = 0; i < numImages; i++) {
            const randomIndex = Math.floor(Math.random() * imageFiles.length);
            const randomImage = imageFiles.splice(randomIndex, 1)[0]; // remove randomly choose image
            const imagePath = path.join(directoryPath, randomImage);

            const imageBuffer = fs.readFileSync(imagePath);
            const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`; // from binary to base64

            selectedImages.push({
                name: randomImage,
                value: base64Image
            });
        }

        return new Response(JSON.stringify({
            num: numImages,
            images: selectedImages
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error(error)
        return new Response(null, { status: 500 })
    }
}

