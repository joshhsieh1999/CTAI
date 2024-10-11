'use client'

import DashLayout from '@/app/ui/dashboard/layout'
import { Button, Dropdown, DropdownItem, DropdownMenu, DropdownTrigger, Spinner } from "@nextui-org/react"
import { useMutation } from '@tanstack/react-query'
import { Session } from 'next-auth'
import { useSession } from "next-auth/react"
import { useEffect, useMemo, useState } from "react"
import { toast } from 'react-toastify'

export default function Example() {
  const { data: session, update } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [user, setUser] = useState<Session['user']>({} as Session['user'])
  const [selectedLocale, setSelectedLocale] = useState(new Set([""]));

  const selectedValue = useMemo(
    () => Array.from(selectedLocale).join(", ").replaceAll("_", " "),
    [selectedLocale]
  );

  useEffect(() => {
    if (session && session.user) {
      setUser(session.user as Session['user'])
      setUsername(session.user.name)
      setSelectedLocale(new Set([session.user.locale]))
      // setEmail(session.user.email)
      setIsLoading(false)
    }
  }, [session])

  const mutation = useMutation({
    mutationFn: async ({ userPatch }: { userPatch: Partial<Session['user']> | { password: string } }) => {
      setIsLoading(true)

      const response = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userPatch),
      })

      if (!response.ok) {
        throw new Error(await response.text())
      }

      if ('password' in userPatch && userPatch.password) {
        if (userPatch.password.length < 8) {
          throw new Error("Password must be at least 8 characters")
        }
      }
      else {
        await update({ user: { ...user, ...userPatch } })
      }

      if ('name' in userPatch && userPatch.name) {
        localStorage.setItem('username', userPatch.name)
        setUsername(userPatch.name)
      }
      else if ('locale' in userPatch && userPatch.locale) {
        localStorage.setItem('locale', userPatch.locale)
        setSelectedLocale(new Set([userPatch.locale]))
      }
      // else if('email' in userPatch && userPatch.email){
      //   localStorage.setItem('email', userPatch.email)
      //   setEmail(userPatch.email)
      //   window.location.reload()
      // }

      return response.json()
    },
    onSuccess: async () => {
      toast.success("Updated successfully");
      window.location.reload()
    },
    onError: (error) => {
      console.error(error);
      toast.error(error.message);
    },
    onSettled: () => {
      setIsLoading(false);
    },
  }
  )

  return (
    <>
      <DashLayout>
        <main className="px-4 sm:px-6 lg:flex-auto">
          <div className="mx-auto max-w-2xl space-y-16 sm:space-y-20 lg:mx-0 lg:max-w-none">
            <h1 className="text-3xl font-bold tracking-tight mb-8 sm:-ml-1 lg:-ml-2 lg:px-0">User Settings</h1>
            {isLoading ?
              <Spinner className="flex justify-center items-center h-96" />
              :
              <>
                {/* Profile */}
                < div >
                  <h2 className="text-base font-semibold leading-7 text-gray-900">Profile</h2>
                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    This information will be displayed publicly so be careful what you share.
                  </p>

                  <dl className="mt-6 space-y-6 divide-y divide-gray-100 border-t border-gray-200 text-sm leading-6">
                    <div className="pt-6 sm:flex">
                      <dt className="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">Full name</dt>
                      <dd className="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto stroke-black">
                        <input
                          id="username"
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 rounded px-2 py-1 w-full"
                        />
                        <button
                          type="button"
                          className="font-semibold text-indigo-600 hover:text-indigo-500"
                          onClick={(e) => mutation.mutate({ userPatch: { 'name': username } })}>
                          Update
                        </button>
                      </dd>
                    </div>
                    {/* <div className="pt-6 sm:flex">
                  <dt className="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">Email address</dt>
                  <dd className="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto stroke-black">
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 rounded px-2 py-1 w-full"
                    />
                    <button
                      type="button"
                      className="font-semibold text-indigo-600 hover:text-indigo-500"
                      onClick={(e) => mutation.mutate({ userPatch: { 'email': email } })}>
                      Update
                    </button>
                  </dd>
                </div> */}
                    {/* <div className="pt-6 sm:flex">
                      <dt className="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">Change Password</dt>
                      <dd className="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto stroke-black">
                        <input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-gray-300 rounded px-2 py-1 w-full"
                        />
                        <button
                          type="button"
                          className="font-semibold text-indigo-600 hover:text-indigo-500"
                          onClick={(e) => mutation.mutate({ userPatch: { 'password': password } })}>
                          Update
                        </button>
                      </dd>
                    </div> */}
                  </dl>
                </div>

                <div>
                  <h2 className="text-base font-semibold leading-7 text-gray-900">Language</h2>
                  <p className="mt-1 text-sm leading-6 text-gray-500">
                    Choose what language to use throughout your account.
                  </p>

                  <dl className="mt-6 space-y-6 divide-y divide-gray-100 border-t border-gray-200 text-sm leading-6">
                    <div className="pt-6 sm:flex">
                      <dt className="font-medium text-gray-900 sm:w-64 sm:flex-none sm:pr-6">Language</dt>
                      <dd className="mt-1 flex justify-between gap-x-6 sm:mt-0 sm:flex-auto">
                        <Dropdown
                          type="listbox"
                        >
                          <DropdownTrigger>
                            <Button
                              variant="bordered"
                              className="capitalize"
                            >
                              {selectedValue}
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu
                            aria-label="Single selection example"
                            variant="solid"
                            disallowEmptySelection
                            selectionMode="single"
                            selectedKeys={selectedLocale}
                            onSelectionChange={(keys) => setSelectedLocale(keys as Set<string>)}
                          >
                            {/* TODO: fetch all available locales from i18n */}
                            <DropdownItem key="en-US">en-US</DropdownItem>
                            <DropdownItem key="zh-CN">zh-CN</DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
                        <button type="button"
                          className="font-semibold text-indigo-600 hover:text-indigo-500"
                          onClick={(e) => mutation.mutate({ userPatch: { 'locale': selectedLocale.values().next().value } })}
                        >
                          Update
                        </button>
                      </dd>
                    </div>
                  </dl>
                </div>
              </>
            }
          </div>
        </main>
      </DashLayout >
    </>
  )
}
