import { sdk } from '../sdk'

const { InputSpec, Value, Action } = sdk

const API_BASE = 'http://127.0.0.1'

async function apiRequest(method: string, path: string, body?: object): Promise<any> {
  const url = `${API_BASE}${path}`
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) {
    options.body = JSON.stringify(body)
  }
  const response = await fetch(url, options)
  return response.json()
}

// Add Team Member Action
const addMemberAction = Action.withInput(
  'add-member',
  {
    name: 'Add Team Member',
    description: 'Add a new team member to Ten31 Tasks',
    warning: null,
    allowedStatuses: 'only-running',
    group: null,
    visibility: 'enabled',
  },
  InputSpec.of({
    name: Value.text({
      name: 'Full Name',
      description: 'Display name (e.g., Jonathan)',
      required: true,
      placeholder: 'Jonathan',
      default: '',
    }),
    slug: Value.text({
      name: 'URL Slug',
      description: 'Lowercase identifier for their URL (e.g., jonathan → /list/jonathan)',
      required: true,
      placeholder: 'jonathan',
      default: '',
    }),
  }),
  async () => ({ name: '', slug: '' }),
  async ({ input }) => {
    try {
      const result = await apiRequest('POST', '/api/team', {
        name: input.name.trim(),
        slug: input.slug.trim().toLowerCase(),
      })

      if (result.slug) {
        return {
          version: '1' as const,
          title: 'Member Added',
          message: `${result.name} has been added. Their task list is at /list/${result.slug}`,
          result: null,
        }
      } else {
        return {
          version: '1' as const,
          title: 'Error',
          message: result.detail || 'Failed to add member',
          result: null,
        }
      }
    } catch (e) {
      return {
        version: '1' as const,
        title: 'Error',
        message: `Failed to add member: ${e}`,
        result: null,
      }
    }
  },
)

// Remove Team Member Action
const removeMemberAction = Action.withInput(
  'remove-member',
  {
    name: 'Remove Team Member',
    description: 'Remove a team member and all their task data',
    warning: 'This will permanently delete this member and ALL of their task history, reflections, and push subscriptions. This cannot be undone.',
    allowedStatuses: 'only-running',
    group: null,
    visibility: 'enabled',
  },
  InputSpec.of({
    slug: Value.text({
      name: 'URL Slug',
      description: 'The slug of the member to remove (e.g., jonathan)',
      required: true,
      placeholder: 'jonathan',
      default: '',
    }),
  }),
  async () => ({ slug: '' }),
  async ({ input }) => {
    try {
      const result = await apiRequest('DELETE', `/api/team/${input.slug.trim().toLowerCase()}`)

      if (result.deleted) {
        return {
          version: '1' as const,
          title: 'Member Removed',
          message: `${result.deleted} has been removed along with all their data.`,
          result: null,
        }
      } else {
        return {
          version: '1' as const,
          title: 'Error',
          message: result.detail || 'Failed to remove member',
          result: null,
        }
      }
    } catch (e) {
      return {
        version: '1' as const,
        title: 'Error',
        message: `Failed to remove member: ${e}`,
        result: null,
      }
    }
  },
)

// List Team Members Action
const listMembersAction = Action.withoutInput(
  'list-members',
  {
    name: 'List Team Members',
    description: 'View all current team members and their URLs',
    warning: null,
    allowedStatuses: 'only-running',
    group: null,
    visibility: 'enabled',
  },
  async () => {
    try {
      const members = await apiRequest('GET', '/api/team')

      if (!members || members.length === 0) {
        return {
          version: '1' as const,
          title: 'No Members',
          message: "No team members yet. Use 'Add Team Member' to get started.",
          result: null,
        }
      }

      const list = members.map((m: any) => `• ${m.name} → /list/${m.slug}`).join('\n')

      return {
        version: '1' as const,
        title: `Team Members (${members.length})`,
        message: list,
        result: null,
      }
    } catch (e) {
      return {
        version: '1' as const,
        title: 'Error',
        message: `Failed to list members: ${e}`,
        result: null,
      }
    }
  },
)

export const actions = sdk.Actions.of()
  .addAction(addMemberAction)
  .addAction(removeMemberAction)
  .addAction(listMembersAction)
