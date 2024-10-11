'use client'

import { useState } from 'react'

import { Badge } from '@/app/ui/catalyst/badge'
import { Button } from '@/app/ui/catalyst/button'
import { FullLayout } from '@/app/ui/dashboard/full-layout'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'react-toastify'


const types = [
  {
    id: 1,
    name: 'Object Detection',
    description: 'Identify objects and their positions with bounding boxes.',
    category: 'Best for #Counting, #Tracking',
    imageSrc: 'https://app.roboflow.com/images/onboarding-objdet.png',
    imageAlt:
      '',
  },
  {
    id: 2,
    name: 'Classification',
    description: 'Assign labels to the entire image.',
    category: 'Best for #Filtering, #Tracking',
    imageSrc: 'https://app.roboflow.com/images/onboarding-classification-v2.png',
    imageAlt:
      '',
  },
  // More types...
]

export default function CreateProject() {
  const [selectedType, setSelectedType] = useState<number>(types[0].id);
  const queryClient = useQueryClient();
  const router = useRouter();
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    console.log('projectName', projectName);
    const response = await fetch(`/api/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        taskType: types.find((type) => type.id === selectedType)?.name,
      })
    });

    let data;
    try {
      data = await response.json();
    } catch (error) {
      console.error(error);
    }

    if (response && response.ok && data) {
      queryClient.invalidateQueries({queryKey: ['projects']});
      localStorage.setItem("CTAIProjectID", data.id);
      localStorage.setItem('editingVersionId', data.versionId);
      localStorage.setItem('CVATOrganizationId', String(data.CVATOrganizationId));
      localStorage.setItem('CVATOrganizationSlug', data.CVATOrganizationSlug);
      toast.success("Successful Created", {
        position: "top-center",
        autoClose: 3000, // 持續5秒
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
        progress: undefined,
        closeButton: false,

      });
      router.push(`/project/${data.id}/edit/dataset`);
    } else {
      console.error(response);
      setIsLoading(false);
      toast.error("Create failed", {
        position: "top-center",
        autoClose: 3000, // 持續3秒
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: true,
        progress: undefined,
      });
    }
  };

  return (
    <FullLayout>
      <form onSubmit={submit}>
        <div className="space-y-12">
          <div className="border-b border-gray-900/10 pb-12">
            <h1 className="text-lg font-semibold leading-7 text-gray-900">Create Project</h1>
            <p className="mt-1 text-sm leading-6 text-gray-600">
              Let&apos;s get started by creating a new project. Fill in the form below to create a new project.
            </p>

            <div className="mt-10 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div className="col-span-full">
                <label htmlFor="project-name" className="block text-sm font-medium leading-6 text-gray-900">
                  Project Name
                </label>
                <div className="mt-2">
                  <div className="flex rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-indigo-600 sm:max-w-md">
                    <input
                      type="text"
                      name="project-name"
                      id="project-name"
                      autoComplete="project-name"
                      className="block flex-1 border-0 bg-transparent py-1.5 pl-1 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                      placeholder="E.g., My Awesome Project"
                      onChange={(e) => setProjectName(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-b border-gray-900/10 pb-12">
            <h2 className="text-base font-medium text-gray-900">Project Types</h2>
            <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 sm:gap-y-10 lg:grid-cols-2">
              {types.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  className={`relative flex flex-col items-center justify-center h-full w-full rounded-lg p-4 transition-all duration-300 ease-in-out ${selectedType === type.id
                    ? 'ring-2 ring-offset-2 ring-indigo-500 bg-white'
                    : 'hover:ring-2 hover:ring-offset-2 hover:ring-gray-300'
                    }`}
                  onClick={() => setSelectedType(type.id)}
                >
                  <div className={`flex aspect-w-1 aspect-h-1 w-full rounded-lg overflow-hidden bg-gray-100 group-hover:opacity-75`}>
                    <img src={type.imageSrc} alt={type.imageAlt} className="object-cover object-center" />
                  </div>
                  <div className="mt-2 block text-sm font-medium text-gray-900">{type.name}</div>

                  <Badge className="block text-sm font-medium">
                    {type.category}
                  </Badge>

                  <div className="text-xs text-gray-500">{type.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-x-6">
          <Button
            outline
            type="button"
            className="text-sm font-semibold leading-6 text-gray-900"
            href="/project"
          >
            Cancel
          </Button>
          <Button type="submit" color="blue" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
            <span>
              {isLoading ?
                <div role="status">
                  <svg aria-hidden="true" className="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor" />
                    <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill" />
                  </svg>
                  <span className="sr-only">Loading...</span>
                </div> : "Create"}
            </span>
          </Button>
        </div>
      </form>
    </FullLayout>
  )
}
