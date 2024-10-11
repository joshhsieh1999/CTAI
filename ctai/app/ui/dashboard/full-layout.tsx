export function FullLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <div className="flex min-h-full justify-center md:px-12 lg:px-12">
        <div className="flex flex-1 flex-col bg-white px-4 py-10 shadow-2xl sm:justify-center sm:px-4">
          <main className="mx-auto w-full max-w-lg sm:px-4 md:w-128 md:max-w-lg md:px-0">
            {children}
          </main>
        </div>
      </div>
    </>
  )
}
