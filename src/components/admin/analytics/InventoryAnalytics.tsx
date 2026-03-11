import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, AlertTriangle, XCircle, Warehouse } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

interface InventoryAnalyticsProps {
  products: any[];
  categories: any[];
  orderItems: any[];
}

export function InventoryAnalytics({ products, categories, orderItems }: InventoryAnalyticsProps) {
  const activeProducts = useMemo(() => products.filter(p => !p.deleted_at), [products]);

  const stats = useMemo(() => {
    const totalStock = activeProducts.reduce((s, p) => s + (p.stock_quantity || 0), 0);
    const stockValue = activeProducts.reduce((s, p) => s + (p.stock_quantity || 0) * Number(p.price), 0);
    const lowStock = activeProducts.filter(p => p.stock_quantity > 0 && p.stock_quantity <= (p.low_stock_threshold || 5));
    const outOfStock = activeProducts.filter(p => !p.in_stock || p.stock_quantity === 0);
    return { totalStock, stockValue, lowStockCount: lowStock.length, outOfStockCount: outOfStock.length, lowStock, outOfStock };
  }, [activeProducts]);

  const categoryInventory = useMemo(() => {
    const map: Record<string, { name: string; stock: number; value: number; products: number }> = {};
    activeProducts.forEach(p => {
      const catId = p.category_id || 'uncategorized';
      const cat = categories.find(c => c.id === catId);
      const name = cat?.name || 'Uncategorized';
      if (!map[catId]) map[catId] = { name, stock: 0, value: 0, products: 0 };
      map[catId].stock += p.stock_quantity || 0;
      map[catId].value += (p.stock_quantity || 0) * Number(p.price);
      map[catId].products += 1;
    });
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [activeProducts, categories]);

  const stockMovement = useMemo(() => {
    const soldMap: Record<string, number> = {};
    orderItems.forEach(item => {
      if (item.product_id) soldMap[item.product_id] = (soldMap[item.product_id] || 0) + item.quantity;
    });
    return activeProducts.slice(0, 15).map(p => ({
      name: p.name.length > 20 ? p.name.substring(0, 20) + '…' : p.name,
      remaining: p.stock_quantity || 0,
      sold: soldMap[p.id] || 0,
    }));
  }, [activeProducts, orderItems]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Warehouse className="h-4 w-4" /> Total Stock</div>
          <p className="text-2xl font-bold mt-1">{stats.totalStock}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Package className="h-4 w-4" /> Stock Value</div>
          <p className="text-2xl font-bold mt-1">{formatPrice(stats.stockValue)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><AlertTriangle className="h-4 w-4 text-yellow-500" /> Low Stock</div>
          <p className="text-2xl font-bold mt-1">{stats.lowStockCount}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><XCircle className="h-4 w-4 text-destructive" /> Out of Stock</div>
          <p className="text-2xl font-bold mt-1">{stats.outOfStockCount}</p>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Inventory by Category</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={categoryInventory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name.length > 12 ? name.substring(0, 12) + '…' : name} ${(percent * 100).toFixed(0)}%`} labelLine>
                  {categoryInventory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(val: number) => formatPrice(val)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Stock vs Sold</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stockMovement} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" fontSize={12} />
                <YAxis dataKey="name" type="category" fontSize={10} width={100} />
                <Tooltip />
                <Bar dataKey="remaining" stackId="a" fill="hsl(var(--primary))" name="Remaining" />
                <Bar dataKey="sold" stackId="a" fill="hsl(var(--accent))" name="Sold" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {stats.lowStock.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-500" /> Low Stock Alerts</CardTitle></CardHeader>
          <CardContent><div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Threshold</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {stats.lowStock.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{p.name}</TableCell>
                    <TableCell className="text-right"><Badge variant="outline" className="text-yellow-600">{p.stock_quantity}</Badge></TableCell>
                    <TableCell className="text-right">{p.low_stock_threshold || 5}</TableCell>
                    <TableCell className="text-right">{formatPrice(p.price)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div></CardContent>
        </Card>
      )}

      {stats.outOfStock.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><XCircle className="h-4 w-4 text-destructive" /> Out of Stock Products</CardTitle></CardHeader>
          <CardContent><div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {stats.outOfStock.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{p.name}</TableCell>
                    <TableCell className="text-right">{formatPrice(p.price)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div></CardContent>
        </Card>
      )}
    </div>
  );
}
