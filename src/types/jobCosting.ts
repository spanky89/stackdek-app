// Job Costing Types

export type ExpenseCategory = 
  | 'materials'
  | 'equipment'
  | 'subcontractors'
  | 'permits'
  | 'fuel'
  | 'other';

export interface JobExpense {
  id: string;
  jobId: string;
  companyId: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  receiptUrl?: string;
  notes?: string;
  isBillable: boolean;
  addedBy: string;
  addedByName: string;
  createdAt: string;
}

export interface JobCostingSummary {
  revenue: {
    originalQuote: number;
    changeOrders: number;
    totalBilled: number;
    collected: number;
  };
  costs: {
    materials: number;
    equipment: number;
    subcontractors: number;
    permits: number;
    fuel: number;
    other: number;
    labor: number;
    total: number;
  };
  profit: {
    amount: number;
    margin: number; // percentage
  };
}

// Mock data for testing
export const mockJobExpenses: JobExpense[] = [
  {
    id: '1',
    jobId: 'job-1',
    companyId: 'company-1',
    category: 'materials',
    description: 'Pressure-treated lumber',
    amount: 450,
    receiptUrl: '/mock-receipt-1.jpg',
    addedBy: 'user-1',
    addedByName: 'John Smith',
    isBillable: false,
    createdAt: '2026-03-01T10:30:00Z'
  },
  {
    id: '2',
    jobId: 'job-1',
    companyId: 'company-1',
    category: 'materials',
    description: 'Deck screws & hardware',
    amount: 85,
    addedBy: 'user-1',
    addedByName: 'John Smith',
    isBillable: false,
    createdAt: '2026-03-01T10:45:00Z'
  },
  {
    id: '3',
    jobId: 'job-1',
    companyId: 'company-1',
    category: 'materials',
    description: 'Post caps & railing',
    amount: 220,
    receiptUrl: '/mock-receipt-2.jpg',
    addedBy: 'user-2',
    addedByName: 'Mike Davis',
    isBillable: false,
    createdAt: '2026-03-02T14:20:00Z'
  },
  {
    id: '4',
    jobId: 'job-1',
    companyId: 'company-1',
    category: 'equipment',
    description: 'Post hole auger rental (2 days)',
    amount: 180,
    addedBy: 'user-1',
    addedByName: 'John Smith',
    isBillable: false,
    createdAt: '2026-03-01T09:00:00Z'
  },
  {
    id: '5',
    jobId: 'job-1',
    companyId: 'company-1',
    category: 'subcontractors',
    description: 'Electrician for outdoor outlets',
    amount: 650,
    addedBy: 'owner',
    addedByName: 'You',
    isBillable: true,
    createdAt: '2026-03-03T11:30:00Z'
  },
  {
    id: '6',
    jobId: 'job-1',
    companyId: 'company-1',
    category: 'fuel',
    description: 'Gas to job site',
    amount: 55,
    addedBy: 'user-2',
    addedByName: 'Mike Davis',
    isBillable: false,
    createdAt: '2026-03-02T08:15:00Z'
  }
];

export const mockJobCostingSummary: JobCostingSummary = {
  revenue: {
    originalQuote: 5000,
    changeOrders: 800,
    totalBilled: 5800,
    collected: 5800
  },
  costs: {
    materials: 755,  // Sum of materials expenses
    equipment: 180,
    subcontractors: 650,
    permits: 0,
    fuel: 55,
    other: 0,
    labor: 1680, // From time tracking (52 hours × average $32/hr)
    total: 3320
  },
  profit: {
    amount: 2480,
    margin: 42.8
  }
};

export const categoryIcons: Record<ExpenseCategory, string> = {
  materials: '🔨',
  equipment: '🚜',
  subcontractors: '⚡',
  permits: '📝',
  fuel: '⛽',
  other: '💰'
};

export const categoryLabels: Record<ExpenseCategory, string> = {
  materials: 'Materials',
  equipment: 'Equipment',
  subcontractors: 'Subcontractors',
  permits: 'Permits',
  fuel: 'Fuel',
  other: 'Other'
};
