-- Insert default menu settings
INSERT INTO public.site_settings (key, value, category) VALUES
-- Header Menu
('header_menu', '[
  {"id": "1", "label": "New Arrivals", "url": "/shop?filter=new", "type": "internal"},
  {"id": "2", "label": "Shop All", "url": "/shop", "type": "internal"},
  {"id": "3", "label": "Dresses", "url": "/shop?category=dresses", "type": "internal"},
  {"id": "4", "label": "Tops", "url": "/shop?category=tops", "type": "internal"},
  {"id": "5", "label": "Accessories", "url": "/shop?category=accessories", "type": "internal"}
]'::jsonb, 'menus'),

-- Footer Shop Links
('footer_shop_menu', '[
  {"id": "1", "label": "New Arrivals", "url": "/shop?filter=new", "type": "internal"},
  {"id": "2", "label": "Dresses", "url": "/shop?category=dresses", "type": "internal"},
  {"id": "3", "label": "Tops & Blouses", "url": "/shop?category=tops", "type": "internal"},
  {"id": "4", "label": "Accessories", "url": "/shop?category=accessories", "type": "internal"},
  {"id": "5", "label": "Sale", "url": "/shop?filter=sale", "type": "internal"}
]'::jsonb, 'menus'),

-- Footer Help Links
('footer_help_menu', '[
  {"id": "1", "label": "Contact Us", "url": "/contact", "type": "internal"},
  {"id": "2", "label": "Shipping Info", "url": "/shipping", "type": "internal"},
  {"id": "3", "label": "Returns & Exchanges", "url": "/returns", "type": "internal"},
  {"id": "4", "label": "Size Guide", "url": "/size-guide", "type": "internal"},
  {"id": "5", "label": "FAQs", "url": "/faqs", "type": "internal"}
]'::jsonb, 'menus'),

-- Footer About Links
('footer_about_menu', '[
  {"id": "1", "label": "Our Story", "url": "/about", "type": "internal"},
  {"id": "2", "label": "Sustainability", "url": "/sustainability", "type": "internal"},
  {"id": "3", "label": "Privacy Policy", "url": "/privacy", "type": "internal"},
  {"id": "4", "label": "Terms of Service", "url": "/terms", "type": "internal"}
]'::jsonb, 'menus');