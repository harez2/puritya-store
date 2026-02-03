import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { HomepageSection, SectionSettings } from '@/contexts/SiteSettingsContext';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

type Category = { id: string; name: string; slug: string };
type BlogCategory = { id: string; name: string; slug: string };

const SECTION_TYPE_LABELS: Record<string, string> = {
  new_in: 'New Arrivals',
  on_sale: 'On Sale',
  featured: 'Featured Products',
  blogs: 'Blog Posts',
  custom: 'Custom Section',
};

const SECTION_TYPE_DESCRIPTIONS: Record<string, string> = {
  new_in: 'Products marked as new arrivals',
  on_sale: 'Products with discounted prices',
  featured: 'Featured products collection',
  blogs: 'Latest blog posts',
  custom: 'Custom content section',
};

interface SortableSectionItemProps {
  section: HomepageSection;
  onToggle: (id: string) => void;
  onEdit: (section: HomepageSection) => void;
  onDelete: (id: string) => void;
  isBuiltIn: boolean;
}

function SortableSectionItem({ section, onToggle, onEdit, onDelete, isBuiltIn }: SortableSectionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-4 bg-background border rounded-lg ${
        isDragging ? 'shadow-lg' : ''
      } ${!section.enabled ? 'opacity-60' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab hover:bg-muted p-1 rounded"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{section.title}</span>
          <Badge variant="secondary" className="text-xs">
            {SECTION_TYPE_LABELS[section.type] || section.type}
          </Badge>
          {isBuiltIn && (
            <Badge variant="outline" className="text-xs">
              Built-in
            </Badge>
          )}
        </div>
        {section.subtitle && (
          <p className="text-sm text-muted-foreground truncate">{section.subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onToggle(section.id)}
          title={section.enabled ? 'Disable section' : 'Enable section'}
        >
          {section.enabled ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(section)}
          title="Edit section"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        {!isBuiltIn && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(section.id)}
            title="Delete section"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}

interface HomepageSectionsEditorProps {
  sections: HomepageSection[];
  onChange: (sections: HomepageSection[]) => void;
}

const BUILT_IN_SECTION_IDS = ['new_in', 'on_sale', 'featured', 'blogs'];

export function HomepageSectionsEditor({ sections, onChange }: HomepageSectionsEditorProps) {
  const [editingSection, setEditingSection] = useState<HomepageSection | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [blogCategories, setBlogCategories] = useState<BlogCategory[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch categories and blog categories for custom section content type
  useEffect(() => {
    async function fetchData() {
      const [catRes, blogCatRes] = await Promise.all([
        supabase.from('categories').select('id, name, slug').order('name'),
        supabase.from('blog_categories').select('id, name, slug').order('name'),
      ]);
      if (catRes.data) setCategories(catRes.data);
      if (blogCatRes.data) setBlogCategories(blogCatRes.data);
    }
    fetchData();
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);

      const newSections = arrayMove(sections, oldIndex, newIndex).map((s, i) => ({
        ...s,
        display_order: i,
      }));
      onChange(newSections);
    }
  };

  const handleToggle = (id: string) => {
    const newSections = sections.map((s) =>
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    onChange(newSections);
  };

  const handleEdit = (section: HomepageSection) => {
    setEditingSection({ ...section });
    setIsAddingNew(false);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    const newSections = sections
      .filter((s) => s.id !== id)
      .map((s, i) => ({ ...s, display_order: i }));
    onChange(newSections);
  };

  const handleAddSection = (type: HomepageSection['type']) => {
    const newSection: HomepageSection = {
      id: `custom_${Date.now()}`,
      type,
      title: SECTION_TYPE_LABELS[type] || 'New Section',
      subtitle: SECTION_TYPE_DESCRIPTIONS[type] || '',
      enabled: true,
      display_order: sections.length,
      settings: {
        limit: type === 'blogs' ? 3 : 4,
        columns: 4,
        showViewAll: true,
        background: 'default',
      },
    };
    setEditingSection(newSection);
    setIsAddingNew(true);
    setIsDialogOpen(true);
  };

  const handleSaveSection = () => {
    if (!editingSection) return;

    if (isAddingNew) {
      onChange([...sections, editingSection]);
    } else {
      const newSections = sections.map((s) =>
        s.id === editingSection.id ? editingSection : s
      );
      onChange(newSections);
    }
    setIsDialogOpen(false);
    setEditingSection(null);
  };

  const updateEditingSection = <K extends keyof HomepageSection>(
    key: K,
    value: HomepageSection[K]
  ) => {
    if (!editingSection) return;
    setEditingSection({ ...editingSection, [key]: value });
  };

  const updateEditingSettings = <K extends keyof SectionSettings>(
    key: K,
    value: SectionSettings[K]
  ) => {
    if (!editingSection) return;
    setEditingSection({
      ...editingSection,
      settings: { ...editingSection.settings, [key]: value },
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Homepage Sections</CardTitle>
            <CardDescription>
              Manage and reorder the sections displayed on your homepage. Drag to reorder.
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleAddSection('new_in')}>
                New Arrivals
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddSection('on_sale')}>
                On Sale
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddSection('featured')}>
                Featured Products
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddSection('blogs')}>
                Blog Posts
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleAddSection('custom')}>
                Custom Section
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {sections.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>No sections configured yet.</p>
            <p className="text-sm mt-1">Add a section to get started.</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sections.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {sections.map((section) => (
                  <SortableSectionItem
                    key={section.id}
                    section={section}
                    onToggle={handleToggle}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    isBuiltIn={BUILT_IN_SECTION_IDS.includes(section.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>

      {/* Edit Section Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isAddingNew ? 'Add Section' : 'Edit Section'}
            </DialogTitle>
            <DialogDescription>
              Configure the section title, subtitle, and display settings.
            </DialogDescription>
          </DialogHeader>

          {editingSection && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={editingSection.title}
                  onChange={(e) => updateEditingSection('title', e.target.value)}
                  placeholder="Section title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subtitle">Subtitle</Label>
                <Input
                  id="subtitle"
                  value={editingSection.subtitle || ''}
                  onChange={(e) => updateEditingSection('subtitle', e.target.value)}
                  placeholder="Optional subtitle"
                />
              </div>

              {/* Custom section content type selection */}
              {editingSection.type === 'custom' && (
                <>
                  <div className="space-y-2">
                    <Label>Content Type</Label>
                    <Select
                      value={editingSection.settings?.contentType || ''}
                      onValueChange={(value) => updateEditingSettings('contentType', value as SectionSettings['contentType'])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select content type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="products_category">Products from Category</SelectItem>
                        <SelectItem value="reviews">Customer Reviews</SelectItem>
                        <SelectItem value="blogs_category">Blogs from Category</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {editingSection.settings?.contentType === 'products_category' && (
                    <div className="space-y-2">
                      <Label>Product Category</Label>
                      <Select
                        value={editingSection.settings?.categoryId || ''}
                        onValueChange={(value) => updateEditingSettings('categoryId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {editingSection.settings?.contentType === 'blogs_category' && (
                    <div className="space-y-2">
                      <Label>Blog Category</Label>
                      <Select
                        value={editingSection.settings?.blogCategoryId || ''}
                        onValueChange={(value) => updateEditingSettings('blogCategoryId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a blog category" />
                        </SelectTrigger>
                        <SelectContent>
                          {blogCategories.length === 0 ? (
                            <SelectItem value="" disabled>
                              No blog categories found
                            </SelectItem>
                          ) : (
                            blogCategories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              {/* Common settings for non-custom sections OR custom sections with content type selected */}
              {(editingSection.type !== 'custom' || editingSection.settings?.contentType) && (
                <>
                  <div className="space-y-2">
                    <Label>Items to Show</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[editingSection.settings?.limit || 4]}
                        min={2}
                        max={12}
                        step={1}
                        onValueChange={([value]) => updateEditingSettings('limit', value)}
                        className="flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-8">
                        {editingSection.settings?.limit || 4}
                      </span>
                    </div>
                  </div>

                  {editingSection.type !== 'blogs' && editingSection.settings?.contentType !== 'blogs_category' && editingSection.settings?.contentType !== 'reviews' && (
                    <div className="space-y-2">
                      <Label>Columns</Label>
                      <Select
                        value={String(editingSection.settings?.columns || 4)}
                        onValueChange={(value) => updateEditingSettings('columns', Number(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="2">2 Columns</SelectItem>
                          <SelectItem value="3">3 Columns</SelectItem>
                          <SelectItem value="4">4 Columns</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Background</Label>
                    <Select
                      value={editingSection.settings?.background || 'default'}
                      onValueChange={(value) => updateEditingSettings('background', value as 'default' | 'secondary' | 'accent')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="secondary">Secondary</SelectItem>
                        <SelectItem value="accent">Accent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="showViewAll">Show "View All" Button</Label>
                    <Switch
                      id="showViewAll"
                      checked={editingSection.settings?.showViewAll !== false}
                      onCheckedChange={(checked) => updateEditingSettings('showViewAll', checked)}
                    />
                  </div>

                  {editingSection.settings?.showViewAll !== false && (
                    <div className="space-y-2">
                      <Label htmlFor="viewAllLink">View All Link (optional)</Label>
                      <Input
                        id="viewAllLink"
                        value={editingSection.settings?.viewAllLink || ''}
                        onChange={(e) => updateEditingSettings('viewAllLink', e.target.value)}
                        placeholder="Leave empty for default"
                      />
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="enabled">Enabled</Label>
                <Switch
                  id="enabled"
                  checked={editingSection.enabled}
                  onCheckedChange={(checked) => updateEditingSection('enabled', checked)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSection}>
              {isAddingNew ? 'Add Section' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
