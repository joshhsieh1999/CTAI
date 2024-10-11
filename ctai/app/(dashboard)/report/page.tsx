'use client'
import {
  ChevronRightIcon,
} from '@heroicons/react/20/solid';

import DashLayout from '@/app/ui/dashboard/layout';
import { Spinner } from "@nextui-org/react";
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';


enum status {
  Pending = "Pending",
  Training = "Training",
  Finish = "Finish"
}

const statuses = {
  Pending: 'text-gray-500 bg-gray-400/10',
  Training: 'text-yellow-400 bg-yellow-400/10',
  Finish: 'text-green-400 bg-green-400/10',
}

const environments = {
  Pending: 'text-gray-400 bg-gray-400/10 ring-gray-400/30',
  Training: 'text-yellow-400 bg-yellow-400/10 ring-yellow-400/30',
  Finish: 'text-green-400 bg-green-400/10 ring-green-400/30',
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

interface User {
  name: string
}

interface Version {
  id: number
  projectId: number
  versionNum: number
  status: string
  createdAt: string
  updatedAt: string
  creator: User
}

interface Project {
  id: number
  name: string
  taskType: string
  versions: Version[]
  creator: User
}

interface RenderVersionData {
  id: number
  projectId: number
  projectName: string
  versionName: string
  versionNum: number
  taskType: string
  status: string
  createdAt: string
  updatedAt: string
  creator: string
}

const transformProjectToVersionData = (projects: Project[]): RenderVersionData[] => {
  let renderVersionData: RenderVersionData[] = [];

  for (let i = 0; i < projects.length; i++) {

    const project = projects[i];
    for (let j = 0; j < project.versions.length; j++) {

      const version = project.versions[j];
      const versionStatus = version.status.split(' ')[0]
      if (!(versionStatus in status)) continue;

      renderVersionData.push({
        id: version.id,
        projectId: project.id,
        projectName: project.name,
        versionName: `Version-${version.versionNum}`,
        versionNum: version.versionNum,
        taskType: project.taskType,
        status: version.status,
        createdAt: version.createdAt,
        updatedAt: version.updatedAt,
        creator: version.creator.name,
      });
    }
  }

  return renderVersionData;
}

const fetchVersions = async () => {
  const response = await fetch(`api/projects/versions`);
  return response.json()
}

const navigateRoutes = {
  Pending: 'status',
  Training: 'status',
  Finish: 'view',

}

export default function Reports() {
  let renderVersionData: RenderVersionData[] = [];
  const route = useRouter();
  const { data, isLoading } = useQuery<Project[]>({
    queryKey: ['versions'],
    queryFn: fetchVersions,
  });

  if (!isLoading) {
    renderVersionData = transformProjectToVersionData(data!);
  }

  return (
    <DashLayout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="mx-auto max-w-2xl mb-5 text-base font-semibold leading-6 text-gray-900 lg:mx-0 lg:max-w-none">
          Reports
        </h1>
        {/* Deployment list */}
        {isLoading ?
          <div className='flex justify-center h-screen mt-10'>
            <Spinner aria-label="Loading..." />
          </div>
          :
          (renderVersionData.length == 0 ?
            <h2 className="flex justify-center h-screen mt-10 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              No reports exist yet
            </h2>
            :
            <ul role="list" className="divide-y divide-white/5">
              {renderVersionData?.map((deployment) => (
                <li key={deployment.id} className="hover:bg-gray-100 rounded-lg relative flex items-center space-x-4 px-4 py-4 sm:px-6 lg:px-8">
                  {/* circle */}
                  <div className={classNames(statuses[deployment.status as keyof typeof statuses], 'flex items-center justify-center rounded-full h-4 w-4')}>
                    <div className="h-2 w-2 rounded-full bg-current" />
                  </div>
                  {/* version & projectname */}
                  <div className="flex flex-col min-w-0 flex-auto">
                    <h2 className="min-w-0 text-sm font-semibold leading-6 text-black">
                      <a href={`/report/${deployment.projectId}/${deployment.id}/${navigateRoutes[deployment.status as keyof typeof statuses]}`} className="flex gap-x-2">
                        <span className="truncate">{deployment.versionName}</span>
                        <span className="text-gray-500">/</span>
                        <span className="whitespace-nowrap">{deployment.projectName}</span>
                        <span className="absolute inset-0" />
                      </a>
                    </h2>
                    <div className="mt-3 flex items-center gap-x-2.5 text-xs leading-5 text-gray-500">
                      <p className="truncate">Deploys by {deployment.creator}</p>
                      <svg viewBox="0 0 2 2" className="h-0.5 w-0.5 flex-none fill-gray-400">
                        <circle cx={1} cy={1} r={1} />
                      </svg>
                      <p className="whitespace-nowrap">Updated {formatDistanceToNow(new Date(deployment.updatedAt), { addSuffix: true })}</p>
                    </div>
                  </div>
                  <div
                    className={classNames(
                      environments[deployment.status as keyof typeof environments], // Add type assertion to ensure the key is valid
                      'rounded-full flex-none py-1 px-2 text-xs font-medium ring-1 ring-inset'
                    )}
                  >
                    {deployment.status}
                  </div>
                  <ChevronRightIcon className="h-5 w-5 flex-none text-gray-500" aria-hidden="true" />
                </li>
              ))}
            </ul>)
        }

      </div>
    </DashLayout>
  )
}
