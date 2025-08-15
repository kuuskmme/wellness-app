import React, { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Check, RefreshCw, Download, ChevronRight, ChevronDown, Info, Trash2, Plus, Minus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ShoppingListPage = () => {
  const navigate = useNavigate();
  const [shoppingList, setShoppingList] = useState(null);
  const [originalShoppingList, setOriginalShoppingList] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [excludeItems, setExcludeItems] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showExcludeForm, setShowExcludeForm] = useState(false);
  const [removedItems, setRemovedItems] = useState(new Set());

  const generateShoppingList = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const queryParams = excludeItems ? `?excludeItems=${excludeItems}` : '';
      
      const response = await fetch(`http://localhost:5000/api/nutrition/shopping-list${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setShoppingList(data.shoppingList);
        setOriginalShoppingList(JSON.parse(JSON.stringify(data.shoppingList))); // Deep copy
        setCheckedItems(new Set()); // Reset checked items on regenerate
        setRemovedItems(new Set()); // Reset removed items
      } else {
        const error = await response.json();
        console.error('Shopping list error:', error);
        setShoppingList(null);
      }
    } catch (error) {
      console.error('Error generating shopping list:', error);
      setShoppingList(null);
    } finally {
      setLoading(false);
    }
  }, [excludeItems]);

  useEffect(() => {
    generateShoppingList();
  }, [generateShoppingList]);

  // Auto-expand categories on load
  useEffect(() => {
    if (shoppingList?.categories) {
      const allExpanded = {};
      Object.keys(shoppingList.categories).forEach(cat => {
        allExpanded[cat] = true;
      });
      setExpandedCategories(allExpanded);
    }
  }, [shoppingList]);

  const toggleItem = (itemId) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setCheckedItems(newChecked);
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const toggleAllCategories = () => {
    const allExpanded = Object.values(expandedCategories).every(v => v);
    const newState = {};
    Object.keys(shoppingList.categories).forEach(cat => {
      newState[cat] = !allExpanded;
    });
    setExpandedCategories(newState);
  };

  const clearAllChecked = () => {
    setCheckedItems(new Set());
  };

  // Format quantity for display
  const formatQuantity = (quantity, unit) => {
    if (unit === 'unit' && quantity === 1) {
      return '1';
    }
    if (unit === 'unit' || unit === 'slice' || unit === 'piece') {
      return Math.ceil(quantity).toString();
    }
    if (quantity < 10) {
      return (Math.round(quantity * 10) / 10).toString();
    }
    return Math.round(quantity).toString();
  };

  // Adjust item quantity
  const adjustQuantity = (category, itemId, change) => {
    setShoppingList(prevList => {
      const newList = JSON.parse(JSON.stringify(prevList)); // Deep copy
      const item = newList.categories[category].find(i => i.id === itemId);
      
      if (item) {
        const newQuantity = Math.max(1, item.quantity + change);
        item.quantity = newQuantity;
        item.displayQuantity = formatQuantity(newQuantity, item.unit);
      }
      
      return newList;
    });
  };

  // Remove item from list
  const removeItem = (category, itemId) => {
    setShoppingList(prevList => {
      const newList = JSON.parse(JSON.stringify(prevList)); // Deep copy
      newList.categories[category] = newList.categories[category].filter(i => i.id !== itemId);
      
      // Remove category if empty
      if (newList.categories[category].length === 0) {
        delete newList.categories[category];
      }
      
      // Recalculate total items
      newList.totalItems = Object.values(newList.categories).reduce(
        (sum, items) => sum + items.length, 0
      );
      
      return newList;
    });
    
    // Track removed items
    setRemovedItems(prev => new Set([...prev, itemId]));
    
    // Remove from checked items if it was checked
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  };

  // Restore all removed items
  const restoreRemovedItems = () => {
    if (originalShoppingList) {
      setShoppingList(JSON.parse(JSON.stringify(originalShoppingList)));
      setRemovedItems(new Set());
      setCheckedItems(new Set());
    }
  };

  const exportList = () => {
    if (!shoppingList) return;

    let text = "SHOPPING LIST\n";
    text += "=".repeat(50) + "\n";
    text += `Generated: ${new Date(shoppingList.generatedAt).toLocaleDateString()}\n`;
    text += `Week of: ${new Date(shoppingList.weekOf).toLocaleDateString()}\n\n`;

    Object.entries(shoppingList.categories).forEach(([category, items]) => {
      text += `\n${category.toUpperCase()}\n`;
      text += "-".repeat(30) + "\n";
      items.forEach(item => {
        const checked = checkedItems.has(item.id) ? "✓" : "☐";
        text += `${checked} ${item.displayQuantity || `${item.quantity} ${item.unit}`} - ${item.name}\n`;
        if (item.sources && item.sources.length > 0) {
          text += `    (for: ${item.sources.map(s => s.meal).join(', ')})\n`;
        }
      });
    });

    text += "\n" + "=".repeat(50) + "\n";
    text += `Total Items: ${shoppingList.totalItems}\n`;
    text += `Items Checked: ${checkedItems.size}/${shoppingList.totalItems}\n`;

    // Create download
    const blob = new Blob([text], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopping-list-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const getCategoryColor = (category) => {
    const colors = {
      produce: 'bg-green-50 border-green-200 text-green-800',
      proteins: 'bg-red-50 border-red-200 text-red-800',
      dairy: 'bg-blue-50 border-blue-200 text-blue-800',
      grains: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      pantry: 'bg-purple-50 border-purple-200 text-purple-800',
      frozen: 'bg-cyan-50 border-cyan-200 text-cyan-800',
      beverages: 'bg-indigo-50 border-indigo-200 text-indigo-800',
      bakery: 'bg-orange-50 border-orange-200 text-orange-800',
      snacks: 'bg-pink-50 border-pink-200 text-pink-800',
      other: 'bg-gray-50 border-gray-200 text-gray-800'
    };
    return colors[category] || colors.other;
  };

  const getCategoryIcon = (category) => {
    const icons = {
      produce: '🥬',
      proteins: '🥩',
      dairy: '🥛',
      grains: '🌾',
      pantry: '🥫',
      frozen: '❄️',
      beverages: '🥤',
      bakery: '🥖',
      snacks: '🍿',
      other: '📦'
    };
    return icons[category] || icons.other;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center items-center h-64">
            <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
            <span className="ml-3 text-lg text-gray-600">Generating shopping list...</span>
          </div>
        </div>
      </div>
    );
  }

  // No meal plan state
  if (!shoppingList && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Shopping List</h1>
            <p className="text-gray-600">Generate shopping lists from your meal plans</p>
          </div>
          
          <div className="bg-white rounded-lg shadow p-8">
            <div className="text-center">
              <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">No Active Meal Plan Found</h2>
              <p className="text-gray-500 mb-6">
                You need to generate a meal plan first before creating a shopping list.
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => navigate('/nutrition/meal-planner')}
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                >
                  Go to Meal Planner →
                </button>
                
                <div className="text-sm text-gray-500">
                  <p>Or try refreshing if you've just created a meal plan:</p>
                  <button
                    onClick={generateShoppingList}
                    className="mt-2 text-blue-600 hover:text-blue-700 underline"
                  >
                    Refresh Shopping List
                  </button>
                </div>
              </div>
              
              <div className="mt-8 p-4 bg-gray-50 rounded-lg text-left">
                <h3 className="font-semibold text-gray-700 mb-2">How it works:</h3>
                <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                  <li>Create a meal plan (daily or weekly) in the Meal Planner</li>
                  <li>The system aggregates all ingredients from your meals</li>
                  <li>Items are automatically categorized (produce, proteins, dairy, etc.)</li>
                  <li>Check off items as you shop</li>
                  <li>Export the list for easy reference</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main shopping list view
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Shopping List</h1>
          <p className="text-gray-600">
            Generated from your active meal plan • Week of {formatDate(shoppingList.weekOf)}
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <Info className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Smart Shopping List Features:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Ingredients aggregated from {shoppingList.metadata?.mealsIncluded || 0} meals across {shoppingList.metadata?.daysIncluded || 0} days</li>
                <li>Automatically categorized into {Object.keys(shoppingList.categories).length} shopping categories</li>
                <li>Adjust quantities with +/- buttons or remove items completely</li>
                <li>Check off items as you shop - progress saves locally</li>
                <li>Export as text file for offline use</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-3 items-center justify-between">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowExcludeForm(!showExcludeForm)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition flex items-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Exclude Items
              </button>
              
              <button
                onClick={toggleAllCategories}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition flex items-center"
              >
                {Object.values(expandedCategories).every(v => v) ? (
                  <>
                    <ChevronRight className="h-4 w-4 mr-2" />
                    Collapse All
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Expand All
                  </>
                )}
              </button>

              <button
                onClick={clearAllChecked}
                disabled={checkedItems.size === 0}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center"
              >
                <Check className="h-4 w-4 mr-2" />
                Clear Checked
              </button>

              {removedItems.size > 0 && (
                <button
                  onClick={restoreRemovedItems}
                  className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 transition flex items-center"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Restore {removedItems.size} Removed
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={generateShoppingList}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Regenerate
              </button>
              
              <button
                onClick={exportList}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Export List
              </button>
            </div>
          </div>

          {/* Exclude Items Form */}
          {showExcludeForm && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Items to exclude (comma-separated, e.g., salt, pepper, oil)"
                  value={excludeItems}
                  onChange={(e) => setExcludeItems(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => {
                    generateShoppingList();
                    setShowExcludeForm(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Apply
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Exclude common pantry items you already have at home
              </p>
            </div>
          )}
        </div>

        {/* Statistics Bar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">{shoppingList.totalItems}</div>
              <div className="text-sm text-gray-600">Total Items</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{checkedItems.size}</div>
              <div className="text-sm text-gray-600">Checked Off</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{removedItems.size}</div>
              <div className="text-sm text-gray-600">Removed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {shoppingList.totalItems > 0 ? Math.round((checkedItems.size / shoppingList.totalItems) * 100) : 0}%
              </div>
              <div className="text-sm text-gray-600">Complete</div>
            </div>
          </div>
        </div>

        {/* Shopping List Categories */}
        <div className="space-y-4">
          {Object.entries(shoppingList.categories).map(([category, items]) => {
            const categoryCheckedCount = items.filter(item => checkedItems.has(item.id)).length;
            const isExpanded = expandedCategories[category] !== false;
            
            return (
              <div key={category} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Category Header */}
                <div
                  className={`px-6 py-4 cursor-pointer border-l-4 ${getCategoryColor(category)}`}
                  onClick={() => toggleCategory(category)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 mr-3 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 mr-3 text-gray-500" />
                      )}
                      <span className="text-2xl mr-3">{getCategoryIcon(category)}</span>
                      <h3 className="text-lg font-semibold capitalize">{category}</h3>
                      <span className="ml-3 text-sm text-gray-500">
                        ({categoryCheckedCount}/{items.length})
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {categoryCheckedCount > 0 && (
                        <span className="text-sm font-medium text-green-600">
                          {Math.round((categoryCheckedCount / items.length) * 100)}% done
                        </span>
                      )}
                      <span className="bg-gray-100 px-3 py-1 rounded-full text-sm font-medium">
                        {items.length} items
                      </span>
                    </div>
                  </div>
                </div>

                {/* Category Items */}
                {isExpanded && (
                  <div className="px-6 pb-4">
                    <div className="grid md:grid-cols-2 gap-2">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className={`flex items-start p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition ${
                            checkedItems.has(item.id) ? 'bg-gray-50 opacity-60' : ''
                          }`}
                          onClick={() => toggleItem(item.id)}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            <div className={`w-5 h-5 border-2 rounded ${
                              checkedItems.has(item.id) 
                                ? 'bg-green-500 border-green-500' 
                                : 'border-gray-300'
                            } flex items-center justify-center`}>
                              {checkedItems.has(item.id) && (
                                <Check className="h-3 w-3 text-white" />
                              )}
                            </div>
                          </div>
                          
                          <div className="ml-3 flex-1">
                            <div className="flex items-center justify-between">
                              <div className={checkedItems.has(item.id) ? 'line-through' : ''}>
                                <span className="font-medium text-gray-900">{item.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {/* Quantity Adjustment */}
                                <div className="flex items-center border rounded">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      adjustQuantity(category, item.id, -1);
                                    }}
                                    className="p-1 hover:bg-gray-100"
                                    disabled={item.quantity <= 1}
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="px-2 text-sm min-w-[60px] text-center">
                                    {item.displayQuantity || `${item.quantity}`} {item.unit}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      adjustQuantity(category, item.id, 1);
                                    }}
                                    className="p-1 hover:bg-gray-100"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                                {/* Remove Item */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeItem(category, item.id);
                                  }}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                                  title="Remove item"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            {item.sources && item.sources.length > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                For: {item.sources.slice(0, 2).map(s => s.meal).join(', ')}
                                {item.sources.length > 2 && ` +${item.sources.length - 2} more`}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => navigate('/nutrition/meal-planner')}
            className="text-gray-600 hover:text-gray-800"
          >
            ← Back to Meal Planner
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShoppingListPage;