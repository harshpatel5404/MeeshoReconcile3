import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Pencil, Save, X, RefreshCw, FileText, DollarSign, Hash, 
  Calendar, Search, Filter, SortAsc, SortDesc 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';

interface ColumnStructure {
  name: string;
  type: 'text' | 'number' | 'currency' | 'date' | 'percentage';
  required: boolean;
  description?: string;
}

interface DynamicTableProps {
  title: string;
  dataType: 'products' | 'orders';
  columns: ColumnStructure[];
  showSearch?: boolean;
  showFilters?: boolean;
  editable?: boolean;
}

interface DynamicRow {
  id: string;
  [key: string]: any;
}

const getColumnIcon = (type: ColumnStructure['type']) => {
  switch (type) {
    case 'currency':
      return <DollarSign className="w-4 h-4 text-green-500" />;
    case 'number':
      return <Hash className="w-4 h-4 text-blue-500" />;
    case 'date':
      return <Calendar className="w-4 h-4 text-purple-500" />;
    case 'percentage':
      return <div className="w-4 h-4 text-orange-500 font-bold text-xs">%</div>;
    default:
      return <FileText className="w-4 h-4 text-gray-500" />;
  }
};

const formatCellValue = (value: any, type: ColumnStructure['type']) => {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground italic">—</span>;
  }

  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Number(value) || 0);
    
    case 'number':
      return new Intl.NumberFormat('en-IN').format(Number(value) || 0);
    
    case 'percentage':
      return `${(Number(value) || 0).toFixed(1)}%`;
    
    case 'date':
      return new Date(value).toLocaleDateString('en-IN');
    
    default:
      return String(value);
  }
};

export default function DynamicTable({ 
  title, 
  dataType, 
  columns, 
  showSearch = true, 
  showFilters = false,
  editable = true 
}: DynamicTableProps) {
  const [editingCell, setEditingCell] = useState<{ rowId: string; column: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Fetch dynamic data
  const { data: rows = [], isLoading, error } = useQuery<DynamicRow[]>({
    queryKey: [`/api/${dataType}-dynamic`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/${dataType}-dynamic`, undefined, token);
      return response.json();
    },
    enabled: !!token,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      const response = await apiRequest('PUT', `/api/${dataType}-dynamic/${id}`, data, token);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/${dataType}-dynamic`] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/live-metrics'] });
      setEditingCell(null);
      setEditValue('');
    },
  });

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = rows;

    // Apply search filter
    if (searchTerm) {
      filtered = rows.filter(row =>
        Object.values(row).some(value =>
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply sorting
    if (sortColumn) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        // Handle different data types
        let comparison = 0;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [rows, searchTerm, sortColumn, sortDirection]);

  const handleSort = (columnName: string) => {
    if (sortColumn === columnName) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnName);
      setSortDirection('asc');
    }
  };

  const startEditing = (rowId: string, column: string, currentValue: any) => {
    if (!editable) return;
    setEditingCell({ rowId, column });
    setEditValue(String(currentValue || ''));
  };

  const saveEdit = async () => {
    if (!editingCell) return;

    const { rowId, column } = editingCell;
    const columnDef = columns.find(col => col.name === column);
    
    let processedValue: any = editValue;
    
    // Process value based on column type
    if (columnDef?.type === 'number' || columnDef?.type === 'currency' || columnDef?.type === 'percentage') {
      processedValue = parseFloat(editValue) || 0;
    }

    updateMutation.mutate({
      id: rowId,
      data: { [column]: processedValue }
    });
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  if (isLoading) {
    return (
      <Card className="modern-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="animate-pulse bg-muted h-6 w-32 rounded"></div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-muted h-12 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="modern-card border-destructive">
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            <p className="font-semibold">Failed to load {title.toLowerCase()}</p>
            <p className="text-sm mt-1">Please try refreshing the page</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="modern-card hover-lift">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            {title}
            <Badge variant="outline" className="ml-2">
              {processedData.length} {processedData.length === 1 ? 'item' : 'items'}
            </Badge>
          </CardTitle>
          
          {showSearch && (
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={`Search ${title.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full sm:w-64"
              />
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {processedData.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-muted-foreground">No {title.toLowerCase()} found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {searchTerm ? 'Try adjusting your search' : `Upload ${dataType} data to get started`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead 
                      key={column.name}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort(column.name)}
                    >
                      <div className="flex items-center gap-2">
                        {getColumnIcon(column.type)}
                        <span className="font-semibold">{column.name}</span>
                        {sortColumn === column.name && (
                          sortDirection === 'asc' ? 
                            <SortAsc className="w-4 h-4" /> : 
                            <SortDesc className="w-4 h-4" />
                        )}
                        {column.required && (
                          <span className="text-red-500 text-xs">*</span>
                        )}
                      </div>
                    </TableHead>
                  ))}
                  {editable && <TableHead className="w-20">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {processedData.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/30">
                    {columns.map((column) => {
                      const isEditing = editingCell?.rowId === row.id && editingCell?.column === column.name;
                      const value = row[column.name];
                      
                      return (
                        <TableCell key={`${row.id}-${column.name}`} className="relative">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit();
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                className="h-8 text-sm"
                                autoFocus
                                type={column.type === 'number' || column.type === 'currency' || column.type === 'percentage' ? 'number' : 'text'}
                              />
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={saveEdit}
                                  disabled={updateMutation.isPending}
                                >
                                  <Save className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0"
                                  onClick={cancelEdit}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div 
                              className={`${editable ? 'cursor-pointer hover:bg-muted rounded px-2 py-1' : ''} transition-colors`}
                              onClick={() => startEditing(row.id, column.name, value)}
                            >
                              {formatCellValue(value, column.type)}
                            </div>
                          )}
                        </TableCell>
                      );
                    })}
                    
                    {editable && (
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            const firstEditableColumn = columns[0];
                            startEditing(row.id, firstEditableColumn.name, row[firstEditableColumn.name]);
                          }}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}