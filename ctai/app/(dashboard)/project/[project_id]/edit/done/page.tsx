'use client'
import { Button } from '@/app/ui/button';
import ProjectLayout from "@/app/ui/project/layout";
import { useParams } from "next/navigation";

export default function Example() {
  const params = useParams();
  const projectId = params.project_id;

  return (
    <ProjectLayout>
      <div className="mx-auto max-w-2xl text-center">
        <div className="bg-white px-6 py-24 sm:py-32 lg:px-8">
          <svg className="mx-auto w-16 sm:w-20 lg:w-24 h-auto mb-4"
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" enableBackground="new 0 0 64 64"><path d="M32,2C15.431,2,2,15.432,2,32c0,16.568,13.432,30,30,30c16.568,0,30-13.432,30-30C62,15.432,48.568,2,32,2z M25.025,50
	l-0.02-0.02L24.988,50L11,35.6l7.029-7.164l6.977,7.184l21-21.619L53,21.199L25.025,50z" fill="#2563EB"
            /></svg>

          <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">All Done!</h2>
          <p className="mt-6 mb-4 text-lg leading-8 text-gray-600">
            You just created a new version!<br />
            The AI model is traning now. You can check the progress in the version page.
          </p>
          <Button type="button" variant="solid" color="blue" className="w-auto h-auto"
          href={`/project/${projectId}/edit/version`}>
            Go to version
          </Button>
        </div>
      </div>
    </ProjectLayout >
  )
}
