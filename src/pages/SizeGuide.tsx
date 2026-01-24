import { Helmet } from 'react-helmet-async';
import Layout from '@/components/layout/Layout';
import { Ruler } from 'lucide-react';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function SizeGuide() {
  const { settings } = useSiteSettings();

  return (
    <Layout>
      <Helmet>
        <title>Size Guide | {settings.store_name}</title>
        <meta name="description" content={`Find your perfect fit with ${settings.store_name}'s comprehensive size guide. Measurements for tops, dresses, and bottoms.`} />
      </Helmet>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-display font-semibold text-center mb-4">
            Size Guide
          </h1>
          <p className="text-muted-foreground text-center mb-12">
            Find your perfect fit with our comprehensive size chart.
          </p>

          <div className="bg-secondary/50 rounded-xl p-6 mb-12">
            <div className="flex items-center gap-3 mb-4">
              <Ruler className="h-6 w-6 text-primary" />
              <h3 className="font-display font-semibold text-lg">How to Measure</h3>
            </div>
            <div className="grid sm:grid-cols-3 gap-6 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Bust</h4>
                <p className="text-muted-foreground">Measure around the fullest part of your bust, keeping the tape horizontal.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Waist</h4>
                <p className="text-muted-foreground">Measure around your natural waistline, the narrowest part of your waist.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Hips</h4>
                <p className="text-muted-foreground">Measure around the fullest part of your hips, about 8" below your waist.</p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="tops" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="tops">Tops & Blouses</TabsTrigger>
              <TabsTrigger value="dresses">Dresses</TabsTrigger>
              <TabsTrigger value="bottoms">Bottoms</TabsTrigger>
            </TabsList>

            <TabsContent value="tops">
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Size</TableHead>
                      <TableHead>Bust (inches)</TableHead>
                      <TableHead>Waist (inches)</TableHead>
                      <TableHead>Length (inches)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">XS</TableCell>
                      <TableCell>32-33</TableCell>
                      <TableCell>24-25</TableCell>
                      <TableCell>23</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">S</TableCell>
                      <TableCell>34-35</TableCell>
                      <TableCell>26-27</TableCell>
                      <TableCell>24</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">M</TableCell>
                      <TableCell>36-37</TableCell>
                      <TableCell>28-29</TableCell>
                      <TableCell>25</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">L</TableCell>
                      <TableCell>38-40</TableCell>
                      <TableCell>30-32</TableCell>
                      <TableCell>26</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">XL</TableCell>
                      <TableCell>41-43</TableCell>
                      <TableCell>33-35</TableCell>
                      <TableCell>27</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="dresses">
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Size</TableHead>
                      <TableHead>Bust (inches)</TableHead>
                      <TableHead>Waist (inches)</TableHead>
                      <TableHead>Hips (inches)</TableHead>
                      <TableHead>Length (inches)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">XS</TableCell>
                      <TableCell>32-33</TableCell>
                      <TableCell>24-25</TableCell>
                      <TableCell>34-35</TableCell>
                      <TableCell>36</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">S</TableCell>
                      <TableCell>34-35</TableCell>
                      <TableCell>26-27</TableCell>
                      <TableCell>36-37</TableCell>
                      <TableCell>37</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">M</TableCell>
                      <TableCell>36-37</TableCell>
                      <TableCell>28-29</TableCell>
                      <TableCell>38-39</TableCell>
                      <TableCell>38</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">L</TableCell>
                      <TableCell>38-40</TableCell>
                      <TableCell>30-32</TableCell>
                      <TableCell>40-42</TableCell>
                      <TableCell>39</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">XL</TableCell>
                      <TableCell>41-43</TableCell>
                      <TableCell>33-35</TableCell>
                      <TableCell>43-45</TableCell>
                      <TableCell>40</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="bottoms">
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold">Size</TableHead>
                      <TableHead>Waist (inches)</TableHead>
                      <TableHead>Hips (inches)</TableHead>
                      <TableHead>Inseam (inches)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">XS / 26</TableCell>
                      <TableCell>24-25</TableCell>
                      <TableCell>34-35</TableCell>
                      <TableCell>30</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">S / 28</TableCell>
                      <TableCell>26-27</TableCell>
                      <TableCell>36-37</TableCell>
                      <TableCell>30</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">M / 30</TableCell>
                      <TableCell>28-29</TableCell>
                      <TableCell>38-39</TableCell>
                      <TableCell>30</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">L / 32</TableCell>
                      <TableCell>30-32</TableCell>
                      <TableCell>40-42</TableCell>
                      <TableCell>31</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">XL / 34</TableCell>
                      <TableCell>33-35</TableCell>
                      <TableCell>43-45</TableCell>
                      <TableCell>31</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-12 text-center text-muted-foreground">
            <p>
              Still unsure about your size? <a href="/contact" className="text-primary hover:underline">Contact us</a> and we'll help you find the perfect fit!
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
