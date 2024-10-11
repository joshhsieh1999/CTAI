'use client'
import LoadingOverlay from '@/app/ui/loadingOverlay'; // 导入 LoadingOverlay 组件
import { Menu, Transition } from '@headlessui/react'
import { UserIcon } from '@heroicons/react/24/outline'
import { signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Fragment, useEffect, useState } from 'react'

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export function UserSetting({ isDesktop = true }) {
  const [username, setUsername] = useState('loading...')
  const [isLoading, setIsLoading] = useState(false);
  const route = useRouter()

  const userNavigation = [
    {
      name: 'Setting',
      onclick: () => {
        route.push('/setting')
      }
    },
    {
      name: 'Sign out',
      onclick: () => {
        setIsLoading(true); // 显示加载中图标
        localStorage.clear();
        signOut();
      }
    }
  ]

  useEffect(() => {
    setUsername(localStorage.getItem('username') ? localStorage.getItem('username')! : 'Unknown User')
  }, [])

  return (
    <>
      {isLoading && <LoadingOverlay />}
      <Menu as="div" className="hover:bg-gray-100 rounded-lg relative">
        <Menu.Button className="m-3 flex items-center p-1.5">
          <UserIcon className="h-8 w-8 rounded-full bg-gray-50" />
          <span className="lg:flex lg:items-center">
            <span className="ml-4 text-lg font-semibold leading-6 text-gray-900" aria-hidden="true">
              {username}
            </span>
          </span>
        </Menu.Button>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className={
            `${isDesktop ? "bottom-full" : ""} absolute right-0 z-10 mt-2.5 w-auto origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none space-y-2`
          } >
            {userNavigation.map((item) => (
              <Menu.Item key={item.name}>
                {({ active }) => (
                  <Menu.Button
                    onClick={item.onclick}
                    className={classNames(
                      active ? 'bg-gray-50' : '',
                      'block px-3 py-1 text-lg leading-6 text-gray-900'
                    )}
                  >
                    {item.name}
                  </Menu.Button>
                )}
              </Menu.Item>
            ))}
          </Menu.Items>
        </Transition>
      </Menu >
    </>
  )
}
