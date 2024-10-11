'use client'
import { Button } from '@/app/ui/catalyst/button'
import Link from 'next/link'

import DashLayout from '@/app/ui/dashboard/layout'
import { ArrowUpRightIcon, UserPlusIcon } from '@heroicons/react/24/outline'
import { Spinner } from "@nextui-org/react"
import { useQuery } from '@tanstack/react-query'

function NewProject() {
  return (
    <div className="mt-5">
      <Link
        href={'/project/create'}
        type="button"
        className="relative block w-full rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 48 48"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 14v20c0 4.418 7.163 8 16 8 1.381 0 2.721-.087 4-.252M8 14c0 4.418 7.163 8 16 8s16-3.582 16-8M8 14c0-4.418 7.163-8 16-8s16 3.582 16 8m0 0v14m0-4c0 4.418-7.163 8-16 8S8 28.418 8 24m32 10v6m0 0v6m0-6h6m-6 0h-6"
          />
        </svg>
        <span className="mt-2 block text-sm font-semibold text-gray-900">Create a new Project</span>
      </Link>
    </div>
  )
}

interface Project {
  name: string;
  type: string;
  id: number;
  CVATOrganizationId: number;
  CVATOrganizationSlug: string;
}

const fetchProjects = async () => {
  const response = await fetch(`api/projects`);
  return response.json()
}

const saveSelectProjectInfo = (CVATOrganizationId: number, CVATOrganizationSlug: string, projectId: number) => {
  localStorage.setItem('CVATOrganizationId', String(CVATOrganizationId));
  localStorage.setItem('CVATOrganizationSlug', CVATOrganizationSlug);
  localStorage.setItem('CTAIProjectID', String(projectId));
}

function ListProject() {
  const { data, isLoading } = useQuery < Project[] > ({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  });

  return (
    <div className="mt-10">
      <h2 className="text-sm font-medium text-gray-500">Projects that is created</h2>
      <ul role="list" className="mt-4 divide-y divide-gray-200 border-b border-t border-gray-200">
        {isLoading ?
          <div className='flex justify-center h-screen mt-10'>
            <Spinner aria-label="Loading..." />
          </div>
          :
          data?.map((project, projectIdx) => (
            <li key={projectIdx} className="flex items-center justify-between space-x-3 py-4">
              <div className="flex min-w-0 flex-1 items-center space-x-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{project.name}</p>
                  <p className="truncate text-sm font-medium text-gray-500">{project.type}</p>
                </div>
              </div>


              <div className="flex-shrink-0">
                <Button
                  plain
                  href={`/project/${project.id}/edit/member`}
                  onClick={() => saveSelectProjectInfo(project.CVATOrganizationId, project.CVATOrganizationSlug, project.id)}
                  type="button"
                  className="inline-flex items-center gap-x-1.5 text-sm font-semibold leading-6 text-gray-900"
                >
                  {/* TODO: showing Add member button only for the project creator */}
                  <UserPlusIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  Add member <span className="sr-only">{project.name}</span>
                </Button>
              </div>

              <div className="flex-shrink-0">
                <Button
                  plain
                  href={`/project/${project.id}/edit/version`}
                  onClick={() => saveSelectProjectInfo(project.CVATOrganizationId, project.CVATOrganizationSlug, project.id)}
                  type="button"
                  className="inline-flex items-center gap-x-1.5 text-sm font-semibold leading-6 text-gray-900"
                >
                  <ArrowUpRightIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  Open <span className="sr-only">{project.name}</span>
                </Button>
              </div>
            </li>
          ))}
      </ul>
    </div>
  )
}

export default function Projects() {
  return (
    <DashLayout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="mx-auto max-w-2xl text-base font-semibold leading-6 text-gray-900 lg:mx-0 lg:max-w-none">
          Projects
        </h1>
        <NewProject />
        <ListProject />
      </div>
    </DashLayout>
  )
}
