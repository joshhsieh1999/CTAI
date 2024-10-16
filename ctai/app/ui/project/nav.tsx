import { usePathname } from 'next/navigation';

import { CheckIcon } from '@heroicons/react/20/solid';

const steps = [
  // {
  //   name: 'Add / Manage Members',
  //   description: 'Add and Manage members for your project.',
  //   href: '/project/edit/member',
  //   status: 'upcoming',
  // },
  {
    name: 'Add / Manage Data',
    description: 'Add and Annote data for your project.',
    href: '/project/edit/dataset',
    status: 'upcoming',
  },
  // {
  //   name: 'Data Processing',
  //   description: 'Preprocess and Augment data for your project.',
  //   href: '/project/edit/process',
  //   status: 'upcoming',
  // },
  {
    name: 'Model Setup',
    description: 'Select and Configure model for your project.',
    href: '/project/edit/model',
    status: 'upcoming',
  },
  {
    name: 'Done!',
    description: 'Train AI like counting 1, 2, 3.',
    href: '/project/edit/done',
    status: 'upcoming',
  }
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

export function MobileProjectNav() {
  const pathname = usePathname();
  const lastRoute = pathname.split('/').pop();
  const updatedSteps = steps.map((step, index) => {
    if (step.href.split('/').pop() === lastRoute) {
      return { ...step, status: 'current' };
    } else if (steps.findIndex(s => s.href.split('/').pop() === lastRoute) > index) {
      return { ...step, status: 'complete' };
    } else {
      return { ...step, status: 'upcoming' };
    }
  });

  return (
    <>
      <nav aria-label="Progress">
        <ol role="list" className="overflow-hidden">
          {updatedSteps.map((step, stepIdx) => (
            <li key={step.name} className={classNames(stepIdx !== updatedSteps.length - 1 ? 'pb-10' : '', 'relative')}>
              {step.status === 'complete' ? (
                <>
                  {stepIdx !== updatedSteps.length - 1 ? (
                    <div className="absolute left-4 top-4 -ml-px mt-0.5 h-full w-0.5 bg-indigo-600" aria-hidden="true" />
                  ) : null}
                  <a className="group relative flex items-start">
                    <span className="flex h-9 items-center">
                      <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 group-hover:bg-indigo-800">
                        <CheckIcon className="h-5 w-5 text-white" aria-hidden="true" />
                      </span>
                    </span>
                    <span className="ml-4 flex min-w-0 flex-col">
                      <span className="text-sm font-medium">{step.name}</span>
                      <span className="text-sm text-gray-500">{step.description}</span>
                    </span>
                  </a>
                </>
              ) : step.status === 'current' ? (
                <>
                  {stepIdx !== updatedSteps.length - 1 ? (
                    <div className="absolute left-4 top-4 -ml-px mt-0.5 h-full w-0.5 bg-gray-300" aria-hidden="true" />
                  ) : null}
                  <a className="group relative flex items-start" aria-current="step">
                    <span className="flex h-9 items-center" aria-hidden="true">
                      <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-indigo-600 bg-white">
                        <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                      </span>
                    </span>
                    <span className="ml-4 flex min-w-0 flex-col">
                      <span className="text-sm font-medium text-indigo-600">{step.name}</span>
                      <span className="text-sm text-gray-500">{step.description}</span>
                    </span>
                  </a>
                </>
              ) : (
                <>
                  {stepIdx !== updatedSteps.length - 1 ? (
                    <div className="absolute left-4 top-4 -ml-px mt-0.5 h-full w-0.5 bg-gray-300" aria-hidden="true" />
                  ) : null}
                  <a className="group relative flex items-start">
                    <span className="flex h-9 items-center" aria-hidden="true">
                      <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white group-hover:border-gray-400">
                        <span className="h-2.5 w-2.5 rounded-full bg-transparent group-hover:bg-gray-300" />
                      </span>
                    </span>
                    <span className="ml-4 flex min-w-0 flex-col">
                      <span className="text-sm font-medium text-gray-500">{step.name}</span>
                      <span className="text-sm text-gray-500">{step.description}</span>
                    </span>
                  </a>
                </>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  )
}

export function DesktopProjectNav({
  ReturnHome,
}: {
  ReturnHome: any,
}) {
  const pathname = usePathname();
  const lastRoute = pathname.split('/').pop();
  const updatedSteps = steps.map((step, index) => {
    if (step.href.split('/').pop() === lastRoute) {
      return { ...step, status: 'current' };
    } else if (steps.findIndex(s => s.href.split('/').pop() === lastRoute) > index) {
      return { ...step, status: 'complete' };
    } else {
      return { ...step, status: 'upcoming' };
    }
  });

  return (
    <>
      <nav className="flex flex-1 flex-col" aria-label="Progress">
        <ol role="list" className="overflow-hidden flex flex-col flex-1">
          {updatedSteps.map((step, stepIdx) => (
            <li key={step.name} className={classNames(stepIdx !== updatedSteps.length - 1 ? 'pb-10' : '', 'relative')}>
              {step.status === 'complete' ? (
                <>
                  {stepIdx !== updatedSteps.length - 1 ? (
                    <div className="absolute left-4 top-4 -ml-px mt-0.5 h-full w-0.5 bg-indigo-600" aria-hidden="true" />
                  ) : null}
                  <a className="group relative flex items-start">
                    <span className="flex h-9 items-center">
                      <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 group-hover:bg-indigo-800">
                        <CheckIcon className="h-5 w-5 text-white" aria-hidden="true" />
                      </span>
                    </span>
                    <span className="ml-4 flex min-w-0 flex-col">
                      <span className="text-sm font-medium">{step.name}</span>
                      <span className="text-sm text-gray-500">{step.description}</span>
                    </span>
                  </a>
                </>
              ) : step.status === 'current' ? (
                <>
                  {stepIdx !== updatedSteps.length - 1 ? (
                    <div className="absolute left-4 top-4 -ml-px mt-0.5 h-full w-0.5 bg-gray-300" aria-hidden="true" />
                  ) : null}
                  <a className="group relative flex items-start" aria-current="step">
                    <span className="flex h-9 items-center" aria-hidden="true">
                      <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-indigo-600 bg-white">
                        <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                      </span>
                    </span>
                    <span className="ml-4 flex min-w-0 flex-col">
                      <span className="text-sm font-medium text-indigo-600">{step.name}</span>
                      <span className="text-sm text-gray-500">{step.description}</span>
                    </span>
                  </a>
                </>
              ) : (
                <>
                  {stepIdx !== updatedSteps.length - 1 ? (
                    <div className="absolute left-4 top-4 -ml-px mt-0.5 h-full w-0.5 bg-gray-300" aria-hidden="true" />
                  ) : null}
                  <a className="group relative flex items-start">
                    <span className="flex h-9 items-center" aria-hidden="true">
                      <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white group-hover:border-gray-400">
                        <span className="h-2.5 w-2.5 rounded-full bg-transparent group-hover:bg-gray-300" />
                      </span>
                    </span>
                    <span className="ml-4 flex min-w-0 flex-col">
                      <span className="text-sm font-medium text-gray-500">{step.name}</span>
                      <span className="text-sm text-gray-500">{step.description}</span>
                    </span>
                  </a>
                </>
              )}
            </li>
          ))}

          <li className="-mx-6 mt-auto">
            <ReturnHome />
          </li>
        </ol>
      </nav>
    </>
  )
}
