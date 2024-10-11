'use client'
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  ChartPieIcon,
  FolderIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';



const navigation = [
  { name: 'Projects', href: '/project', icon: FolderIcon, current: false },
  { name: 'Reports', href: '/report', icon: ChartPieIcon, current: false },
  { name: 'AI Data Augmentation [Beta]', href: '', icon: PhotoIcon, current: false }
]
// const organizations = [
//   { id: 1, name: 'Heroicons', initial: 'H', current: true },
// ]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export function MobileDashNav() {
  const pathname = usePathname()

  const updatedNavigation = navigation.map((item) => ({
    ...item,
    current: pathname === item.href,
  }));

  return (
    <>
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {updatedNavigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={classNames(
                      item.current
                        ? 'bg-gray-50 text-indigo-600'
                        : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
                      'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                    )}
                  >
                    <item.icon
                      className={classNames(
                        item.current ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-600',
                        'h-6 w-6 shrink-0'
                      )}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
          <li>
            {/* <div className="text-xs font-semibold leading-6 text-gray-400">Your organizations</div>
            <ul role="list" className="-mx-2 mt-2 space-y-1">
              {organizations.map((organization) => (
                <li key={organization.name}>
                  <div
                    className={classNames(
                      organization.current
                        ? 'bg-gray-50 text-indigo-600'
                        : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
                      'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                    )}
                  >
                    <span
                      className={classNames(
                        organization.current
                          ? 'text-indigo-600 border-indigo-600'
                          : 'text-gray-400 border-gray-200 group-hover:border-indigo-600 group-hover:text-indigo-600',
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[0.625rem] font-medium bg-white'
                      )}
                    >
                      {organization.initial}
                    </span>
                    <span className="truncate">{organization.name}</span>
                  </div>
                </li>
              ))}
            </ul> */}
          </li>
        </ul>
      </nav>
    </>
  )
}

export function DesktopDashNav({
  UserSetting,
}: {
  UserSetting: any,
}) {

  const pathname = usePathname()

  const updatedNavigation = navigation.map((item) => ({
    ...item,
    current: pathname === item.href,
  }));


  return (
    <>
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {updatedNavigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={classNames(
                      item.current
                        ? 'bg-gray-50 text-indigo-600'
                        : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
                      'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                    )}
                  >
                    <item.icon
                      className={classNames(
                        item.current ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-600',
                        'h-6 w-6 shrink-0'
                      )}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
          <li>
            {/* <div className="text-xs font-semibold leading-6 text-gray-400">Your teams</div>
            <ul role="list" className="-mx-2 mt-2 space-y-1">
              {organizations.map((organization) => (
                <li key={organization.name}>
                  <div
                    className={classNames(
                      organization.current
                        ? 'bg-gray-50 text-indigo-600'
                        : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50',
                      'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                    )}
                  >
                    <span
                      className={classNames(
                        organization.current
                          ? 'text-indigo-600 border-indigo-600'
                          : 'text-gray-400 border-gray-200 group-hover:border-indigo-600 group-hover:text-indigo-600',
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border text-[0.625rem] font-medium bg-white'
                      )}
                    >
                      {organization.initial}
                    </span>
                    <span className="truncate">{organization.name}</span>
                  </div>
                </li>
              ))}
            </ul> */}
          </li>
          <li className="-mx-6 mt-auto">
            <UserSetting/>
          </li>
        </ul>
      </nav>
    </>
  )
}
