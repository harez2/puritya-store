import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, MoreHorizontal, Pencil, Trash2, Zap, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  compare_at_price: number | null;
  images: string[] | null;
  in_stock: boolean | null;
  stock_quantity: number;
  low_stock_threshold: number;
}

interface SortableProductRowProps {
  product: Product;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onQuickEdit: () => void;
  onFullEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  formatCurrency: (amount: number) => string;
  isDragDisabled?: boolean;
}

export function SortableProductRow({
  product,
  isSelected,
  onSelect,
  onQuickEdit,
  onFullEdit,
  onDuplicate,
  onDelete,
  formatCurrency,
  isDragDisabled = false,
}: SortableProductRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: product.id,
    disabled: isDragDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b last:border-0 hover:bg-muted/50 ${isSelected ? 'bg-muted/30' : ''} ${isDragging ? 'bg-muted' : ''}`}
    >
      <td className="py-3 px-2 w-8">
        {!isDragDisabled && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground touch-none"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
      </td>
      <td className="py-3 px-2">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(checked === true)}
        />
      </td>
      <td className="py-3 px-2">
        <div className="flex items-center gap-3">
          {product.images && product.images[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="h-10 w-10 rounded object-cover bg-muted"
            />
          ) : (
            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
              No img
            </div>
          )}
          <div>
            <p className="font-medium">{product.name}</p>
            <p className="text-sm text-muted-foreground">{product.slug}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-2">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          product.in_stock 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {product.in_stock ? 'In Stock' : 'Out of Stock'}
        </span>
      </td>
      <td className="py-3 px-2 text-center">
        <div className="flex flex-col items-center">
          <span className={`font-medium ${
            product.stock_quantity <= product.low_stock_threshold
              ? 'text-destructive'
              : ''
          }`}>
            {product.stock_quantity}
          </span>
          {product.stock_quantity <= product.low_stock_threshold && product.stock_quantity > 0 && (
            <span className="text-xs text-destructive">Low Stock</span>
          )}
        </div>
      </td>
      <td className="py-3 px-2 text-right">
        <div>
          <p className="font-medium">{formatCurrency(product.price)}</p>
          {product.compare_at_price && (
            <p className="text-sm text-muted-foreground line-through">
              {formatCurrency(product.compare_at_price)}
            </p>
          )}
        </div>
      </td>
      <td className="py-3 px-2 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onQuickEdit}>
              <Zap className="h-4 w-4 mr-2" />
              Quick Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onFullEdit}>
              <Pencil className="h-4 w-4 mr-2" />
              Full Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
