import { hasProjectAccess } from "@/app/lib/validation/project";
import { JWT } from "next-auth/jwt";

export async function POST(req: Request, res: Response) {
  try {
    // TODO: Turn blacklist into whitelist
    // TODO: Add more routes to check
    const { pathname, token }: { pathname: string; token: JWT } = await req.json();
    let pathnameArray = pathname.split('/')

    switch (pathnameArray[1]) {
      case "api":
        // switch (pathnameArray[2]) {
        //   case "project":
        //     // if pathnameArray[3] is number, it is project id
        //     const projectId = parseInt(pathnameArray[3])
        //     // projectId
        //     if (!isNaN(projectId)) {
        //       switch (pathnameArray[3]) {
        //         case "members":
        //           // if pathnameArray[3] is number, it is project id
        //           const projectId = parseInt(pathnameArray[3])
        //           if (!isNaN(projectId)) {

        //           }

        //         default:
        //           return new Response(null, { status: 200 })
        //       }
        //     }

        //   default:
        //     return new Response(null, { status: 200 })
        // }
        return new Response(null, { status: 200 })

      case "project":
        // /project/*
        if (pathnameArray.length == 2) {
          return new Response(null, { status: 200 })
        }
        const projectId = parseInt(pathnameArray[2])
        // /project/[projectId]/*
        if (!isNaN(projectId)) {
          switch (pathnameArray[3]) {
            // /project/[projectId]/edit/*
            default:
              if (!(await hasProjectAccess(projectId, token))) {
                return new Response(null, { status: 403 })
              }
          }
        }
      default:
        return new Response(null, { status: 200 })
    }

  } catch (error) {
    console.error(error);
    return new Response(null, { status: 500 })
  }
}