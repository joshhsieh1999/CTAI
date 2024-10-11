import { Prisma, PrismaClient } from '@prisma/client'
import assert from 'assert'
import { env } from 'process'
import { parseCookies, randomString } from '../app/lib/utils'

const prisma = new PrismaClient()

const roles = ['admin', 'manager', 'user']
const NUM_RECORDS = 6
const NUM_ORGANIZATIONS = 2
interface IModel {
  modelName: string,
  modelType: string,
  framework: string,
}

// make sure each organization has at least 2 users
// so that we can invite one user to another user's project
assert((NUM_RECORDS / NUM_ORGANIZATIONS) >= 2 && NUM_RECORDS % NUM_ORGANIZATIONS == 0, 'NUM_RECORDS must be a multiple of NUM_ORGANIZATIONS')

async function main() {
  console.log('cleanup database...')
  const modelNames = Prisma.dmmf.datamodel.models.map((model) => model.name);

  for (let i = 0; i < 10; i++) {
    try {
      await Promise.all(
        modelNames.map(async (modelName) => {
          await (prisma as any)[modelName].deleteMany()
          await prisma.$executeRawUnsafe(`ALTER TABLE ${modelName} AUTO_INCREMENT = 1;`)
        })
      );
    } catch (error) {
      console.error(error)
      continue
    }
    break
  }

  // instantiate models
  const models: IModel[] = [
    { modelName: 'yolov5', modelType: 'Object Detection', framework: 'Pytorch' },
  ]


  console.log('cleanup ok')

  console.log('creating group 1 (CVAT independent)...')
  await Promise.all([
    createRole(roles),
    createOrganization(NUM_ORGANIZATIONS),
    createModel(models),
    createDataset(NUM_RECORDS),
  ]).then(() => console.log('group 1 created!'))

  console.log('creating group 2...')
  const [userStatus, _] = await Promise.all([
    createUsers(NUM_RECORDS),
    createTraining(NUM_RECORDS, models.length),
  ])
  console.log('group 2 create ok')

  console.log('login users...')
  const [userFullStatus] = await Promise.all([
    loginUsers(userStatus),
  ])

  console.log('creating group 3...')
  const [createdProjects] = await Promise.all([
    createProject(userFullStatus),
  ])
  console.log('group 3 create ok')

  console.log('creating group 4...')
  await Promise.all([
    // project version already created by project
    createProjectMember(userFullStatus, createdProjects),
  ]).then(() => console.log('group 3 create ok'))

  console.log('All data 🌱🌱🌱🌱 !')
  console.log('Happy Testing!')
}
main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })


async function createRole(roles: string[]) {
  const records = roles.map((role) => ({
    id: roles.indexOf(role) + 1,
    name: role,
  }));
  return prisma.role.createMany({ data: records })
    .then(() => console.log('role create ok'))
}

async function createOrganization(num: number) {
  const records = Array.from({ length: num }, (_, i) => i + 1).map((i) => ({
    id: i,
    name: `organization_${i}`,
    uniformNumber: Number(`${87870000 + i}`),
  }));
  return prisma.organization.createMany({ data: records })
    .then(() => console.log('organization create ok'))
}

async function createModel(supportedModels: IModel[]) {
  const records = Array.from({ length: supportedModels.length }, (_, i) => i).map((i) => ({
    id: i + 1,
    modelName: supportedModels[i].modelName,
    modelType: supportedModels[i].modelType,
    framework: supportedModels[i].framework,
  }));
  return prisma.model.createMany({ data: records })
    .then(() => console.log('model create ok'))
}

async function createDataset(num: number) {
  const records = Array.from({ length: num }, (_, i) => i + 1).map((i) => ({
    id: i,
    labelType: 'manual',
    dataPreprocess: '{"crop":"70%"}',
    dataAugmentation: '{"rotate":"90"}',
    filePath: '/file/path',
    datasetSplit: '{"train":"0.75", "valid":"0.15", "test":"0.1"}',
  }));
  return prisma.dataset.createMany({ data: records })
    .then(() => console.log('dataset create ok'))
}

async function createUsers(num: number) {
  return Promise.all(
    Array.from({ length: num }, (_, i) => i + 1).map(async (i) => {
      const postfix = `seed_${randomString(8)}`
      const data = {
        name: `user_${postfix}`,
        email: `email_${postfix}@test.tw`,
        password: '1qaz@WSX3edc',
        organizationId: (i % NUM_ORGANIZATIONS) + 1,
        roleId: (i == 1) ? 1 : 2,
      }
      const response = await fetch(`${env.NEXTAUTH_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('failed', { cause: `${response.statusText}: ${await response.text()}` })
      }
      else {
        console.log(`user_${postfix} create ok`)
        const user = (await response.json())
        return { user: user, cookie: parseCookies(response.headers.get('Set-Cookie')!) }
      }
    })
  )
}

async function loginUsers(userStatus: { user: any; cookie: string }[]) {
  return Promise.all(
    userStatus.map(async ({ user, cookie }) => {

      const csrfTokenResponse = await fetch(`${env.NEXTAUTH_URL}/api/auth/csrf`, {
        method: 'GET',
      })


      if (!csrfTokenResponse.ok) {
        throw new Error('csrf failed', { cause: `${csrfTokenResponse.statusText}: ${await csrfTokenResponse.text()}` });
      }
      const nextCookies = parseCookies(csrfTokenResponse.headers.get('Set-Cookie')!)
      const loginCookie = `${cookie}; ${nextCookies}`;
      const { csrfToken } = await csrfTokenResponse.json();
      const data = {
        redirect: "false",
        email: user.email,
        password: '1qaz@WSX3edc',
        callbackUrl: env.NEXTAUTH_URL,
        csrfToken: csrfToken,
        json: "true",
      };

      const loginResponse = await fetch(`${env.NEXTAUTH_URL}/api/auth/callback/credentials?`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': loginCookie,
          'Authorization': `Token ${user.CVATAuthToken}`
        },
        body: JSON.stringify(data),
      });
      if (!loginResponse.ok) {
        throw new Error('Login failed', { cause: `${loginResponse.statusText}: ${await loginResponse.text()}` });
      } else {
        return { user: user, cookie: `${cookie}; ${parseCookies(loginResponse.headers.get('Set-Cookie')!)}` };
      }
    })
  )
}

async function createTraining(num: number, numModels: number) {
  const records = Array.from({ length: num }, (_, i) => i + 1).map((i) => ({
    id: i,
    modelId: (i % numModels) + 1,
    modelParams: '{"epochs":"100", "batchSize": 8, "learningRate":"0.001"}',
    result: '{"mAP":"0.9"}',
    startedAt: new Date(),
    completedAt: new Date(),
  }));
  return prisma.training.createMany({ data: records })
    .then(() => console.log('dataset create ok'))
}

async function createProject(userFullStatus: { user: any; cookie: string }[]) {
  return Promise.all(
    userFullStatus.map(async ({ user, cookie }) => {
      const data = {
        name: `project_seed_${randomString(8)}`,
        taskType: "Object Detection"
      }
      const response = await fetch(`${env.NEXTAUTH_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookie,
          'Authorization': `Token ${user.CVATAuthToken}`
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('failed', { cause: `${response.statusText}: ${await response.text()}` })
      }
      else {
        console.log(`${data.name} create ok`)
        const { id } = (await response.json())
        return Number(id)
      }
    })
  )
}

async function createProjectMember(userFullStatus: { user: any; cookie: string }[], createdProjects: number[]) {
  for (let i = 0; i < NUM_RECORDS; i++) {
    const memberId = userFullStatus[(i + NUM_ORGANIZATIONS) % NUM_RECORDS].user.id;

    const data = { memberId: memberId };
    try {
      const response = await fetch(`${env.NEXTAUTH_URL}/api/projects/${createdProjects[i]}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': userFullStatus[i].cookie,
          'Authorization': `Token ${userFullStatus[i].user.CVATAuthToken}`
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('failed', { cause: `${response.statusText}: ${await response.text()}` });
      } else {
        console.log(`Membership ${userFullStatus[i].user.id} <-> ${memberId} create OK`);
      }
    } catch (error: any) {
      console.error(`Error creating member for user ${userFullStatus[i].user.name}: ${error} ${error.cause}`);
    }
  }
}
