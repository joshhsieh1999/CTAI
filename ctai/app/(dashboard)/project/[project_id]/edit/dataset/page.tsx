'use client'

import { Button } from '@/app/ui/catalyst/button'
import Link from 'next/link'

import { FolderOpenIcon, FolderPlusIcon } from '@heroicons/react/24/outline'

import ProjectLayout from '@/app/ui/project/layout'
import { Card, CardFooter, Image, Spinner } from '@nextui-org/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface VersionData {
  id: Number
  datasetId: Number
  sessionId: Number
}

interface ImageData {
  name: string,
  value: string
}

const redirectToCVAT = (e: any): void => {
  e.preventDefault(); // Prevent redirect by href
  const orgSlug = localStorage.getItem('CVATOrganizationSlug');

  if (orgSlug === null) {
    window.location.href = "/project";
  } else {
    localStorage.setItem('currentOrganization', orgSlug!);
    localStorage.setItem('redirectFromCVAT', 'false');
    window.location.href = '/cvat/tasks?page=1';
  }
};

const fetchVersionDetail = async (versionId: Number) => {
  const response = await fetch(`/api/versions/${versionId}`);
  return response.json();
}

const createDataset = async (versionId: Number) => {
  const organizationSlug = localStorage.getItem('CVATOrganizationSlug');
  const response = await fetch(`/api/versions/${versionId}/cvatDatasets`, {
    method: "POST",
    body: JSON.stringify({ "organizationSlug": organizationSlug }),
  });
  return response.json();
}

const fetchImages = async (versionId: Number, datasetId: Number) => {
  console.log("call fetch images");
  const response = await fetch(`/api/versions/${versionId}/cvatDatasets/${datasetId}/thumbnail`);
  return response.json();
}

function NewData() {
  const [editingVersionId, setEditingVersionId] = useState<Number | null>(null);
  const [projectId, setProjectId] = useState<Number | null>(null);
  const [images, setImages] = useState<ImageData[] | null>(null);
  const [isCreateDataset, setIsCreateDataset] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadedProjectId = Number(localStorage.getItem('CTAIProjectID'));
    const loadedEditingVersionId = Number(localStorage.getItem('editingVersionId'));
    if (loadedProjectId && loadedEditingVersionId) {
      setProjectId(loadedProjectId);
      setEditingVersionId(loadedEditingVersionId);
    }
  }, []);

  // fetch versions detail
  const { data: versionDetail, isLoading: isVersionDetailLoading } = useQuery<VersionData>({
    queryKey: ['projects', projectId, 'edit', 'versions'],
    queryFn: () => {
      return fetchVersionDetail(editingVersionId!);
    },
    enabled: !!projectId && !!editingVersionId,
    staleTime: 0,
  });

  // create dataset if from CVAT
  useEffect(() => {
    if (versionDetail) {
      const fromCVAT = localStorage.getItem('redirectFromCVAT') === 'true';
      if (fromCVAT) {
        setIsCreateDataset(true);
        createDataset(editingVersionId!)
          .then(res => {
            localStorage.setItem('redirectFromCVAT', 'false');
            queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'edit', 'versions'] })
            setIsCreateDataset(false);
          });
      }
    }
  }, [versionDetail]);

  // fetch image if versionDetail.datasetId exist
  const { data: imagesRes, isLoading: isImageLoading } = useQuery({
    queryKey: ['projects', projectId, 'edit', 'dataset'],
    queryFn: () => {
      if (projectId === null || editingVersionId === null || versionDetail?.datasetId === undefined) {
        return Promise.resolve(null);
      }
      return fetchImages(editingVersionId, versionDetail.datasetId);
    },
    enabled: !!projectId && !!editingVersionId && !!versionDetail?.datasetId
  });


  useEffect(() => {
    if (imagesRes) {
      console.log(imagesRes);
      const urls = imagesRes.images.map((image: ImageData) => {
        return image;
      });
      console.log(urls);
      setImages(urls);
    }
  }, [imagesRes]);


  return (
    <div className="mt-5">
      <Link
        href={'/'}
        type="button"
        onClick={redirectToCVAT}
        className="relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        {!projectId || !editingVersionId || isVersionDetailLoading || isImageLoading || isCreateDataset ?
          <div className="flex justify-center items-center z-50">
            <Spinner />
          </div>
          : (!versionDetail?.datasetId ?
            <div>
              <FolderOpenIcon className="mx-auto h-12 w-12 text-gray-400" />
              <span className="mt-2 block text-sm font-semibold text-gray-900">Click to manage your data</span>
            </div>
            : (images ?
              <div>
                <div>
                  <span className="-mt-6 block text-sm font-semibold text-gray-900">Below are example data from your dataset</span>
                </div>
                {/* show image */}
                <div className='mx-auto py-4'>
                  <div className='grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-2 2xl:gap-7.5 mb-4'>
                    {images.map((image, index) => (
                      <div key={`dataset-image-preview-${index}`}>
                        <Card
                          isFooterBlurred
                          radius="lg"
                          className="border-none justify-center h-52"
                        ><Image
                            // isBlurred
                            alt="Random image from your dataset"
                            className="object-cover min-h-52 min-w-52"
                            src={image.value}
                          />
                          <CardFooter className="hidden md:flex justify-center before:bg-white/10 border-white/20 border-1 overflow-hidden py-1 absolute before:rounded-xl rounded-large bottom-1 w-[calc(100%_-_8px)] shadow-small ml-1 z-10">
                            <p className="text-tiny text-black/80">
                              {image.name.length > 20 ? image.name.substring(0, 20) + "..." : image.name}
                            </p>
                          </CardFooter>
                          <CardFooter className="md:hidden justify-center before:bg-white/10 border-white/20 border-1 overflow-hidden py-1 absolute before:rounded-xl rounded-large bottom-1 w-[calc(100%_-_8px)] shadow-small ml-1 z-10">
                            <p className="text-tiny text-black/80">
                              {image.name.length > 30 ? image.name.substring(0, 30) + "..." : image.name}
                            </p>
                          </CardFooter>
                        </Card>
                      </div>))}
                  </div>
                </div>
              </div>
              :
              <div className="flex justify-center items-center z-50">
                <Spinner />
              </div>)
          )
        }
      </Link >
    </div >
  )
}

export default function EditProject() {
  const params = useParams();
  const projectId = Number(params.project_id);
  const route = useRouter();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => {
      const versionId = localStorage.getItem('editingVersionId');
      return fetch(`/api/versions/${versionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'Editing:model',
        }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project', projectId, 'versions'], refetchType: 'all' })
      route.push(`/project/${projectId}/edit/model`)
    },
    onError: (error) => {
      console.error('Error:', error);
    }
  });

  return (
    <ProjectLayout>
      <div className="mx-auto max-w-2xl">
        <div>
          <div className="text-center">
            <FolderPlusIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h1 className="mt-2 text-base font-semibold leading-6 text-gray-900">Add / Manage your dataset</h1>
            <p className="mt-1 text-sm text-gray-500">
              Add data for your project to train your model.
            </p>
          </div>
        </div>
        <div className="mt-10">
          <NewData />
          <div className="mt-6 flex items-center justify-end gap-x-6">
            <Button
              onClick={() => mutation.mutate()}
              color='indigo'
              type="button"
              className="cursor-pointer rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
            >
              Next Step
            </Button>
          </div>
        </div>
      </div>
    </ProjectLayout>
  )
}
