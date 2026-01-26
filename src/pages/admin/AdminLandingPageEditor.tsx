import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Save, 
  Eye, 
  Plus, 
  Trash2, 
  GripVertical,
  Type,
  Image,
  Star,
  MessageSquare,
  Zap,
  ShoppingBag,
  Settings2,
  Layout
} from 'lucide-react';
import { LandingPageSectionEditor } from '@/components/admin/LandingPageSectionEditor';
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

interface LandingPageSection {
  id: string;
  type: string;
  content: Record<string, any>;
}

interface LandingPage {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  meta_title: string | null;
  meta_description: string | null;
  og_image: string | null;
  sections: LandingPageSection[];
  header_visible: boolean;
  footer_visible: boolean;
  custom_css: string | null;
}

const SECTION_TYPES = [
  { type: 'hero', label: 'Hero', icon: Layout, description: 'Full-width header with CTA' },
  { type: 'text', label: 'Text Block', icon: Type, description: 'Rich text content section' },
  { type: 'features', label: 'Features', icon: Star, description: 'Feature grid with icons' },
  { type: 'testimonials', label: 'Testimonials', icon: MessageSquare, description: 'Customer reviews slider' },
  { type: 'cta', label: 'Call to Action', icon: Zap, description: 'Conversion-focused banner' },
  { type: 'products', label: 'Products', icon: ShoppingBag, description: 'Featured products grid' },
  { type: 'image', label: 'Image', icon: Image, description: 'Full-width image section' },
];

function SortableSectionItem({ 
  section, 
  onEdit, 
  onDelete 
}: { 
  section: LandingPageSection; 
  onEdit: () => void; 
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sectionType = SECTION_TYPES.find(t => t.type === section.type);
  const Icon = sectionType?.icon || Layout;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-background border rounded-lg group"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <Icon className="h-5 w-5 text-muted-foreground" />
      <div className="flex-1">
        <p className="font-medium capitalize">{section.type}</p>
        <p className="text-xs text-muted-foreground">
          {section.content?.headline || section.content?.title || 'Click to edit'}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminLandingPageEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<Partial<LandingPage>>({});
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('sections');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: landingPage, isLoading } = useQuery({
    queryKey: ['landing-page', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('landing_pages')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      
      // Parse sections from JSON
      const sections = Array.isArray(data.sections) 
        ? (data.sections as unknown as LandingPageSection[])
        : [];
      
      return {
        ...data,
        sections,
        status: data.status as 'draft' | 'published',
      } as LandingPage;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (landingPage) {
      setFormData(landingPage);
    }
  }, [landingPage]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<LandingPage>) => {
      const updateData = {
        ...data,
        sections: JSON.parse(JSON.stringify(data.sections || [])),
      };
      const { error } = await supabase
        .from('landing_pages')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landing-page', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-landing-pages'] });
      toast({ title: 'Changes saved' });
    },
    onError: (error) => {
      toast({ title: 'Error saving', description: error.message, variant: 'destructive' });
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const addSection = (type: string) => {
    const newSection: LandingPageSection = {
      id: crypto.randomUUID(),
      type,
      content: getDefaultContentForType(type),
    };
    
    const updatedSections = [...(formData.sections || []), newSection];
    setFormData({ ...formData, sections: updatedSections });
    setEditingSectionId(newSection.id);
  };

  const updateSection = (sectionId: string, content: Record<string, any>) => {
    const updatedSections = (formData.sections || []).map(section =>
      section.id === sectionId ? { ...section, content } : section
    );
    setFormData({ ...formData, sections: updatedSections });
  };

  const deleteSection = (sectionId: string) => {
    const updatedSections = (formData.sections || []).filter(s => s.id !== sectionId);
    setFormData({ ...formData, sections: updatedSections });
    if (editingSectionId === sectionId) {
      setEditingSectionId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const sections = formData.sections || [];
      const oldIndex = sections.findIndex(s => s.id === active.id);
      const newIndex = sections.findIndex(s => s.id === over.id);
      const newSections = arrayMove(sections, oldIndex, newIndex);
      setFormData({ ...formData, sections: newSections });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  const editingSection = (formData.sections || []).find(s => s.id === editingSectionId);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/landing-pages')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{formData.title || 'Edit Landing Page'}</h1>
              <p className="text-muted-foreground text-sm">/lp/{formData.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {formData.status === 'published' && (
              <Button variant="outline" onClick={() => window.open(`/lp/${formData.slug}`, '_blank')}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            )}
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Editor */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="sections">Sections</TabsTrigger>
                <TabsTrigger value="settings">Page Settings</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
              </TabsList>

              <TabsContent value="sections" className="space-y-4">
                {/* Section List */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Page Sections</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(formData.sections || []).length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No sections yet. Add your first section below.
                      </p>
                    ) : (
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                      >
                        <SortableContext
                          items={(formData.sections || []).map(s => s.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {(formData.sections || []).map((section) => (
                            <SortableSectionItem
                              key={section.id}
                              section={section}
                              onEdit={() => setEditingSectionId(section.id)}
                              onDelete={() => deleteSection(section.id)}
                            />
                          ))}
                        </SortableContext>
                      </DndContext>
                    )}
                  </CardContent>
                </Card>

                {/* Add Section */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Add Section
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {SECTION_TYPES.map((sectionType) => (
                        <button
                          key={sectionType.type}
                          onClick={() => addSection(sectionType.type)}
                          className="flex flex-col items-center gap-2 p-4 border rounded-lg hover:bg-muted/50 hover:border-primary transition-colors text-center"
                        >
                          <sectionType.icon className="h-6 w-6 text-muted-foreground" />
                          <span className="text-sm font-medium">{sectionType.label}</span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Settings2 className="h-4 w-4" />
                      Page Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Page Title</Label>
                        <Input
                          value={formData.title || ''}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>URL Slug</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-sm">/lp/</span>
                          <Input
                            value={formData.slug || ''}
                            onChange={(e) => setFormData({ 
                              ...formData, 
                              slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') 
                            })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <Label>Show Header</Label>
                        <p className="text-xs text-muted-foreground">Display site navigation</p>
                      </div>
                      <Switch
                        checked={formData.header_visible ?? true}
                        onCheckedChange={(checked) => setFormData({ ...formData, header_visible: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <Label>Show Footer</Label>
                        <p className="text-xs text-muted-foreground">Display site footer</p>
                      </div>
                      <Switch
                        checked={formData.footer_visible ?? true}
                        onCheckedChange={(checked) => setFormData({ ...formData, footer_visible: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between py-2">
                      <div>
                        <Label>Published</Label>
                        <p className="text-xs text-muted-foreground">Make page publicly accessible</p>
                      </div>
                      <Switch
                        checked={formData.status === 'published'}
                        onCheckedChange={(checked) => setFormData({ 
                          ...formData, 
                          status: checked ? 'published' : 'draft' 
                        })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Custom CSS</Label>
                      <Textarea
                        value={formData.custom_css || ''}
                        onChange={(e) => setFormData({ ...formData, custom_css: e.target.value })}
                        placeholder=".my-class { color: red; }"
                        rows={4}
                        className="font-mono text-sm"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="seo" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">SEO Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Meta Title</Label>
                      <Input
                        value={formData.meta_title || ''}
                        onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                        placeholder={formData.title || 'Page title'}
                      />
                      <p className="text-xs text-muted-foreground">
                        {(formData.meta_title || formData.title || '').length}/60 characters
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Meta Description</Label>
                      <Textarea
                        value={formData.meta_description || ''}
                        onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                        placeholder="A brief description for search engines..."
                        rows={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        {(formData.meta_description || '').length}/160 characters
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Social Share Image URL</Label>
                      <Input
                        value={formData.og_image || ''}
                        onChange={(e) => setFormData({ ...formData, og_image: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Section Editor Panel */}
          <div className="lg:col-span-1">
            {editingSection ? (
              <Card className="sticky top-4">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg capitalize">{editingSection.type} Settings</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setEditingSectionId(null)}>
                      Done
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <LandingPageSectionEditor
                    section={editingSection}
                    onUpdate={(content) => updateSection(editingSection.id, content)}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card className="sticky top-4">
                <CardContent className="py-12 text-center text-muted-foreground">
                  <Settings2 className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p>Select a section to edit its content</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function getDefaultContentForType(type: string): Record<string, any> {
  switch (type) {
    case 'hero':
      return {
        headline: 'Your Amazing Headline',
        subheadline: 'A compelling description that explains your value proposition',
        ctaText: 'Get Started',
        ctaLink: '/shop',
        backgroundImage: '',
        backgroundColor: '#1a1a2e',
        textColor: '#ffffff',
      };
    case 'text':
      return {
        content: '<p>Add your text content here. You can format this with rich text.</p>',
        alignment: 'center',
      };
    case 'features':
      return {
        headline: 'Why Choose Us',
        features: [
          { icon: 'star', title: 'Quality', description: 'Premium quality products' },
          { icon: 'truck', title: 'Fast Delivery', description: 'Quick shipping worldwide' },
          { icon: 'shield', title: 'Secure', description: 'Safe and secure checkout' },
        ],
      };
    case 'testimonials':
      return {
        headline: 'What Our Customers Say',
        testimonials: [
          { name: 'John Doe', role: 'Customer', content: 'Amazing product quality!', avatar: '' },
          { name: 'Jane Smith', role: 'Customer', content: 'Great customer service!', avatar: '' },
        ],
      };
    case 'cta':
      return {
        headline: 'Ready to Get Started?',
        subheadline: 'Join thousands of satisfied customers today',
        ctaText: 'Shop Now',
        ctaLink: '/shop',
        backgroundColor: '#3b82f6',
        textColor: '#ffffff',
      };
    case 'products':
      return {
        headline: 'Featured Products',
        productIds: [],
        showPrices: true,
        columns: 4,
      };
    case 'image':
      return {
        imageUrl: '',
        alt: '',
        caption: '',
        fullWidth: true,
      };
    default:
      return {};
  }
}
