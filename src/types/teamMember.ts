/**
 * Team Member Types
 */

export type TeamRole = 'owner' | 'manager' | 'employee'

export interface TeamMember {
  id: string
  companyId: string
  userId: string
  email: string
  fullName: string
  role: TeamRole
  isActive: boolean
  invitedAt: string
  acceptedAt?: string
  createdAt: string
}

export interface TeamInvitation {
  id: string
  companyId: string
  email: string
  role: TeamRole
  invitedBy: string
  token: string
  expiresAt: string
  createdAt: string
}

export interface TeamMemberWithStats extends TeamMember {
  jobsAssigned?: number
  hoursThisWeek?: number
  lastActive?: string
}

// Mock data for testing
export const mockTeamMembers: TeamMemberWithStats[] = [
  {
    id: '1',
    companyId: 'company-1',
    userId: 'user-1',
    email: 'john.smith@example.com',
    fullName: 'John Smith',
    role: 'owner',
    isActive: true,
    invitedAt: '2024-01-01T00:00:00Z',
    acceptedAt: '2024-01-01T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    jobsAssigned: 8,
    hoursThisWeek: 42,
    lastActive: '2024-03-03T16:30:00Z'
  },
  {
    id: '2',
    companyId: 'company-1',
    userId: 'user-2',
    email: 'sarah.johnson@example.com',
    fullName: 'Sarah Johnson',
    role: 'manager',
    isActive: true,
    invitedAt: '2024-02-01T00:00:00Z',
    acceptedAt: '2024-02-01T12:00:00Z',
    createdAt: '2024-02-01T00:00:00Z',
    jobsAssigned: 5,
    hoursThisWeek: 38,
    lastActive: '2024-03-03T15:45:00Z'
  },
  {
    id: '3',
    companyId: 'company-1',
    userId: 'user-3',
    email: 'mike.davis@example.com',
    fullName: 'Mike Davis',
    role: 'employee',
    isActive: true,
    invitedAt: '2024-02-15T00:00:00Z',
    acceptedAt: '2024-02-15T14:30:00Z',
    createdAt: '2024-02-15T00:00:00Z',
    jobsAssigned: 3,
    hoursThisWeek: 32,
    lastActive: '2024-03-03T14:20:00Z'
  },
  {
    id: '4',
    companyId: 'company-1',
    userId: 'user-4',
    email: 'emily.wilson@example.com',
    fullName: 'Emily Wilson',
    role: 'employee',
    isActive: true,
    invitedAt: '2024-03-01T00:00:00Z',
    acceptedAt: '2024-03-01T10:00:00Z',
    createdAt: '2024-03-01T00:00:00Z',
    jobsAssigned: 2,
    hoursThisWeek: 28,
    lastActive: '2024-03-03T13:10:00Z'
  },
  {
    id: '5',
    companyId: 'company-1',
    userId: 'user-5',
    email: 'robert.brown@example.com',
    fullName: 'Robert Brown',
    role: 'employee',
    isActive: false,
    invitedAt: '2024-01-15T00:00:00Z',
    acceptedAt: '2024-01-15T09:00:00Z',
    createdAt: '2024-01-15T00:00:00Z',
    jobsAssigned: 0,
    hoursThisWeek: 0,
    lastActive: '2024-02-28T17:00:00Z'
  }
]
