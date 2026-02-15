import React from 'react';

interface DocumentHeaderProps {
  clientName: string;
  clientContact?: string; // Email or phone
  status: string;
  documentNumber: string; // e.g., "Quote #123", "Job #456"
  date: string; // e.g., "Feb 15, 2026"
  dateLabel?: string; // e.g., "Created", "Due Date", "Completed"
}

export const DocumentHeader: React.FC<DocumentHeaderProps> = ({
  clientName,
  clientContact,
  status,
  documentNumber,
  date,
  dateLabel = 'Date',
}) => {
  // Status badge color mapping
  const getStatusColor = (status: string): string => {
    const statusLower = status.toLowerCase();
    
    // Quote statuses
    if (statusLower === 'pending') return 'bg-yellow-100 text-yellow-800';
    if (statusLower === 'accepted') return 'bg-green-100 text-green-800';
    if (statusLower === 'declined') return 'bg-red-100 text-red-800';
    
    // Job statuses
    if (statusLower === 'upcoming') return 'bg-blue-100 text-blue-800';
    if (statusLower === 'in progress') return 'bg-purple-100 text-purple-800';
    if (statusLower === 'completed') return 'bg-green-100 text-green-800';
    
    // Invoice statuses
    if (statusLower === 'unpaid') return 'bg-red-100 text-red-800';
    if (statusLower === 'paid') return 'bg-green-100 text-green-800';
    
    // Default
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-xl p-6 mb-4 border border-gray-200">
      <div className="flex justify-between items-start">
        {/* Left: Client Info */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            {clientName}
          </h2>
          {clientContact && (
            <p className="text-sm text-gray-600">
              {clientContact}
            </p>
          )}
        </div>

        {/* Right: Status + Document Number */}
        <div className="text-right">
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-2 ${getStatusColor(status)}`}>
            {status}
          </span>
          <p className="text-sm text-gray-600 font-medium">
            {documentNumber}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {dateLabel}: {date}
          </p>
        </div>
      </div>
    </div>
  );
};
