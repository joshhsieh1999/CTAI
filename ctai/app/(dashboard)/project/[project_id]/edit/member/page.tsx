'use client'

import { Button } from '@/app/ui/catalyst/button'
import { ConfirmDialog } from '@/app/ui/confirmDialog'
import DashLayout from '@/app/ui/dashboard/layout'
import { Listbox, Transition } from '@headlessui/react'
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid'
import { UsersIcon } from '@heroicons/react/24/outline'
import { Spinner } from "@nextui-org/react"
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Fragment, useEffect, useState } from 'react'
import { toast } from 'react-toastify'

interface Item {
  id: number
  name: string
}

interface IFfetchMembers {
  inviteMembers: any[]
  projectMembers: any[]
}

export default function EditProject() {
  const queryClient = useQueryClient();
  const [selectedMember, setSelectedMember] = useState<Item>({ id: 0, name: 'Loading ... ' });
  const params = useParams();
  const projectId = params.project_id;
  const [memberIdToDelete, setMemberIdToDelete] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const handleInvite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // 使用 selectedMember 的 id 和 name
    console.log('Inviting:', selectedMember);
    setIsInviting(true);

    // 调用 API，示例
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        memberId: selectedMember.id,
      }),
    });
    await queryClient.invalidateQueries({ queryKey: ['organizationMembers', { projectId: projectId }] });
    if (res.ok) {
      toast.success("User added successfully");
    } else {
      toast.error("Failed to add user");
    }
    setIsInviting(false);
  }

  // 显示确认对话框
  const promptDeleteMember = (memberId: any) => {
    setMemberIdToDelete(memberId);
    setIsDialogOpen(true);
  };

  const mutation = useMutation({
    mutationFn: () => {
      return fetch(`/api/projects/${projectId}/members`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: memberIdToDelete,
        }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['organizationMembers', { projectId: projectId }] });
      toast.success("User deleted successfully");
    },
    onError: (error) => {
      console.error(error);
      toast.error("Failed to delete user");
    },
    onSettled: () => {
      setIsDialogOpen(false);
    },
  });


  const fetchMembers = async () => {
    const organizationId = localStorage.getItem('organizationId');
    userId = Number(localStorage.getItem('userId'));
    const p1 = fetch(`/api/organizations/${organizationId}/users`)
      .then((res) => res.json())
      .then((data) => {
        return data.map((member: any) => {
          return { 'id': member.id, 'name': member.name }
        }).filter((member: any) => member.id != userId)
      })

    const p2 = fetch(`/api/projects/${projectId}/members`)
      .then((res) => res.json())
      .then((data) => {
        return data.map((member: any) => {
          return { 'id': member.memberId, 'name': member.member.name }
        }).filter((member: any) => member.id != userId)
      })
    const [organizationMembers, projectMembers] = await Promise.all([p1, p2])
    const inviteMembers = organizationMembers.filter((orgMem: any) => !projectMembers.some((proMem: any) => orgMem.id == proMem.id));
    return { inviteMembers: inviteMembers, projectMembers: projectMembers }
  }

  let userId: number | null;
  const { data, isLoading } = useQuery<IFfetchMembers>({
    queryKey: ['organizationMembers', { projectId: projectId }],
    queryFn: fetchMembers,
    // throwOnError: true,
  });
  return (
    <DashLayout>
      <div className="mx-auto max-w-lg">
        <div>
          <div className="text-center">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h1 className="mt-2 text-base font-semibold leading-6 text-gray-900">Add team members</h1>
            <p className="mt-1 text-sm text-gray-500">
              Anyone you add will have access to this project and all its datasets.
            </p>
          </div>
          <form onSubmit={handleInvite} className="mt-6 flex">
            <label htmlFor="username" className="sr-only">
              Email address
            </label>
            {isLoading ? <DropdownList items={[{ id: 0, name: 'Loading ... ' }]} onSelect={setSelectedMember} /> : <DropdownList key={Number(data ? data.inviteMembers.length : -1)} items={data!.inviteMembers} onSelect={setSelectedMember} />}
            <button
              type="submit"
              className="ml-4 flex-shrink-0 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              {isInviting ? <Spinner aria-label="Inviting..." /> : "Send invite"}
            </button>
          </form>
        </div>
        <div className="mt-10">
          <h3 className="text-sm font-medium text-gray-500">Team members that is already added</h3>
          <ul role="list" className="mt-4 divide-y divide-gray-200 border-b border-t border-gray-200">
            {isLoading ? 
            <div className='flex justify-center mt-10 h-screen'>
              <Spinner aria-label="Loading..." />
            </div> :
             data!.projectMembers.map((person, personIdx) => (
              <li key={personIdx} className="flex items-center justify-between space-x-3 py-4">
                <div className="flex min-w-0 flex-1 items-center space-x-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{person.name}</p>
                    {/* <p className="truncate text-sm font-medium text-gray-500">{person.name}</p> */}
                  </div>
                </div>

                <button type="button" onClick={() => promptDeleteMember(person.id)} className="group relative -mr-1 h-5 w-5 rounded-sm hover:bg-red-600/20">
                  <span className="sr-only">Remove</span>
                  <svg viewBox="0 0 14 14" className="h-5 w-5 stroke-red-700/50 group-hover:stroke-red-700/75">
                    <path d="M4 4l6 6m0-6l-6 6" />
                  </svg>
                  <span className="absolute -inset-1" />
                </button>
              </li>
            ))}
            {isDialogOpen && (
              <ConfirmDialog
                title="Delete member"
                message="Are you sure you want to delete this member?"
                confirmButtonText="Delete"
                onCancel={() => setIsDialogOpen(false)}
                onConfirm={() => mutation.mutate()}
              />
            )}
          </ul>

          <div className="mt-6 flex items-center justify-end gap-x-6">
            <Button
              href={`/project`}
              color='indigo'
              type="button"
              className="rounded-md px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600"
            >
              Complete
            </Button>
          </div>
        </div>
      </div>
    </DashLayout>
  )
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

// 在 DropdownList 组件中添加 onSelect prop
function DropdownList({ items, onSelect }: { items: Item[], onSelect: (item: Item) => void }) {
  // 如果 items 为空，显示 'No user available'
  const noUser = (items.length === 0)
  const [selected, setSelected] = useState<Item>(noUser ? { id: -1, name: 'No user available' } : items[0])
  useEffect(() => {
    // 每当 selected 变化时，调用 onSelect
    onSelect(selected);
  }, [selected.id]);

  console.log('selected:', selected)
  return (
    <Listbox value={selected} onChange={setSelected}>
      {({ open }) => (
        <>
          <div className="relative mt-2">
            <Listbox.Button className="relative w-full cursor-default rounded-md bg-white py-1.5 pl-3 pr-10 text-left text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6">
              <span className="block truncate">{selected.name}</span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </span>
            </Listbox.Button>

            <Transition
              show={open}
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                {items.map((item) => (
                  <Listbox.Option
                    key={item.id.toString()}
                    className={({ active }) =>
                      classNames(
                        active ? 'bg-indigo-600 text-white' : 'text-gray-900',
                        'relative cursor-default select-none py-2 pl-3 pr-9'
                      )
                    }
                    value={item}
                  >
                    {({ selected, active }) => (
                      <>
                        <span className={classNames(selected ? 'font-semibold' : 'font-normal', 'block truncate')}>
                          {item.name}
                        </span>

                        {selected ? (
                          <span
                            className={classNames(
                              active ? 'text-white' : 'text-indigo-600',
                              'absolute inset-y-0 right-0 flex items-center pr-4'
                            )}
                          >
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        </>
      )}
    </Listbox>
  )
}
