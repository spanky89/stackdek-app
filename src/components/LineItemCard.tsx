import React, { useState } from 'react';
import { UnifiedLineItem, LineItemMode } from '../types/lineItems';

interface LineItemCardProps {
  item: UnifiedLineItem;
  mode: LineItemMode;
  onUpdate?: (updated: UnifiedLineItem) => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

export const LineItemCard: React.FC<LineItemCardProps> = ({
  item,
  mode,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState<UnifiedLineItem>(item);
  const [quantityStr, setQuantityStr] = useState(String(item.quantity));
  const [priceStr, setPriceStr] = useState(String(item.unit_price));

  const subtotal = isEditing 
    ? (parseFloat(quantityStr) || 0) * (parseFloat(priceStr) || 0)
    : item.quantity * item.unit_price;

  const handleEdit = () => {
    setEditedItem(item);
    setQuantityStr(String(item.quantity));
    setPriceStr(String(item.unit_price));
    setIsEditing(true);
  };

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({
        ...editedItem,
        quantity: parseFloat(quantityStr) || 0,
        unit_price: parseFloat(priceStr) || 0,
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedItem(item);
    setQuantityStr(String(item.quantity));
    setPriceStr(String(item.unit_price));
    setIsEditing(false);
  };

  // View mode - read-only display
  if (mode === 'view' || !isEditing) {
    return (
      <div className="bg-white rounded-xl p-4 mb-3 border border-gray-200 hover:border-gray-300 transition-colors">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {/* Title or description as heading */}
            <h4 className="font-semibold text-gray-900 text-base mb-1">
              {item.title || item.description}
            </h4>
            
            {/* Description subtext (only if title exists) */}
            {item.title && (
              <p className="text-sm text-gray-600 mb-2 whitespace-pre-wrap">
                {item.description}
              </p>
            )}

            {/* Quantity and unit price */}
            <p className="text-sm text-gray-500">
              {item.quantity} × ${item.unit_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="flex items-center gap-2 ml-4">
            {/* Subtotal */}
            <div className="text-right">
              <p className="font-semibold text-gray-900">
                ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            {/* Edit mode actions */}
            {mode === 'edit' && (
              <div className="flex flex-col gap-1">
                {/* Reorder buttons */}
                <div className="flex gap-1">
                  {!isFirst && onMoveUp && (
                    <button
                      onClick={onMoveUp}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Move up"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                  )}
                  {!isLast && onMoveDown && (
                    <button
                      onClick={onMoveDown}
                      className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Move down"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Edit/Delete buttons */}
                <div className="flex gap-1">
                  <button
                    onClick={handleEdit}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  {onDelete && (
                    <button
                      onClick={onDelete}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Edit mode - inline editing
  return (
    <div className="bg-white rounded-xl p-4 mb-3 border-2 border-blue-400 shadow-md">
      <div className="space-y-3">
        {/* Title input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Item Title (optional)
          </label>
          <input
            type="text"
            value={editedItem.title || ''}
            onChange={(e) => setEditedItem({ ...editedItem, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Lawn Mowing"
          />
        </div>

        {/* Description textarea */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={editedItem.description}
            onChange={(e) => setEditedItem({ ...editedItem, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
            placeholder="Detailed description..."
          />
        </div>

        {/* Quantity and Unit Price */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity
            </label>
            <input
              type="number"
              value={quantityStr}
              onChange={(e) => setQuantityStr(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit Price ($)
            </label>
            <input
              type="number"
              value={priceStr}
              onChange={(e) => setPriceStr(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="0"
              step="0.01"
            />
          </div>
        </div>

        {/* Subtotal display */}
        <div className="pt-2 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Subtotal:</span>
            <span className="font-semibold text-gray-900">
              ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            className="flex-1 bg-black text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
