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
    description: 'Add a new team member',
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
    pin: Value.text({
      name: 'PIN',
      description: 'Login PIN for this member (4+ digits recommended). Leave blank to add without auth.',
      required: false,
      placeholder: '1234',
      default: '',
    }),
  }),
  async () => ({ name: '', slug: '', pin: '' }),
  async ({ input }) => {
    try {
      const body: Record<string, string> = {
        name: input.name.trim(),
        slug: input.slug.trim().toLowerCase(),
      }
      if (input.pin && (input.pin as string).trim()) body.pin = (input.pin as string).trim()
      const result = await apiRequest('POST', '/api/team', body)

      if (result.slug) {
        const pinNote = (input.pin && (input.pin as string).trim()) ? ' PIN has been set.' : ' No PIN set — auth will not be required until a PIN is set for at least one member.'
        return {
          version: '1' as const,
          title: 'Member Added',
          message: `${result.name} has been added. Their task list is at /list/${result.slug}.${pinNote}`,
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

// Set Timezone Action
const setTimezoneAction = Action.withInput(
  'set-timezone',
  {
    name: 'Set Timezone',
    description: 'Set the timezone for reminders and daily task resets',
    warning: null,
    allowedStatuses: 'only-running',
    group: null,
    visibility: 'enabled',
  },
  InputSpec.of({
    timezone: Value.select({
      name: 'Timezone',
      description: 'Select your timezone for reminder scheduling',
      default: 'America/Chicago',
      values: {
        'America/New_York': 'Eastern (US)',
        'America/Chicago': 'Central (US)',
        'America/Denver': 'Mountain (US)',
        'America/Los_Angeles': 'Pacific (US)',
        'America/Anchorage': 'Alaska',
        'Pacific/Honolulu': 'Hawaii',
        'America/Phoenix': 'Arizona (no DST)',
        'America/Toronto': 'Eastern (Canada)',
        'America/Winnipeg': 'Central (Canada)',
        'America/Edmonton': 'Mountain (Canada)',
        'America/Vancouver': 'Pacific (Canada)',
        'America/Mexico_City': 'Mexico City',
        'America/Sao_Paulo': 'São Paulo',
        'America/Argentina/Buenos_Aires': 'Buenos Aires',
        'Europe/London': 'London (GMT/BST)',
        'Europe/Berlin': 'Berlin (CET)',
        'Europe/Paris': 'Paris (CET)',
        'Europe/Amsterdam': 'Amsterdam (CET)',
        'Europe/Zurich': 'Zurich (CET)',
        'Europe/Madrid': 'Madrid (CET)',
        'Europe/Rome': 'Rome (CET)',
        'Europe/Stockholm': 'Stockholm (CET)',
        'Europe/Helsinki': 'Helsinki (EET)',
        'Europe/Moscow': 'Moscow (MSK)',
        'Asia/Dubai': 'Dubai (GST)',
        'Asia/Kolkata': 'India (IST)',
        'Asia/Singapore': 'Singapore (SGT)',
        'Asia/Hong_Kong': 'Hong Kong (HKT)',
        'Asia/Tokyo': 'Tokyo (JST)',
        'Asia/Seoul': 'Seoul (KST)',
        'Asia/Shanghai': 'Shanghai (CST)',
        'Australia/Sydney': 'Sydney (AEST)',
        'Australia/Melbourne': 'Melbourne (AEST)',
        'Australia/Perth': 'Perth (AWST)',
        'Pacific/Auckland': 'Auckland (NZST)',
        'UTC': 'UTC',
      },
    }),
  }),
  async () => {
    try {
      const settings = await apiRequest('GET', '/api/settings')
      return { timezone: settings.timezone || 'America/Chicago' }
    } catch {
      return { timezone: 'America/Chicago' }
    }
  },
  async ({ input }) => {
    try {
      const result = await apiRequest('PUT', '/api/settings', {
        reminder_timezone: input.timezone,
      })

      return {
        version: '1' as const,
        title: 'Timezone Updated',
        message: `Timezone set to ${input.timezone}. Reminders will fire at the configured hours in this timezone.`,
        result: null,
      }
    } catch (e) {
      return {
        version: '1' as const,
        title: 'Error',
        message: `Failed to set timezone: ${e}`,
        result: null,
      }
    }
  },
)

// Set Company Name Action
const setCompanyNameAction = Action.withInput(
  'set-company-name',
  {
    name: 'Set Company Name',
    description: 'Set the company name and tagline displayed throughout the app',
    warning: null,
    allowedStatuses: 'only-running',
    group: null,
    visibility: 'enabled',
  },
  InputSpec.of({
    companyName: Value.text({
      name: 'Company Name',
      description: 'The company name shown in headers and footers (e.g., Ten31, Unchained, Strike)',
      required: true,
      placeholder: 'Ten31',
      default: '',
    }),
    tagline: Value.text({
      name: 'Tagline',
      description: 'Short tagline shown in the footer (e.g., Investing in Freedom Tech)',
      required: false,
      placeholder: 'Investing in Freedom Tech',
      default: '',
    }),
  }),
  async () => {
    try {
      const branding = await apiRequest('GET', '/api/branding')
      return {
        companyName: branding.companyName || 'Ten31',
        tagline: branding.tagline || 'Investing in Freedom Tech',
      }
    } catch {
      return { companyName: 'Ten31', tagline: 'Investing in Freedom Tech' }
    }
  },
  async ({ input }) => {
    try {
      const body: Record<string, string> = {}
      const compName = (input.companyName || '').trim()
      const compTagline = (input.tagline || '').trim()
      if (compName) body.company_name = compName
      body.company_tagline = compTagline

      await apiRequest('PUT', '/api/settings', body)

      const displayName = (input.companyName || '').trim() || 'Ten31'
      return {
        version: '1' as const,
        title: 'Company Name Updated',
        message: `App will now display as "${displayName} Tasks". Refresh the browser to see the change.`,
        result: null,
      }
    } catch (e) {
      return {
        version: '1' as const,
        title: 'Error',
        message: `Failed to update company name: ${e}`,
        result: null,
      }
    }
  },
)

// Set Member PIN Action
const setMemberPinAction = Action.withInput(
  'set-member-pin',
  {
    name: 'Set Member PIN',
    description: 'Set or reset the login PIN for a team member. This will log them out of all devices.',
    warning: null,
    allowedStatuses: 'only-running',
    group: null,
    visibility: 'enabled',
  },
  InputSpec.of({
    slug: Value.text({
      name: 'Member Slug',
      description: 'The slug of the member (e.g., jonathan)',
      required: true,
      placeholder: 'jonathan',
      default: '',
    }),
    pin: Value.text({
      name: 'New PIN',
      description: 'New login PIN (4+ digits recommended)',
      required: true,
      placeholder: '1234',
      default: '',
    }),
  }),
  async () => ({ slug: '', pin: '' }),
  async ({ input }) => {
    try {
      const memberSlug = (input.slug || '').trim().toLowerCase()
      const memberPin = (input.pin || '').trim()
      if (!memberSlug || !memberPin) {
        return {
          version: '1' as const,
          title: 'Error',
          message: 'Both slug and PIN are required.',
          result: null,
        }
      }
      const result = await apiRequest('PUT', `/api/team/${memberSlug}/pin`, { pin: memberPin })
      if (result.pinSet) {
        return {
          version: '1' as const,
          title: 'PIN Updated',
          message: `PIN has been set for ${memberSlug}. They will need to log in again on all devices. Note: authentication is now enabled for all members.`,
          result: null,
        }
      } else {
        return {
          version: '1' as const,
          title: 'Error',
          message: result.detail || 'Failed to set PIN',
          result: null,
        }
      }
    } catch (e) {
      return {
        version: '1' as const,
        title: 'Error',
        message: `Failed to set PIN: ${e}`,
        result: null,
      }
    }
  },
)

export const actions = sdk.Actions.of()
  .addAction(setCompanyNameAction)
  .addAction(addMemberAction)
  .addAction(setMemberPinAction)
  .addAction(removeMemberAction)
  .addAction(listMembersAction)
  .addAction(setTimezoneAction)
