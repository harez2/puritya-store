import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Package, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface ProductAnalyticsProps {
  orders: any[];
  orderItems: any[];
  products: any[];
  categories: any[];
}

export function ProductAnalytics({ orders, orderItems, products, categories }: ProductAnalyticsProps) {
  const productSales = useMemo(() => {
    const map: Record<string, { name: string; qtySold: number; revenue: number; productId: string }> = {};
    orderItems.forEach(item => {
      const key = item.product_id || item.product_name;
      if (!map[key]) map[key] = { name: item.product_name, qtySold: 0, revenue: 0, productId: item.product_id };
      map[key].qtySold += item.quantity;
      map[key].revenue += Number(item.price) * item.quantity;
    });
    return Object.values(map);
  }, [orderItems]);

  const topSelling = useMemo(() => [...productSales].sort((a, b) => b.revenue - a.revenue).slice(0, 10), [productSales]);
  const leastSelling = useMemo(() => [...productSales].sort((a, b) => a.qtySold - b.qtySold).slice(0, 10), [productSales]);

  const neverSold = useMemo(() => {
    const soldIds = new Set(orderItems.map(i => i.product_id).filter(Boolean));
    return products.filter(p => !soldIds.has(p.id) && !p.deleted_at);
  }, [products, orderItems]);

  const categoryPerformance = useMemo(() => {
    const productCategoryMap: Record<string, string> = {};
    products.forEach(p => { if (p.category_id) productCategoryMap[p.id] = p.category_id; });
    
    const map: Record<string, { name: string; qtySold: number; revenue: number }> = {};
    orderItems.forEach(item => {
      const catId = productCategoryMap[item.product_id] || 'uncategorized';
      const cat = categories.find(c => c.id === catId);
      const name = cat?.name || 'Uncategorized';
      if (!map[catId]) map[catId] = { name, qtySold: 0, revenue: 0 };
      map[catId].qtySold += item.quantity;
      map[catId].revenue += Number(item.price) * item.quantity;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [orderItems, products, categories]);

  const stats = useMemo(() => ({
    totalProductsSold: productSales.reduce((s, p) => s + p.qtySold, 0),
    totalRevenue: productSales.reduce((s, p) => s + p.revenue, 0),
    uniqueProducts: productSales.length,
    neverSoldCount: neverSold.length,
  }), [productSales, neverSold]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Package className="h-4 w-4" /> Units Sold</div>
          <p className="text-2xl font-bold mt-1">{stats.totalProductsSold}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><TrendingUp className="h-4 w-4" /> Product Revenue</div>
          <p className="text-2xl font-bold mt-1">{formatPrice(stats.totalRevenue)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Package className="h-4 w-4" /> Unique Products Sold</div>
          <p className="text-2xl font-bold mt-1">{stats.uniqueProducts}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><AlertTriangle className="h-4 w-4" /> Never Sold</div>
          <p className="text-2xl font-bold mt-1">{stats.neverSoldCount}</p>
        </CardContent></Card>
      </div>

      {/* Category Performance Chart */}
      <Card>
        <CardHeader><CardTitle className="text-base">Revenue by Category</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={categoryPerformance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" fontSize={12} />
              <YAxis dataKey="name" type="category" fontSize={12} width={120} />
              <Tooltip formatter={(val: number) => formatPrice(val)} />
              <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Top Selling Products</CardTitle></CardHeader>
          <CardContent><div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {topSelling.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium max-w-[200px] truncate">{p.name}</TableCell>
                    <TableCell className="text-right">{p.qtySold}</TableCell>
                    <TableCell className="text-right">{formatPrice(p.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingDown className="h-4 w-4" /> Least Selling Products</CardTitle></CardHeader>
          <CardContent><div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {leastSelling.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium max-w-[200px] truncate">{p.name}</TableCell>
                    <TableCell className="text-right">{p.qtySold}</TableCell>
                    <TableCell className="text-right">{formatPrice(p.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div></CardContent>
        </Card>
      </div>

      {neverSold.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-500" /> Products Never Sold</CardTitle></CardHeader>
          <CardContent><div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {neverSold.slice(0, 15).map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{p.name}</TableCell>
                    <TableCell className="text-right">{formatPrice(p.price)}</TableCell>
                    <TableCell className="text-right">{p.stock_quantity}</TableCell>
                    <TableCell>
                      <Badge variant={p.in_stock ? 'default' : 'destructive'}>{p.in_stock ? 'In Stock' : 'Out of Stock'}</Badge>
                    </TableCell>
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
