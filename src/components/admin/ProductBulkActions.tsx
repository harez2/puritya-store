import { useState, useRef } from 'react';
import { Download, Upload, Loader2, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  images: string[] | null;
  sizes: string[] | null;
  colors: string[] | null;
  in_stock: boolean | null;
  featured: boolean | null;
  new_arrival: boolean | null;
  category_id: string | null;
  stock_quantity: number;
  low_stock_threshold: number;
}

interface Category {
  id: string;
  name: string;
}

interface ProductBulkActionsProps {
  products: Product[];
  categories: Category[];
  onImportComplete: () => void;
}

export function ProductBulkActions({ products, categories, onImportComplete }: ProductBulkActionsProps) {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return '';
    const category = categories.find(c => c.id === categoryId);
    return category?.name || '';
  };

  const getCategoryId = (categoryName: string) => {
    const category = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
    return category?.id || null;
  };

  const escapeCSV = (value: string | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const headers = [
        'name',
        'slug',
        'description',
        'price',
        'compare_at_price',
        'category',
        'images',
        'sizes',
        'colors',
        'stock_quantity',
        'low_stock_threshold',
        'in_stock',
        'featured',
        'new_arrival'
      ];

      const rows = products.map(product => [
        escapeCSV(product.name),
        escapeCSV(product.slug),
        escapeCSV(product.description),
        product.price,
        product.compare_at_price || '',
        escapeCSV(getCategoryName(product.category_id)),
        escapeCSV(product.images?.join('|') || ''),
        escapeCSV(product.sizes?.join('|') || ''),
        escapeCSV(product.colors?.join('|') || ''),
        product.stock_quantity ?? 0,
        product.low_stock_threshold ?? 5,
        product.in_stock ? 'true' : 'false',
        product.featured ? 'true' : 'false',
        product.new_arrival ? 'true' : 'false'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `products-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${products.length} products`);
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export products');
    } finally {
      setExporting(false);
    }
  };

  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          currentField += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          currentField += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          currentRow.push(currentField.trim());
          currentField = '';
        } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
          currentRow.push(currentField.trim());
          if (currentRow.some(field => field !== '')) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentField = '';
          if (char === '\r') i++;
        } else {
          currentField += char;
        }
      }
    }

    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField.trim());
      if (currentRow.some(field => field !== '')) {
        rows.push(currentRow);
      }
    }

    return rows;
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportResults(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      if (rows.length < 2) {
        toast.error('CSV file is empty or has no data rows');
        return;
      }

      const headers = rows[0].map(h => h.toLowerCase().trim());
      const dataRows = rows.slice(1);

      const requiredHeaders = ['name', 'price'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        toast.error(`Missing required columns: ${missingHeaders.join(', ')}`);
        return;
      }

      const getIndex = (name: string) => headers.indexOf(name);
      const getValue = (row: string[], name: string) => {
        const idx = getIndex(name);
        return idx >= 0 ? row[idx] : '';
      };

      let successCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = i + 2;

        try {
          const name = getValue(row, 'name');
          const priceStr = getValue(row, 'price');

          if (!name) {
            errors.push(`Row ${rowNum}: Missing product name`);
            continue;
          }

          const price = parseFloat(priceStr);
          if (isNaN(price) || price < 0) {
            errors.push(`Row ${rowNum}: Invalid price "${priceStr}"`);
            continue;
          }

          const categoryName = getValue(row, 'category');
          const categoryId = categoryName ? getCategoryId(categoryName) : null;

          const images = getValue(row, 'images');
          const sizes = getValue(row, 'sizes');
          const colors = getValue(row, 'colors');
          const compareAtPrice = getValue(row, 'compare_at_price');

          const stockQuantityStr = getValue(row, 'stock_quantity');
          const lowStockThresholdStr = getValue(row, 'low_stock_threshold');

          const productData = {
            name,
            slug: getValue(row, 'slug') || generateSlug(name),
            description: getValue(row, 'description') || null,
            price,
            compare_at_price: compareAtPrice ? parseFloat(compareAtPrice) : null,
            category_id: categoryId,
            images: images ? images.split('|').map(s => s.trim()).filter(Boolean) : [],
            sizes: sizes ? sizes.split('|').map(s => s.trim()).filter(Boolean) : [],
            colors: colors ? colors.split('|').map(s => s.trim()).filter(Boolean) : [],
            stock_quantity: stockQuantityStr ? parseInt(stockQuantityStr, 10) : 0,
            low_stock_threshold: lowStockThresholdStr ? parseInt(lowStockThresholdStr, 10) : 5,
            in_stock: getValue(row, 'in_stock').toLowerCase() !== 'false',
            featured: getValue(row, 'featured').toLowerCase() === 'true',
            new_arrival: getValue(row, 'new_arrival').toLowerCase() === 'true',
          };

          const { error } = await supabase.from('products').insert(productData);

          if (error) {
            if (error.code === '23505') {
              errors.push(`Row ${rowNum}: Product with slug "${productData.slug}" already exists`);
            } else {
              errors.push(`Row ${rowNum}: ${error.message}`);
            }
          } else {
            successCount++;
          }
        } catch (err: any) {
          errors.push(`Row ${rowNum}: ${err.message}`);
        }
      }

      setImportResults({ success: successCount, errors });
      
      if (successCount > 0) {
        toast.success(`Imported ${successCount} products`);
        onImportComplete();
      }
      
      if (errors.length > 0) {
        setIsImportDialogOpen(true);
      }
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error('Failed to import products: ' + error.message);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'name',
      'slug',
      'description',
      'price',
      'compare_at_price',
      'category',
      'images',
      'sizes',
      'colors',
      'stock_quantity',
      'low_stock_threshold',
      'in_stock',
      'featured',
      'new_arrival'
    ];

    const exampleRow = [
      'Example Product',
      'example-product',
      'This is a sample product description',
      '1999',
      '2499',
      categories[0]?.name || 'Category Name',
      'https://example.com/image1.jpg|https://example.com/image2.jpg',
      'S|M|L|XL',
      'Red|Blue|Green',
      '50',
      '5',
      'true',
      'false',
      'true'
    ];

    const csvContent = [headers.join(','), exampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'products-import-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleImport}
        className="hidden"
      />

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={exporting || products.length === 0}
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Export CSV
        </Button>
        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
        >
          {importing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          Import CSV
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={downloadTemplate}
          className="text-muted-foreground"
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Template
        </Button>
      </div>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Results</DialogTitle>
            <DialogDescription>
              {importResults && (
                <span className="text-foreground">
                  Successfully imported {importResults.success} product(s)
                  {importResults.errors.length > 0 && ` with ${importResults.errors.length} error(s)`}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {importResults?.errors && importResults.errors.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-destructive">Errors:</p>
              <div className="bg-muted rounded-md p-3 max-h-60 overflow-y-auto">
                <ul className="text-sm space-y-1">
                  {importResults.errors.map((error, index) => (
                    <li key={index} className="text-muted-foreground">
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsImportDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
