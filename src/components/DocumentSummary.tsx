import React from 'react';

interface DocumentSummaryProps {
  subtotal: number;
  tax: number;
  depositPaid?: number;
  showDepositPaid?: boolean;
}

export const DocumentSummary: React.FC<DocumentSummaryProps> = ({
  subtotal,
  tax,
  depositPaid = 0,
  showDepositPaid = false,
}) => {
  const totalDue = subtotal + tax - (showDepositPaid ? depositPaid : 0);

  return (
    <div className="bg-gray-50 rounded-xl p-6 mt-6">
      <div className="space-y-3">
        {/* Subtotal */}
        <div className="flex justify-between items-center text-gray-700">
          <span className="font-medium">Subtotal</span>
          <span className="font-semibold">
            ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Tax */}
        <div className="flex justify-between items-center text-gray-700">
          <span className="font-medium">Tax</span>
          <span className="font-semibold">
            ${tax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>

        {/* Deposit Paid (if applicable) */}
        {showDepositPaid && depositPaid > 0 && (
          <div className="flex justify-between items-center text-green-600">
            <span className="font-medium">Deposit Paid</span>
            <span className="font-semibold">
              -${depositPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-300 pt-3">
          {/* Total Due */}
          <div className="flex justify-between items-center">
            <span className="text-lg font-bold text-gray-900">
              {showDepositPaid && depositPaid > 0 ? 'Total Due' : 'Total'}
            </span>
            <span className="text-2xl font-bold text-gray-900">
              ${totalDue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
