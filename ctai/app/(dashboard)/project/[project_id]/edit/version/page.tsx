'use client'
import { ChevronRightIcon, QueueListIcon } from '@heroicons/react/24/outline'

import { Button } from '@/app/ui/catalyst/button'
import DashLayout from '@/app/ui/dashboard/layout'
import { Spinner } from "@nextui-org/react"
import { UseMutateFunction, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'

const statuses = {
  Editing: 'text-indigo-400 bg-indigo-400/10',
  Pending: 'text-gray-500 bg-gray-400/10',
  Training: 'text-yellow-400 bg-yellow-400/10',
  Finish: 'text-green-400 bg-green-400/10',
}
const environments = {
  Editing: 'text-indigo-400 bg-indigo-400/10 ring-indigo-400/30',
  Pending: 'text-gray-400 bg-gray-400/10 ring-gray-400/30',
  Training: 'text-yellow-400 bg-yellow-400/10 ring-yellow-400/30',
  Finish: 'text-green-400 bg-green-400/10 ring-green-400/30',
}


function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

interface FetcVersion {
  id: number
  projectId: number
  versionNum: number
  status: string
  statusText: string
  description: string
  environment: string
  createdAt: string
  updatedAt: string
  creator: {
    id: number
    name: string
    email: string
  }
}

export default function EditProject() {
  const projectId = Number(useParams().project_id)
  const queryClient = useQueryClient();
  const route = useRouter();
  const [hasEditingVersion, setHasEditingVersion] = useState(false)
  const fetchVersions = async () => {
    const response = await fetch(`/api/projects/${projectId}/versions`)
    return response.json()
  }

  const { data: versionData, isLoading } = useQuery<FetcVersion[]>({
    queryKey: ['project', projectId, 'versions'],
    queryFn: fetchVersions,
    enabled: !!projectId, // Only run the query if projectId is truthy
    // throwOnError: true,
  });
  const mutation = useMutation({
    mutationFn: () => {
      return fetch(`/api/projects/${projectId}/versions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
    },
    onSuccess: async (res: Response) => {
      toast.success("Version created successfully");
      route.push(`/project/${projectId}/edit/dataset`);
      const version = await res.json()
      localStorage.setItem('editingVersionId', version.id);
      await queryClient.invalidateQueries({ queryKey: ['project', projectId, 'versions'] });
    },
    onError: (error) => {
      console.error(error);
      toast.error("Version creation failed");
    },
  });
  return (
    <DashLayout>
      <div className="mx-auto max-w-xl">
        <div>
          <div className="text-center mb-8">
            <QueueListIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h1 className="mt-2 text-base font-semibold leading-6 text-gray-900">Check out versions</h1>
            <p className="mt-1 text-sm text-gray-500">
              Check out the versions of your project.
            </p>
          </div>
        </div>
        <ul role="list" className="divide-y divide-white/5">
          {isLoading
            ? <div className="flex justify-center items-center">
              <Spinner aria-label="Loading..." />
            </div>
            :
            <>
              <NewVersion mutate={mutation.mutate} hasEditingVersion={hasEditingVersion} />
              <VersionItem versionData={versionData!} setHasEditingVersion={setHasEditingVersion} />
            </>
          }
        </ul>
      </div>
    </DashLayout>
  )
}

function VersionItem({ versionData, setHasEditingVersion }: { versionData: FetcVersion[], setHasEditingVersion: (value: boolean) => void }) {
  const route = useRouter()
  useEffect(() => {
    setHasEditingVersion(versionData.some((version) => version.status.startsWith('Editing')))
  }, [])

  return (
    versionData.sort((a, b) => b.versionNum - a.versionNum).map((version) => (
      <li key={version.id}
        onClick={() => {
          version.status.startsWith('Editing')
            ? (localStorage.setItem('editingVersionId', String(version.id)), route.push(`/project/${version.projectId}/edit/${version.status.split(':')[1].toLowerCase()}`))
            : version.status === 'Finish'
              ? route.push(`/report/${version.projectId}/${version.id}/view`)
              : route.push(`/report/${version.projectId}/${version.id}/status`)

        }}
        className="cursor-pointer hover:bg-gray-100 rounded-lg relative flex items-center space-x-4 px-4 py-4 sm:px-6 lg:px-8">
        {/* 状态圆点 */}
        <div className={classNames(statuses[version.status.split(':')[0] as keyof typeof statuses], 'flex items-center justify-center rounded-full h-4 w-4')}>
          <div className="h-2 w-2 rounded-full bg-current" />
        </div>
        {/* 版本名称和描述 */}
        <div className="flex flex-col min-w-0 flex-auto">
          <p className="text-sm font-medium text-gray-900">Version-{version.versionNum}</p> {/* 版本名称 */}
          <div className="mt-2 flex items-center text-xs leading-5 text-gray-500">
            <p className="truncate">Created by {version.creator.name}</p> {/* 描述 */}
            <svg viewBox="0 0 2 2" className="ml-2 h-0.5 w-0.5 flex-none fill-gray-400">
              <circle cx="1" cy="1" r="1" />
            </svg>
            <p className="whitespace-nowrap ml-2">
              Last updated {formatDistanceToNow(new Date(version.updatedAt), { addSuffix: true })}
            </p>
          </div>
        </div>
        {/* 环境标签 */}
        <div
          className={classNames(
            environments[version.status.split(':')[0] as keyof typeof environments],
            'rounded-full flex-none py-1 px-2 text-xs font-medium ring-1 ring-inset'
          )}
        >
          {version.status.split(':')[0]}
        </div>
        <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
      </li >
    ))
  )
}

function NewVersion({ mutate, hasEditingVersion }: { mutate: UseMutateFunction, hasEditingVersion: boolean }) {
  return (
    <li className="relative flex items-center space-x-4 px-4 py-4 sm:px-6 lg:px-8" >
      <Button
        outline
        onClick={() => {
          hasEditingVersion
            ? toast.error("You must finish the editing version first")
            : mutate()
        }}
        type="button"
        className="cursor-pointer relative flex items-center justify-between w-11/12 rounded-lg border-2 border-dashed border-gray-300 p-4 text-left hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      >
        {/* 文字信息 */}
        <span className="block text-sm font-semibold text-gray-500">Create a new Version</span>
        {/* 图标 */}
        <svg
          className="h-12 w-12 text-gray-400 p-2"
          stroke="currentColor"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            stroke="#9CA3AF"
            d="M3 9V19.4C3 19.9601 3 20.2399 3.10899 20.4538C3.20487 20.642 3.35774 20.7952 3.5459 20.8911C3.7596 21 4.0395 21 4.59846 21H15.0001M14 13V10M14 10V7M14 10H11M14 10H17M7 13.8002V6.2002C7 5.08009 7 4.51962 7.21799 4.0918C7.40973 3.71547 7.71547 3.40973 8.0918 3.21799C8.51962 3 9.08009 3 10.2002 3H17.8002C18.9203 3 19.4801 3 19.9079 3.21799C20.2842 3.40973 20.5905 3.71547 20.7822 4.0918C21.0002 4.51962 21.0002 5.07969 21.0002 6.19978L21.0002 13.7998C21.0002 14.9199 21.0002 15.48 20.7822 15.9078C20.5905 16.2841 20.2842 16.5905 19.9079 16.7822C19.4805 17 18.9215 17 17.8036 17H10.1969C9.07899 17 8.5192 17 8.0918 16.7822C7.71547 16.5905 7.40973 16.2842 7.21799 15.9079C7 15.4801 7 14.9203 7 13.8002Z"
          />
        </svg>
      </Button>
    </li>
  )
}
